import { AdvancedPaginationDto } from 'src/common/dto';
import {
  Between,
  FindOptionsWhere,
  ILike,
  In,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
} from 'typeorm';

export class ConditionBuilder {
  static build(
    data: Partial<AdvancedPaginationDto> = {},
    defaultField = 'name',
    extraFilter?: FindOptionsWhere<any>,
  ) {
    let conditions: FindOptionsWhere<any> = {
      // status: Not(USER_CONSTANTS.STATUS.REMOVED),
    };
    conditions = this.addStatusCondition(conditions, data.status);
    conditions = this.addIdsCondition(conditions, data.ids);
    conditions = this.addUserCondition(conditions, data.userId);
    conditions = this.addDateConditions(conditions, data);
    conditions = this.addSearchConditions(conditions, data, defaultField);
    if (extraFilter) {
      Object.assign(conditions, extraFilter);
    }
    return conditions;
  }

  private static addStatusCondition(
    conditions: FindOptionsWhere<any>,
    status?: string | string[],
  ): FindOptionsWhere<any> {
    if (!status) return conditions;

    conditions.status = Array.isArray(status) ? In(status) : status;
    return conditions;
  }

  private static addIdsCondition(
    conditions: FindOptionsWhere<any>,
    ids?: string | string[],
  ): FindOptionsWhere<any> {
    if (!ids) return conditions;

    conditions.id = Array.isArray(ids) ? In(ids) : ids;
    return conditions;
  }

  private static addUserCondition(
    conditions: FindOptionsWhere<any>,
    userId?: string,
  ): FindOptionsWhere<any> {
    if (userId) {
      Object.assign(conditions, { userId });
    }
    return conditions;
  }

  private static addDateConditions(
    conditions: FindOptionsWhere<any>,
    data: Partial<AdvancedPaginationDto>,
  ): FindOptionsWhere<any> {
    const dateField = (data.dateFilterField as string) || 'createdAt';

    if (data.fromDate && data.toDate) {
      conditions[dateField] = Between(
        this.createStartOfDay(data.fromDate),
        this.createEndOfDay(data.toDate),
      );
    } else if (data.fromDate) {
      conditions[dateField] = MoreThanOrEqual(
        this.createStartOfDay(data.fromDate),
      );
    } else if (data.toDate) {
      conditions[dateField] = LessThanOrEqual(this.createEndOfDay(data.toDate));
    }
    return conditions;
  }

  private static addSearchConditions(
    conditions: FindOptionsWhere<any>,
    data: Partial<AdvancedPaginationDto>,
    defaultField: string,
  ): FindOptionsWhere<any> {
    if (!data.query) return conditions;

    const searchOperator = data.caseSensitive === 1 ? Like : ILike;
    const searchFields = this.getSearchFields(defaultField, data.fields);

    if (searchFields.length > 1) {
      conditions = searchFields.map((field) => ({
        ...conditions,
        [field]: searchOperator(`%${data.query}%`),
      }));
    } else {
      conditions[searchFields[0]] = searchOperator(`%${data.query}%`);
    }
    return conditions;
  }

  private static createStartOfDay(date: string | Date): Date {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  private static createEndOfDay(date: string | Date): Date {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  }

  private static getSearchFields(
    defaultField: string,
    fields?: string | string[],
  ): string[] {
    if (!fields) return [defaultField];
    return Array.isArray(fields) ? fields : [fields];
  }
}
