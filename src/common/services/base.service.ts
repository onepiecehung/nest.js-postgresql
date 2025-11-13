import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { BaseRepository } from 'src/common/repositories/base.repository';
import {
  decodeSignedCursor,
  encodeSignedCursor,
  mapTypeOrmError,
  normalizeSearchInput,
  notFound,
  sha256Hex,
  stableStringify,
} from 'src/common/utils';
import { ConditionBuilder, PaginationFormatter } from 'src/shared/helpers';
import { CacheOptions, CacheService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  LessThan,
  MoreThan,
  QueryRunner,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { BadRequestException, Injectable, Optional } from '@nestjs/common';

export type QOpts<T> = {
  relations?: string[] | FindOptionsRelations<T>;
  select?: FindOptionsSelect<T>;
  withDeleted?: boolean;
};

export type TxCtx = { queryRunner?: QueryRunner };

@Injectable()
export abstract class BaseService<T extends { id: string }> {
  protected readonly idKey: keyof T;
  protected readonly softDeleteEnabled: boolean;
  protected readonly defaultSearchField: string;
  protected readonly cache?: CacheOptions & { prefix: string };
  protected readonly entityName: string;

  constructor(
    protected readonly repo: BaseRepository<T>,
    protected readonly opts: {
      entityName: string;
      idKey?: string;
      softDelete?: boolean;
      relationsWhitelist?: FindOptionsRelations<T>;
      selectWhitelist?: FindOptionsSelect<T>;
      cache?: CacheOptions & { prefix?: string };
      emitEvents?: boolean;
      defaultSearchField?: string;
    },
    @Optional() protected readonly cacheService?: CacheService,
    @Optional()
    protected readonly eventEmitter?: {
      emit?: (event: string, payload: unknown) => unknown;
    },
  ) {
    this.entityName = opts.entityName;
    this.idKey = (opts.idKey || 'id') as keyof T;
    this.softDeleteEnabled =
      typeof opts.softDelete === 'boolean'
        ? opts.softDelete
        : repo.supportsSoftDelete();
    this.defaultSearchField = opts.defaultSearchField || 'name';
    if (opts.cache?.enabled) {
      const prefix = opts.cache.prefix || opts.entityName;
      this.cache = { ...opts.cache, prefix } as CacheOptions & {
        prefix: string;
      };
    }
  }

  /**
   * Get searchable columns for text search functionality
   * Override this method in child services to define which fields can be searched
   * @returns Array of column names that can be searched
   * @example
   * // In UserService:
   * protected getSearchableColumns(): (keyof User)[] {
   *   return ['name', 'email', 'username'];
   * }
   */
  protected getSearchableColumns(): (keyof T)[] {
    // Return default search field if no specific searchable columns are defined
    return [this.defaultSearchField as keyof T];
  }

  protected async beforeCreate(data: DeepPartial<T>): Promise<DeepPartial<T>> {
    return data;
  }

  protected async afterCreate(_entity: T): Promise<void> {
    return;
  }

  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<T>,
  ): Promise<void> {
    return;
  }

  protected async afterUpdate(_entity: T): Promise<void> {
    return;
  }

  protected async beforeDelete(_id: string): Promise<void> {
    return;
  }

  protected async afterDelete(_id: string): Promise<void> {
    return;
  }

  protected async onListQueryBuilt(_ctx: {
    where: unknown;
    order: unknown;
    dto: AdvancedPaginationDto | CursorPaginationDto;
  }): Promise<void> {
    return;
  }

  async create(data: DeepPartial<T>, ctx?: TxCtx): Promise<T> {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Invalid data provided for creation');
    }

    try {
      const prepared = await this.beforeCreate(data);
      const entity = this.repo.create(prepared);
      const saved = await this.repo.save(entity, ctx);
      await this.afterCreate(saved);
      await this.invalidateCacheForEntity(saved.id);
      this.emitEvent(`${this.entityName}.created`, { after: saved });
      return saved;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Create multiple entities in batch
   * @param data Array of data objects to create entities from
   * @param ctx Transaction context
   * @returns Array of created entities
   */
  async createMany(data: DeepPartial<T>[], ctx?: TxCtx): Promise<T[]> {
    try {
      const preparedData: DeepPartial<T>[] = [];

      // Prepare all data using beforeCreate hook
      for (const item of data) {
        const prepared = await this.beforeCreate(item);
        preparedData.push(prepared);
      }

      // Create entities one by one since repo.create expects single entity
      const entities: T[] = [];
      for (const item of preparedData) {
        const entity = this.repo.create(item);
        entities.push(entity);
      }

      const saved = await this.repo.saveMany(entities, ctx);

      // Execute afterCreate hook for each entity
      for (const entity of saved) {
        await this.afterCreate(entity);
        await this.invalidateCacheForEntity(entity.id);
        this.emitEvent(`${this.entityName}.created`, { after: entity });
      }

      return saved;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async findById(id: string, opts?: QOpts<T>, _ctx?: TxCtx): Promise<T> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid ID provided');
    }

    const safe = this.applyQueryOpts(opts);
    const cacheKey = this.cache ? `${this.cache.prefix}:id:${id}` : undefined;
    if (cacheKey) {
      const cached = (await this.cacheService?.get(cacheKey)) as T | null;
      if (cached) return cached;
    }
    const found = await this.repo.findById(id, safe);
    if (!found) notFound(this.entityName, id);
    if (cacheKey && found && this.cache) {
      await this.cacheService?.set(cacheKey, found, this.cache.ttlSec);
    }
    return found;
  }

  async findOne(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    opts?: QOpts<T>,
    _ctx?: TxCtx,
  ): Promise<T | null> {
    const safe = this.applyQueryOpts(opts);
    return await this.repo.findOne(where, safe);
  }

  async listOffset(
    pagination: AdvancedPaginationDto,
    extraFilter?: Record<string, unknown>,
    opts?: QOpts<T>,
    _ctx?: TxCtx,
  ): Promise<IPagination<T>> {
    const { page, limit, sortBy, order, ...rest } = pagination;
    if (rest.query) rest.query = normalizeSearchInput(rest.query);

    // Validate and prepare search fields
    const searchFields = this.validateAndPrepareSearchFields(rest.fields);

    const where = ConditionBuilder.build(
      {
        ...rest,
        // Pass validated search fields to ConditionBuilder
        fields: searchFields,
      },
      this.defaultSearchField,
      extraFilter,
    );
    const safe = this.applyQueryOpts(opts);
    const orderObj = this.buildOrderObject(sortBy, order);
    await this.onListQueryBuilt({ where, order: orderObj, dto: pagination });

    // Try to get from cache first
    const cacheKey = this.buildCacheKey('list', {
      where,
      page,
      limit,
      sortBy,
      order,
      select: safe.select,
      relations: safe.relations,
    });

    if (cacheKey) {
      const cached = await this.getCachedResult<IPagination<T>>(cacheKey);
      if (cached) {
        // Background refresh if within SWR window
        this.refreshCacheInBackground(cacheKey, () =>
          this.fetchAndFormatOffsetData(where, orderObj, safe, page, limit),
        );
        return cached;
      }
    }

    // Fetch fresh data
    const envelope = await this.fetchAndFormatOffsetData(
      where,
      orderObj,
      safe,
      page,
      limit,
    );

    // Cache the result
    if (cacheKey && this.cache) {
      await this.cacheService?.set(cacheKey, envelope, this.cache.ttlSec);
    }

    return envelope;
  }

  async listCursor(
    pagination: CursorPaginationDto & Partial<AdvancedPaginationDto>,
    extraFilter?: Record<string, unknown>,
    opts?: QOpts<T>,
    _ctx?: TxCtx,
  ): Promise<IPaginationCursor<T>> {
    const {
      limit,
      sortBy = 'createdAt',
      order = 'DESC',
      cursor,
      ...rest
    } = pagination;
    const restAdv: Partial<AdvancedPaginationDto> =
      rest as Partial<AdvancedPaginationDto>;
    if (typeof restAdv.query === 'string') {
      restAdv.query = normalizeSearchInput(restAdv.query);
    }

    // Validate and prepare search fields
    const searchFields = this.validateAndPrepareSearchFields(restAdv.fields);

    const baseFilter: Record<string, unknown> = {
      ...restAdv,
      // Pass validated search fields to ConditionBuilder
      fields: searchFields,
    };
    const where = ConditionBuilder.build(
      baseFilter,
      this.defaultSearchField,
      extraFilter,
    );
    const safe = this.applyQueryOpts(opts);
    const token = decodeSignedCursor(cursor);
    const take = limit;

    // Apply cursor boundary: (sortBy, id) tuple for stable ordering
    const boundary = token?.value;
    const direction: 'ASC' | 'DESC' = token?.order || order;

    const orderObj: FindOptionsOrder<T> = {};
    (orderObj as Record<string, 'ASC' | 'DESC'>)[sortBy] = direction;
    (orderObj as Record<string, 'ASC' | 'DESC'>)[String(this.idKey)] =
      direction;
    await this.onListQueryBuilt({ where, order: orderObj, dto: pagination });

    const whereToUse: FindOptionsWhere<T> | FindOptionsWhere<T>[] =
      this.buildCursorBoundaryWhere(
        where as FindOptionsWhere<T>,
        sortBy,
        String(this.idKey),
        direction,
        boundary,
      );

    const [data] = await this.repo.findAndCount({
      where: whereToUse,
      order: orderObj,
      take,
      relations: safe.relations,
      select: safe.select,
      withDeleted: safe.withDeleted,
    });

    const last = data.length > 0 ? data[data.length - 1] : undefined;
    const lastRecord = last;
    const nextCursor = lastRecord
      ? encodeSignedCursor({
          key: sortBy,
          order: direction,
          value: {
            [sortBy]: lastRecord?.[sortBy] as unknown,
            [String(this.idKey)]: lastRecord?.[String(this.idKey)] as unknown,
          },
        })
      : null;

    return {
      result: data,
      metaData: {
        nextCursor,
        prevCursor: undefined,
        take,
        sortBy,
        order: direction,
      },
    };
  }

  private buildCursorBoundaryWhere(
    where: FindOptionsWhere<T>,
    sortBy: string,
    idKey: string,
    direction: 'ASC' | 'DESC',
    boundary?: Record<string, unknown>,
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (
      !boundary ||
      !Object.hasOwn(boundary, sortBy) ||
      !Object.hasOwn(boundary, idKey)
    ) {
      return where;
    }

    const primaryVal = boundary[sortBy];
    const idVal = boundary[idKey];
    const cmp = (dir: 'ASC' | 'DESC', val: unknown) =>
      dir === 'ASC' ? MoreThan(val) : LessThan(val);

    const orConditions: Record<string, unknown>[] = [
      {
        ...where,
        [sortBy]: cmp(direction, primaryVal),
      },
      {
        ...where,
        [sortBy]: primaryVal,
        [idKey]: cmp(direction, idVal),
      },
    ];

    return orConditions as unknown as FindOptionsWhere<T>[];
  }

  async update(id: string, patch: DeepPartial<T>, ctx?: TxCtx): Promise<T> {
    try {
      await this.beforeUpdate(id, patch);
      await this.repo.updateById(id, patch as QueryDeepPartialEntity<T>, ctx);
      const updated = await this.repo.findById(id);
      if (!updated) notFound(this.entityName, id);
      await this.afterUpdate(updated);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.updated`, { after: updated });
      return updated;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Update multiple entities in batch
   * @param updates Array of objects containing id and patch data
   * @param ctx Transaction context
   * @returns Array of updated entities
   */
  async updateMany(
    updates: Array<{ id: string; patch: DeepPartial<T> }>,
    ctx?: TxCtx,
  ): Promise<T[]> {
    try {
      const updatedEntities: T[] = [];

      // Execute beforeUpdate hook for each update
      for (const { id, patch } of updates) {
        await this.beforeUpdate(id, patch);
      }

      // Perform all updates
      for (const { id, patch } of updates) {
        await this.repo.updateById(id, patch as QueryDeepPartialEntity<T>, ctx);
      }

      // Fetch updated entities and execute afterUpdate hooks
      for (const { id } of updates) {
        const updated = await this.repo.findById(id);
        if (!updated) notFound(this.entityName, id);
        await this.afterUpdate(updated);
        await this.invalidateCacheForEntity(id);
        this.emitEvent(`${this.entityName}.updated`, { after: updated });
        updatedEntities.push(updated);
      }

      return updatedEntities;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async remove(id: string, ctx?: TxCtx): Promise<void> {
    try {
      await this.beforeDelete(id);
      await this.repo.deleteById(id, ctx);
      await this.afterDelete(id);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Remove multiple entities in batch
   * @param ids Array of entity IDs to remove
   * @param ctx Transaction context
   */
  async removeMany(ids: string[], ctx?: TxCtx): Promise<void> {
    try {
      // Execute beforeDelete hook for each entity
      for (const id of ids) {
        await this.beforeDelete(id);
      }

      // Perform all deletions
      for (const id of ids) {
        await this.repo.deleteById(id, ctx);
      }

      // Execute afterDelete hook and cache invalidation for each entity
      for (const id of ids) {
        await this.afterDelete(id);
        await this.invalidateCacheForEntity(id);
        this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
      }
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async softDelete(id: string, ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      await this.beforeDelete(id);
      await this.repo.softDeleteById(id, ctx);
      await this.afterDelete(id);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Soft delete multiple entities in batch
   * @param ids Array of entity IDs to soft delete
   * @param ctx Transaction context
   */
  async softDeleteMany(ids: string[], ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      // Execute beforeDelete hook for each entity
      for (const id of ids) {
        await this.beforeDelete(id);
      }

      // Perform all soft deletions
      for (const id of ids) {
        await this.repo.softDeleteById(id, ctx);
      }

      // Execute afterDelete hook and cache invalidation for each entity
      for (const id of ids) {
        await this.afterDelete(id);
        await this.invalidateCacheForEntity(id);
        this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
      }
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async restore(id: string, ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      await this.repo.restoreById(id, ctx);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.restored`, { after: { id } });
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async runInTransaction<R>(fn: (qr: QueryRunner) => Promise<R>): Promise<R> {
    return this.repo.withTransaction<R>(fn);
  }

  protected applyQueryOpts(opts?: QOpts<T>): QOpts<T> {
    const relations = this.filterRelationsByWhitelist(
      opts?.relations,
      this.opts.relationsWhitelist,
    );
    let select = opts?.select;

    // Apply selectWhitelist security filtering
    if (this.opts.selectWhitelist) {
      if (select) {
        // If select is provided, filter it against whitelist
        select = this.filterSelectByWhitelist(
          select,
          this.opts.selectWhitelist,
        );
      } else {
        // If no select is provided but whitelist exists, use whitelist as default select
        // This prevents exposing sensitive data when no specific fields are requested
        select = this.opts.selectWhitelist;
      }
    }

    const withDeleted = opts?.withDeleted ?? false;
    return {
      relations: relations || undefined,
      select,
      withDeleted,
    };
  }

  /**
   * Filter relations based on the whitelist
   * @param relations The relations to filter
   * @param whitelist The allowed relations
   * @returns Filtered relations
   */
  private filterRelationsByWhitelist(
    relations?: string[] | FindOptionsRelations<T>,
    whitelist?: FindOptionsRelations<T>,
  ): string[] | FindOptionsRelations<T> | undefined {
    if (!relations) return undefined;
    if (!whitelist) return relations;

    // Handle string array relations
    if (Array.isArray(relations)) {
      const whitelistKeys = this.extractRelationKeys(whitelist);
      return relations.filter((rel) => whitelistKeys.includes(rel));
    }

    // Handle FindOptionsRelations object
    if (typeof relations === 'object' && relations !== null) {
      return this.filterRelationsObject(relations, whitelist);
    }

    return relations;
  }

  /**
   * Extract relation keys from FindOptionsRelations object
   * @param relations The relations object
   * @returns Array of relation keys
   */
  private extractRelationKeys(relations: FindOptionsRelations<T>): string[] {
    const keys: string[] = [];

    for (const key in relations) {
      if (Object.hasOwn(relations, key)) {
        keys.push(key);
        const nested = relations[key];
        if (typeof nested === 'object' && nested !== null) {
          // Recursively extract nested relation keys
          const nestedKeys = this.extractRelationKeys(
            nested as FindOptionsRelations<any>,
          );
          keys.push(...nestedKeys.map((nestedKey) => `${key}.${nestedKey}`));
        }
      }
    }

    return keys;
  }

  /**
   * Filter relations object based on whitelist
   * @param relations The relations to filter
   * @param whitelist The allowed relations
   * @returns Filtered relations object
   */
  private filterRelationsObject(
    relations: FindOptionsRelations<T>,
    whitelist: FindOptionsRelations<T>,
  ): FindOptionsRelations<T> {
    const filtered: FindOptionsRelations<T> = {};

    for (const key in relations) {
      if (Object.hasOwn(relations, key) && key in whitelist) {
        const relationValue = relations[key];
        const whitelistValue = whitelist[key];

        if (this.isNestedRelation(relationValue, whitelistValue)) {
          this.handleNestedRelation(
            filtered,
            key,
            relationValue,
            whitelistValue,
          );
        } else if (this.isBooleanRelation(relationValue)) {
          this.handleBooleanRelation(filtered, key, relationValue);
        }
      }
    }

    return filtered;
  }

  /**
   * Check if the relation value is a nested relation object
   */
  private isNestedRelation(
    relationValue: unknown,
    whitelistValue: unknown,
  ): boolean {
    return (
      typeof relationValue === 'object' &&
      relationValue !== null &&
      typeof whitelistValue === 'object' &&
      whitelistValue !== null &&
      !Array.isArray(relationValue) &&
      !Array.isArray(whitelistValue)
    );
  }

  /**
   * Check if the relation value is a boolean true
   */
  private isBooleanRelation(relationValue: unknown): boolean {
    return typeof relationValue === 'boolean' && relationValue;
  }

  /**
   * Handle nested relation filtering
   */
  private handleNestedRelation(
    filtered: FindOptionsRelations<T>,
    key: string,
    relationValue: unknown,
    whitelistValue: unknown,
  ): void {
    const nestedFiltered = this.filterRelationsObject(
      relationValue as FindOptionsRelations<any>,
      whitelistValue as FindOptionsRelations<any>,
    );
    if (Object.keys(nestedFiltered).length > 0) {
      (filtered as Record<string, unknown>)[key] = nestedFiltered;
    }
  }

  /**
   * Handle boolean relation filtering
   */
  private handleBooleanRelation(
    filtered: FindOptionsRelations<T>,
    key: string,
    relationValue: unknown,
  ): void {
    (filtered as Record<string, unknown>)[key] = relationValue;
  }

  /**
   * Filter select options based on the whitelist
   * @param select The select options to filter
   * @param whitelist The allowed select fields
   * @returns Filtered select options
   */
  private filterSelectByWhitelist(
    select: FindOptionsSelect<T>,
    whitelist: FindOptionsSelect<T>,
  ): FindOptionsSelect<T> {
    const filtered: FindOptionsSelect<T> = {};

    for (const key in select) {
      if (Object.hasOwn(select, key) && key in whitelist) {
        const selectValue = select[key];
        const whitelistValue = whitelist[key];

        if (this.isNestedSelect(selectValue, whitelistValue)) {
          this.handleNestedSelect(filtered, key, selectValue, whitelistValue);
        } else if (this.isBooleanSelect(selectValue)) {
          this.handleBooleanSelect(filtered, key, selectValue);
        }
      }
    }

    return filtered;
  }

  /**
   * Check if the select value is a nested select object
   */
  private isNestedSelect(
    selectValue: unknown,
    whitelistValue: unknown,
  ): boolean {
    return (
      typeof selectValue === 'object' &&
      selectValue !== null &&
      typeof whitelistValue === 'object' &&
      whitelistValue !== null &&
      !Array.isArray(selectValue) &&
      !Array.isArray(whitelistValue)
    );
  }

  /**
   * Check if the select value is a boolean true
   */
  private isBooleanSelect(selectValue: unknown): boolean {
    return typeof selectValue === 'boolean' && selectValue;
  }

  /**
   * Handle nested select filtering
   */
  private handleNestedSelect(
    filtered: FindOptionsSelect<T>,
    key: string,
    selectValue: unknown,
    whitelistValue: unknown,
  ): void {
    const nestedFiltered = this.filterSelectByWhitelist(
      selectValue as FindOptionsSelect<any>,
      whitelistValue as FindOptionsSelect<any>,
    );
    if (Object.keys(nestedFiltered).length > 0) {
      (filtered as Record<string, unknown>)[key] = nestedFiltered;
    }
  }

  /**
   * Handle boolean select filtering
   */
  private handleBooleanSelect(
    filtered: FindOptionsSelect<T>,
    key: string,
    selectValue: unknown,
  ): void {
    (filtered as Record<string, unknown>)[key] = selectValue;
  }

  /**
   * Create a select object from an array of field names
   * @param fields Array of field names to select
   * @returns FindOptionsSelect object
   */
  protected createSelectFromFields(fields: (keyof T)[]): FindOptionsSelect<T> {
    const select: FindOptionsSelect<T> = {};
    for (const field of fields) {
      (select as Record<string, unknown>)[field as string] = true;
    }
    return select;
  }

  /**
   * Check if a field is allowed in select based on whitelist
   * @param field The field to check
   * @returns True if field is allowed
   */
  protected isFieldAllowedInSelect(field: keyof T): boolean {
    if (!this.opts.selectWhitelist) return true;
    return field in this.opts.selectWhitelist;
  }

  /**
   * Get all allowed select fields from whitelist
   * @returns Array of allowed field names
   */
  protected getAllowedSelectFields(): (keyof T)[] {
    if (!this.opts.selectWhitelist) return [];
    return Object.keys(this.opts.selectWhitelist) as (keyof T)[];
  }

  /**
   * Check if a relation is allowed based on whitelist
   * @param relation The relation to check
   * @returns True if relation is allowed
   */
  protected isRelationAllowed(relation: string): boolean {
    if (!this.opts.relationsWhitelist) return true;
    const allowedKeys = this.extractRelationKeys(this.opts.relationsWhitelist);
    return allowedKeys.includes(relation);
  }

  /**
   * Get all allowed relations from whitelist
   * @returns Array of allowed relation names
   */
  protected getAllowedRelations(): string[] {
    if (!this.opts.relationsWhitelist) return [];
    return this.extractRelationKeys(this.opts.relationsWhitelist);
  }

  /**
   * Validate and prepare search fields based on user input and searchable columns
   * @param userFields Fields provided by user (can be string, string[], or undefined)
   * @returns Array of validated search fields
   * @throws BadRequestException if user provides invalid fields
   *
   * @example
   * // With UsersService (only 'name' is searchable):
   * validateAndPrepareSearchFields() // Returns ['name']
   * validateAndPrepareSearchFields('name') // Returns ['name']
   * validateAndPrepareSearchFields(['name', 'email']) // Throws BadRequestException
   * validateAndPrepareSearchFields('username') // Throws BadRequestException
   */
  protected validateAndPrepareSearchFields(
    userFields?: string | string[],
  ): string[] {
    const searchableColumns = this.getSearchableColumns();
    const allowedFields = searchableColumns.map((col) => String(col));

    // If no user fields provided, use all allowed fields
    if (!userFields) {
      return allowedFields;
    }

    const userFieldsArray = Array.isArray(userFields)
      ? userFields
      : [userFields];

    // Check if all user fields are allowed
    const invalidFields = userFieldsArray.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Invalid search fields: ${invalidFields.join(', ')}. ` +
          `Allowed fields: ${allowedFields.join(', ')}`,
      );
    }

    return userFieldsArray;
  }

  /**
   * Build order object for TypeORM queries
   */
  protected buildOrderObject(
    sortBy: string,
    order: 'ASC' | 'DESC',
  ): FindOptionsOrder<T> {
    const orderObj: FindOptionsOrder<T> = {};
    (orderObj as Record<string, 'ASC' | 'DESC'>)[sortBy] = order;
    (orderObj as Record<string, 'ASC' | 'DESC'>)[String(this.idKey)] = order;
    return orderObj;
  }

  /**
   * Build cache key for different operations
   */
  protected buildCacheKey(
    operation: string,
    data: Record<string, unknown>,
  ): string | undefined {
    if (!this.cache) return undefined;
    return `${this.cache.prefix}:${operation}:${sha256Hex(stableStringify(data))}`;
  }

  /**
   * Get cached result with type safety
   */
  protected async getCachedResult<R>(cacheKey: string): Promise<R | null> {
    if (!this.cacheService) return null;
    return (await this.cacheService.get(cacheKey)) as R | null;
  }

  /**
   * Refresh cache in background using SWR pattern
   */
  protected refreshCacheInBackground<R>(
    cacheKey: string,
    fetchFn: () => Promise<R>,
  ): void {
    if (!this.cache?.swrSec || !this.cacheService) return;

    void (async () => {
      try {
        const ttl = await this.cacheService?.getTtl(cacheKey);
        if (ttl && ttl >= 0 && ttl <= (this.cache?.swrSec ?? 0)) {
          const freshData = await fetchFn();
          await this.cacheService?.set(
            cacheKey,
            freshData,
            this.cache?.ttlSec ?? 0,
          );
        }
      } catch (error) {
        // Ignore background refresh errors to avoid impacting main flow
        console.warn('Background cache refresh failed:', error);
      }
    })();
  }

  /**
   * Fetch and format offset pagination data
   */
  protected async fetchAndFormatOffsetData(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    orderObj: FindOptionsOrder<T>,
    safe: QOpts<T>,
    page: number,
    limit: number,
  ): Promise<IPagination<T>> {
    const [data, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: orderObj,
      where,
      relations: safe.relations,
      select: safe.select,
      withDeleted: safe.withDeleted,
    });

    return PaginationFormatter.offset<T>(data, total, page, limit);
  }

  protected async invalidateCacheForEntity(id: string): Promise<void> {
    if (!this.cache) return;
    await this.cacheService?.delete(`${this.cache.prefix}:id:${id}`);
    await this.cacheService?.deleteKeysByPattern(`${this.cache.prefix}:list:*`);
  }

  protected emitEvent(event: string, payload: unknown): void {
    if (!this.opts.emitEvents) return;
    try {
      this.eventEmitter?.emit?.(event, payload);
    } catch {
      // Ignore emitter errors to avoid impacting main flow
    }
  }
}
