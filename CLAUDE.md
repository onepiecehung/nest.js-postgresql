---
alwaysApply: true
---
# Cursor Rules — nest.js-postgresql (blog branch)

> These rules are loaded as global, persistent context for AI coding assistants.  
> **Do NOT auto-generate files or run migrations. Use Yarn only.**  
> Develop strictly within the repository’s established architecture and conventions.

---

## 0) General Principles

- Develop **within existing domain modules** (`analytics`, `articles`, `auth`, `bookmarks`, `comments`, `follow`, `media`, `notifications`, `organizations`, `permissions`, `qr`, `rate-limit`, `reactions`, `reports`, `share`, `stickers`, `tags`, `users`, `workers`, etc.).
- Keep **controllers thin**: validation + routing only; delegate **all** business logic to services.
- **Never** use auto-scaffolding or generators (no `nest g`, no codegen).  
  ➜ **Only create/update entities, services, repositories, controllers, and DTOs manually**. No migration commands, no CLI runs.
- **Use Yarn exclusively** for package management. Do **not** use npm/pnpm.
  - Allowed: `yarn add`, `yarn remove`, `yarn install`, `yarn upgrade`.
- Follow patterns and naming already established in `src/`, `src/shared/`, `src/common/`.
- Before modifying shared core (e.g., `/docs`, `BaseService`, cache, rate-limit), **read the relevant docs** and replicate existing patterns.

---

## 1) Entities & Identifiers

### 1.1 Base Entity

All entities **must extend** `BaseEntityCustom` from `src/shared/entities/base.entity.ts`, which provides:

- **Snowflake ID**: `id` (bigint) generated via `@BeforeInsert()`.
- **UUID**: `uuid` auto-generated for external references.
- **Timestamps**: `createdAt`, `updatedAt`, `deletedAt` (microsecond precision).
- **Soft delete** via `deletedAt`.
- **Optimistic locking** via `version`.
- Helper methods: `toJSON()`, `isDeleted()`, `getAge()`, `getTimeSinceUpdate()`.

### 1.2 Naming Conventions

- **Tables**: plural `snake_case` (e.g., `users`, `articles`, `qr_tickets`).
- **Columns**: `snake_case` (e.g., `user_id`, `created_at`).
- **Booleans**: prefix with `is_`, `has_`, `can_` (e.g., `is_active`).
- **Datetime fields**: suffix with `_at` (e.g., `published_at`).
- **Foreign keys**: `<parent_table>_id` (e.g., `user_id`, `article_id`).
- Follow the complete guide in `docs/DATABASE_NAMING_CONVENTIONS.md`.

### 1.3 Entity Structure (template)

```ts
import { Entity, Column, Index, ManyToOne, JoinColumn, VersionColumn } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { CONSTANTS, StatusType } from 'src/common/constants';

@Entity('table_name')
@Index(['field1', 'field2']) // composite index example
export class EntityName extends BaseEntityCustom {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: CONSTANTS.STATUS, default: CONSTANTS.STATUS.ACTIVE })
  status: StatusType;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user?: User;

  @VersionColumn()
  version: number;
}
````

### 1.4 Migration Policy

* **Do NOT** generate or run migrations automatically.

  * Never run `yarn migration:generate` or `yarn migration:run`.
  * Never run `typeorm migration:generate` or `typeorm migration:run`.
  * Never use `synchronize: true` in TypeORM config.
* **Only create/modify entity classes manually**; schema migrations are handled separately by maintainers.
* Avoid destructive changes (dropping columns/tables) unless explicitly requested.

---

## 2) Repositories & Services

### 2.1 Repository Pattern

* Prefer `TypeOrmBaseRepository<T>` from `src/common/repositories/typeorm.base-repo.ts` (implements `BaseRepository<T>`).
* Typical API includes: `create`, `save`, `saveMany`, `findById`, `findOne`, `findAndCount`,
  `updateById`, `deleteById`, `softDeleteById`, `restoreById`, `withTransaction`.
* Repositories wrap TypeORM’s `Repository<T>` and provide transaction helpers.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { Article } from './entities/article.entity';

@Injectable()
export class ArticleRepository extends TypeOrmBaseRepository<Article> {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {
    super(articleRepo);
  }
}
```

### 2.2 Service Pattern

* Services **extend `BaseService<T>`** from `src/common/services/base.service.ts`.
* BaseService provides:

  * **CRUD**: `create`, `createMany`, `update`, `updateMany`, `remove`, `removeMany`, `softDelete`, `softDeleteMany`, `restore`.
  * **Queries**: `findById`, `findOne`, `listOffset`, `listCursor`.
  * **Caching**: Redis cache with SWR (Stale-While-Revalidate).
  * **Pagination**: offset + cursor.
  * **Security**: relations/select whitelists.
  * **Events**: domain event emission.
  * **Lifecycle hooks**: `before/after Create/Update/Delete`.
  * **Transactions**: `runInTransaction`.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { Article } from './entities/article.entity';

@Injectable()
export class ArticleService extends BaseService<Article> {
  constructor(
    @InjectRepository(Article) repo: Repository<Article>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Article>(repo),
      {
        entityName: 'Article',
        cache: { enabled: true, ttlSec: 60, prefix: 'articles', swrSec: 30 },
        defaultSearchField: 'title',
        relationsWhitelist: {
          user: { avatar: true },
          coverImage: true,
        },
        selectWhitelist: {
          id: true,
          title: true,
          content: true,
          user: { id: true, username: true },
        },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof Article)[] {
    return ['title', 'summary', 'content'];
  }

  protected async beforeCreate(data: DeepPartial<Article>): Promise<DeepPartial<Article>> {
    return data; // normalize/validate here
  }

  protected async afterCreate(entity: Article): Promise<void> {
    // e.g., send notifications, update counters
  }
}
```

### 2.3 Lifecycle Hooks (override as needed)

* `beforeCreate(data)`, `afterCreate(entity)`
* `beforeUpdate(id, patch)`, `afterUpdate(entity)`
* `beforeDelete(id)`, `afterDelete(id)`
* `onListQueryBuilt(ctx)` (to adjust dynamic list queries)

### 2.4 Batch Operations

BaseService provides batch operations for better performance:

* `createMany(data[])` - Create multiple entities in batch
* `updateMany(updates[])` - Update multiple entities in batch  
* `removeMany(ids[])` - Remove multiple entities in batch
* `softDeleteMany(ids[])` - Soft delete multiple entities in batch

---

## 3) Query Building & Filtering

### 3.1 ConditionBuilder

* Use `ConditionBuilder` from `src/shared/helpers/condition-builder.ts`.
* Build `FindOptionsWhere`/QueryBuilder conditions safely (no string concatenation).
* Supports: status filters, id/user filters, date ranges, `ILIKE` search, etc.

```ts
import { ConditionBuilder } from 'src/shared/helpers';

const where = ConditionBuilder.build(
  {
    status: 'published',
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    query: 'search term',
    fields: ['title', 'content'],
    caseSensitive: 0, // use ILIKE
  },
  'title',              // default search field
  { visibility: 'public' }, // extra filters
);
```

### 3.2 Search Field Validation

* Define whitelisted searchable columns via `getSearchableColumns()` in your service.
* BaseService validates requested fields and throws `BadRequestException` if invalid.

---

## 4) Pagination

### 4.1 Offset-Based

* Use `listOffset()` (inherited from BaseService).
* Response formatted via `PaginationFormatter.offset()`.

```ts
const result = await this.listOffset(
  { page: 1, limit: 10, sortBy: 'createdAt', order: 'DESC', query: 'term', fields: ['title'] },
  { status: 'published' },
  { relations: ['user'], select: { id: true, title: true } },
);
// => { result, metaData: { currentPage, pageSize, totalRecords, totalPages } }
```

### 4.2 Cursor-Based

* Use `listCursor()` (inherited).
* **Use signed cursors** (`encodeSignedCursor`, `decodeSignedCursor`) from `src/common/utils/cursor.util.ts`.

```ts
const result = await this.listCursor({ limit: 20, cursor: 'signed_cursor', sortBy: 'createdAt', order: 'DESC' });
// => { result, metaData: { nextCursor, prevCursor, take, sortBy, order } }
```

### 4.3 Cursor Utils

* Do **not** roll your own cursor encoding.
* Prefer **HMAC-signed** cursors for tamper protection.

---

## 5) Caching

### 5.1 CacheService (Redis)

Located at `src/shared/services/cache/cache.service.ts`, with:

* Primitives: `get`, `set`, `delete`, `exists`.
* Patterns: `deleteKeysByPattern`, `findKeysByPattern`, `countKeysByPattern`.
* Locks: `setLock`, `releaseLock`.
* Atomics: `atomicIncrementWithLimit`, `compareAndSwap`, `atomicMultiOperation`.
* Helpers: `remember`, `getOrSetWithPrefix`.

### 5.2 Key Naming

* Prefix per entity: `<entity>:<operation>:<identifier>`.

  * `articles:id:123`, `articles:list:<hash(filters)>`, `users:profile:456`.
* BaseService uses `sha256Hex()` + `stableStringify()` + `normalizeSearchInput()` for stable keys.

### 5.3 Invalidation

* BaseService invalidates on create/update/delete.
* Clear both **id-based** and **list-based** keys using pattern deletion.

### 5.4 SWR

* Configure `swrSec` in BaseService options to return stale data quickly and refresh in background.

---

## 6) Security & Validation

### 6.1 DTO Validation

* Use `class-validator` + `class-transformer` for **all** DTOs.
* Validate at controller layer.
* Use `SnowflakeIdPipe` for id parameters: `src/common/pipes/snowflake-id.pipe.ts`.

```ts
@Get(':id')
async get(@Param('id', SnowflakeIdPipe) id: string) {
  return this.svc.findById(id);
}
```

### 6.2 Relations / Select Whitelists

* Configure in BaseService options to prevent over-fetching and leaking sensitive data.
* Supports nested structures.

```ts
relationsWhitelist: { user: { avatar: true }, tags: true, comments: { user: true } }
selectWhitelist: { id: true, title: true, user: { id: true, username: true } }
```

### 6.3 Error Handling

* Throw structured HTTP errors (`messageKey`, optional `suggestion`).
* Integrate with i18n keys in `src/i18n/`.
* **Never** leak internal stack/details to clients.
* Use `I18nHttpExceptionFilter` for HTTP errors and `I18nWsExceptionFilter` for WebSocket errors.

---

## 7) Authentication, Authorization & Rate Limiting

* Protect routes with `@Auth()` from `src/common/decorators/auth.decorator.ts`.
* Use guards (e.g., `JwtAccessTokenGuard`, `RolesGuard`, `PermissionsGuard`, `WebSocketAuthGuard`) as per module needs.
* Rate-limit via the unified guard/decorators (plan-based + policy-based).
* Permission-based access control with `@RequirePermissions()` decorator.
* WebSocket authentication support with `WebSocketAuthGuard`.
  See `docs/HYBRID_RATE_LIMITING_IMPLEMENTATION.md`.

---

## 8) Controller Design

* Responsibilities: **validate input**, **route to service**, **format response**.
* **No business logic** in controllers.
* For list endpoints, return `{ data, metaData | pageInfo }` consistently (offset or cursor format).

```ts
@Controller('articles')
export class ArticlesController {
  constructor(private readonly svc: ArticleService) {}

  @Get()
  async list(@Query() q: GetArticleDto) {
    return this.svc.listOffset(q);
  }

  @Post()
  @Auth()
  async create(@Body() dto: CreateArticleDto) {
    return this.svc.create(dto);
  }
}
```

---

## 9) Infrastructure & Configuration

* **Framework**: NestJS 11.x / TS 5.x
* **DB**: PostgreSQL / TypeORM 0.3.x
* **Cache**: Redis (ioredis)
* **MQ**: RabbitMQ (optional)
* **Auth**: JWT (+ optional Firebase)
* **ID**: Snowflake via `globalSnowflake.nextId()`
* Centralize config in `src/shared/config/` via `@nestjs/config` + Joi validation.
  **Do not** read `process.env` directly in modules.

---

## 10) Logging & Monitoring

* Use NestJS `Logger` with contextual logs.
* Do **not** log sensitive data (passwords, tokens, secrets).
* Log IDs, statuses, operation names, and timing where useful.

---

## 11) Testing

* **Unit tests** beside source files: `*.spec.ts`.
* **E2E tests** under `test/`: `*.e2e-spec.ts`.
* Mock external deps (DB, cache, HTTP).
* Focus on business logic and auth/ownership checks; assert pagination cursors.
* Use `jest.setup.ts` for global test configuration.
* Mock services and dependencies using `TestingModule` from `@nestjs/testing`.

---

## 12) Performance

* Select only needed fields; load only required relations.
* Add indexes for common filters/sorts; use composite indexes where relevant.
* Batch by IDs; avoid N+1 (prefer `IN()` strategies).
* Cache hot paths with conservative TTLs.

---

## 13) File Organization & Naming

* **Files**: `kebab-case` (`article.service.ts`, `create-article.dto.ts`).
* **Classes/Interfaces**: `PascalCase` (interfaces may use `I` prefix where already used).
* **Constants**: `UPPER_SNAKE_CASE`.
* **Shared** code: `src/common/` (cross-cutting) and `src/shared/` (infra/core).
* **Domain** code: `src/<domain>/` with cohesive modules.

---

## 14) **Never Do**

* ❌ Run generators (`nest g`, codegen).
* ❌ Generate or run DB migrations.
* ❌ Access DB directly from controllers.
* ❌ Bypass `BaseService` / `BaseRepository` patterns.
* ❌ Hardcode error messages (use i18n keys).
* ❌ Read `process.env` directly in feature code.
* ❌ Expose sensitive fields in responses.
* ❌ Roll your own pagination/cursor logic.
* ❌ Use `@Entity()` without an explicit table name.
* ❌ Skip DTO validation.
* ❌ Use npm/pnpm (Yarn only).

---

## 15) **Always Do**

* ✅ Extend `BaseEntityCustom` for entities.
* ✅ Extend `BaseService` for services; prefer `TypeOrmBaseRepository` for data access.
* ✅ Use `ConditionBuilder` for filters.
* ✅ Use `PaginationFormatter` and **signed cursors**.
* ✅ Configure relations/select whitelists.
* ✅ Leverage lifecycle hooks for normalization and side effects.
* ✅ Use `CacheService` with proper prefixes; invalidate on write.
* ✅ Validate DTOs; use `SnowflakeIdPipe` for IDs.
* ✅ Protect routes with `@Auth()`; apply rate-limits per policy.
* ✅ Log meaningful, non-sensitive events.
* ✅ Write unit/e2e tests for business-critical paths.
* ✅ **Use Yarn exclusively**.

---

## 16) Development Workflow

### Adding a New Feature

1. Review similar modules and docs.
2. Create **entity** extending `BaseEntityCustom`.
3. Create **DTOs** for create/update/query.
4. Add **repository** (if custom queries needed) based on `TypeOrmBaseRepository`.
5. Add **service** extending `BaseService`:

   * configure cache, searchable columns, relations/select whitelists,
   * override lifecycle hooks as needed.
6. Add **controller** (thin) delegating to service; apply `@Auth()` and validation.
7. Register in the module; export if other modules depend on it.
8. Write tests (unit/e2e) for core flows.
9. Update docs if touching shared patterns.

### Modifying Existing Features

1. Read docs & inspect impact across modules.
2. Preserve backward compatibility where possible.
3. Update tests to cover changes.
4. Coordinate schema changes with maintainers (no auto-migrations).
5. Update documentation as needed.

### Key Modules Overview

* **Analytics** - User behavior tracking and metrics
* **Articles** - Content management with scheduled publishing
* **Auth** - JWT authentication with Firebase support
* **Bookmarks** - User bookmarking system
* **Comments** - Nested comment system
* **Follow** - User following with Roaring Bitmap optimization
* **Media** - File upload and management
* **Notifications** - Real-time notification system
* **Organizations** - Multi-tenant organization support
* **Permissions** - Granular permission system
* **QR** - QR code actions and WebSocket polling
* **Rate-limit** - Hybrid rate limiting system
* **Reactions** - Like/dislike reactions
* **Reports** - Content reporting system
* **Share** - Social sharing with attribution tracking
* **Stickers** - Sticker pack management
* **Tags** - Content tagging system
* **Users** - User management with sessions
* **Workers** - Background job processing

---

**Summary**

Build features by **manually** updating entities, repositories, services, controllers, and DTOs inside the correct domain module. Reuse `BaseService`, `TypeOrmBaseRepository`, `CacheService`, `ConditionBuilder`, and the provided pagination/cursor utilities.
**No generators. No migrations. No add Swagger docs. Yarn only.**
Follow the established conventions to ensure a consistent, scalable, and maintainable codebase.

