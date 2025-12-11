# Hệ Thống Permission - Tài Liệu Chi Tiết

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [Các Thành Phần Chính](#các-thành-phần-chính)
4. [Flow Hoạt Động Chi Tiết](#flow-hoạt-động-chi-tiết)
5. [Cách Sử Dụng](#cách-sử-dụng)
6. [Ví Dụ Thực Tế](#ví-dụ-thực-tế)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

Hệ thống permission trong dự án này là một hệ thống phân quyền mạnh mẽ, linh hoạt và hiệu suất cao, được thiết kế theo mô hình **Discord-style permissions** với các đặc điểm:

### Đặc Điểm Chính

- **Bitfield-based**: Sử dụng bitmask (BigInt) để lưu trữ permissions, tiết kiệm bộ nhớ và tăng tốc độ kiểm tra
- **Multi-level**: Hỗ trợ 3 cấp độ permission: **Scope** → **Role** → **User** (theo thứ tự ưu tiên)
- **Allow/Deny**: Mỗi cấp độ đều có thể **allow** hoặc **deny** permission, với **deny luôn có ưu tiên cao hơn allow**
- **Scoped Permissions**: Hỗ trợ permissions theo scope (organization, team, project, etc.)
- **Caching**: Sử dụng Redis cache để tối ưu hiệu suất
- **Type-safe**: Sử dụng TypeScript với type checking chặt chẽ

### Permission Key Format

Mỗi permission được định nghĩa theo format: `{component}.{action}`

- **Component**: Đối tượng (article, series, segment, organization, team, project, media, sticker, report)
- **Action**: Hành động (create, read, update, delete)

**Ví dụ:**
- `article.create` - Quyền tạo bài viết
- `organization.update` - Quyền cập nhật tổ chức
- `media.delete` - Quyền xóa media

---

## Kiến Trúc Hệ Thống

### Sơ Đồ Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                             │
│              (với @Permissions decorator)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              PermissionsGuard (Guard)                       │
│  - Kiểm tra authentication                                  │
│  - Admin bypass                                            │
│  - Extract scope từ request                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         PermissionEvaluator (Service)                       │
│  - Load permissions từ DB                                  │
│  - Evaluate với precedence logic                           │
│  - Cache results                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         PermissionRegistry (Service)                        │
│  - Map PermissionKey → Bit Index                            │
│  - Quản lý tất cả permissions                              │
└─────────────────────────────────────────────────────────────┘
```

### Các Cấp Độ Permission (Precedence)

Hệ thống kiểm tra permissions theo thứ tự ưu tiên từ cao xuống thấp:

1. **Scope Level** (Cao nhất)
   - Permissions được gán trực tiếp cho scope (organization, team, etc.)
   - Lưu trong bảng `scope_permissions`

2. **Role Level** (Trung bình)
   - Permissions từ các roles mà user sở hữu
   - Lưu trong bảng `roles` (với `user_roles` làm junction table)

3. **User Level** (Thấp nhất)
   - Permissions được gán trực tiếp cho user
   - Lưu trong bảng `user_permissions`

**Quy Tắc Đánh Giá:**
- **Deny luôn override Allow** ở mọi cấp độ
- Nếu một cấp độ có kết quả (allow hoặc deny), các cấp độ thấp hơn sẽ không được kiểm tra
- Nếu tất cả cấp độ đều không có kết quả → **Default Deny** (từ chối)

---

## Các Thành Phần Chính

### 1. PermissionRegistry Service

**Vị trí:** `src/permissions/services/permission-registry.service.ts`

**Chức năng:**
- Đăng ký tất cả PermissionKeys khi module khởi động
- Map PermissionKey → Bit Index (vị trí trong bitfield)
- Cung cấp các utility methods để làm việc với bit masks

**Cách hoạt động:**
```typescript
// Khi module khởi động, tất cả PermissionKeys được đăng ký
// Ví dụ: 'article.create' → bit index 0
//        'article.read' → bit index 1
//        'article.update' → bit index 2
//        ...

// Bit mask được tính: 1n << bitIndex
// Ví dụ: bit index 0 → mask = 1n (binary: 0001)
//        bit index 1 → mask = 2n (binary: 0010)
//        bit index 2 → mask = 4n (binary: 0100)
```

**API chính:**
- `getBitIndex(key: PermissionKey): number | null` - Lấy bit index của permission
- `getBitMask(key: PermissionKey): bigint` - Lấy bit mask của permission
- `getAllPermissionKeys(): PermissionKey[]` - Lấy tất cả permissions đã đăng ký

### 2. PermissionEvaluator Service

**Vị trí:** `src/permissions/services/permission-evaluator.service.ts`

**Chức năng:**
- Đánh giá xem user có permission hay không
- Load permissions từ database (scope, role, user)
- Kết hợp permissions theo precedence logic
- Cache kết quả để tối ưu hiệu suất

**Các phương thức chính:**

#### `evaluate(userId, permissionKey, scopeType?, scopeId?): Promise<boolean>`
Kiểm tra đơn giản: user có permission hay không?

```typescript
const hasPermission = await permissionEvaluator.evaluate(
  userId,
  'article.create',
  'organization',
  orgId
);
```

#### `evaluateWithDetails(...): Promise<EvaluationResult>`
Kiểm tra chi tiết với thông tin về level và lý do:

```typescript
const result = await permissionEvaluator.evaluateWithDetails(
  userId,
  'article.create',
  'organization',
  orgId
);
// result = {
//   allowed: true,
//   level: 'role', // 'scope' | 'role' | 'user' | 'default'
//   denied: false,
//   reason: 'Permission article.create allowed at role level'
// }
```

#### `getEffectivePermissions(userId, scopeType?, scopeId?): Promise<EffectivePermissions>`
Lấy tất cả permissions hiệu quả của user trong scope:

```typescript
const effective = await permissionEvaluator.getEffectivePermissions(
  userId,
  'organization',
  orgId
);
// effective = {
//   allowPermissions: BigInt(...),
//   denyPermissions: BigInt(...),
//   permissions: { 'article.create': true, 'article.read': true, ... },
//   permissionDetails: { 'article.create': 'allow', ... }
// }
```

**Flow đánh giá:**

1. **Load Permission Sources:**
   - Load scope permissions (nếu có scopeType và scopeId)
   - Load user roles (global + scoped)
   - Load user permissions (global + scoped)

2. **Aggregate Permissions:**
   - Aggregate tất cả role permissions (OR operation)
   - Aggregate tất cả user permissions (OR operation)

3. **Evaluate với Precedence:**
   ```
   Scope Level → Role Level → User Level → Default Deny
   ```

4. **Cache Result:**
   - Cache key: `permissions:effective:{userId}:{scopeType}:{scopeId}`
   - TTL: 5 phút

### 3. PermissionsGuard

**Vị trí:** `src/auth/guard/permissions.guard.ts`

**Chức năng:**
- Guard NestJS để bảo vệ routes
- Kiểm tra authentication
- Admin bypass (admin/super_admin bypass tất cả checks)
- Extract scope từ request
- Gọi PermissionEvaluator để kiểm tra

**Cách sử dụng:**

```typescript
@Controller('articles')
export class ArticlesController {
  @Post()
  @Auth() // Bắt buộc phải authenticated
  @Permissions({ all: ['article.create'] }) // Yêu cầu permission
  async create(@Body() dto: CreateArticleDto) {
    // ...
  }
}
```

**Flow trong Guard:**

1. Lấy permission requirements từ decorator `@Permissions()`
2. Validate user authentication
3. Admin bypass (nếu user là admin)
4. Extract scope từ request (nếu `autoDetectScope: true`)
5. Gọi `PermissionEvaluator.evaluate()` cho mỗi permission
6. Throw `ForbiddenException` nếu không có permission

### 4. Context Resolvers

**Vị trí:** `src/permissions/services/context-resolver.service.ts`

**Chức năng:**
- Extract context (scope) từ HTTP request
- Hỗ trợ auto-detect scope từ URL, params, body, query

**Các resolver có sẵn:**
- `SegmentContextResolver` - Extract segment context
- `OrganizationContextResolver` - Extract organization context
- `ArticleContextResolver` - Extract article context

**Ví dụ:**

```typescript
// Request: GET /organizations/123/articles
// Auto-detect sẽ tìm thấy: { scopeType: 'organization', scopeId: '123' }
```

### 5. Entities

#### Role Entity
**Vị trí:** `src/permissions/entities/role.entity.ts`

**Cấu trúc:**
- `name`: Tên role (unique)
- `allowPermissions`: Bitfield cho phép (BigInt as string)
- `denyPermissions`: Bitfield từ chối (BigInt as string)
- `scopeType`, `scopeId`: Scope của role (null = global role)
- `position`: Vị trí trong hierarchy

#### UserRole Entity
**Vị trí:** `src/permissions/entities/user-role.entity.ts`

**Cấu trúc:**
- `userId`: ID của user
- `roleId`: ID của role
- `expiresAt`: Thời gian hết hạn (optional)
- `isTemporary`: Có phải temporary role không

#### UserPermission Entity
**Vị trí:** `src/permissions/entities/user-permission.entity.ts`

**Cấu trúc:**
- `userId`: ID của user
- `allowPermissions`: Bitfield cho phép
- `denyPermissions`: Bitfield từ chối
- `contextType`, `contextId`: Context của permission (optional)
- `expiresAt`: Thời gian hết hạn (optional)

#### ScopePermission Entity
**Vị trí:** `src/permissions/entities/scope-permission.entity.ts`

**Cấu trúc:**
- `scopeType`: Loại scope (organization, team, etc.)
- `scopeId`: ID của scope
- `allowPermissions`: Bitfield cho phép
- `denyPermissions`: Bitfield từ chối
- `expiresAt`: Thời gian hết hạn (optional)

---

## Flow Hoạt Động Chi Tiết

### Scenario 1: User tạo bài viết trong organization

```
1. HTTP Request
   POST /organizations/123/articles
   Headers: Authorization: Bearer <token>
   Body: { title: "...", content: "..." }

2. PermissionsGuard.canActivate()
   ├─ Extract @Permissions decorator: { all: ['article.create'] }
   ├─ Validate user từ token
   ├─ Check admin bypass (nếu admin → return true)
   └─ Extract scope: { scopeType: 'organization', scopeId: '123' }

3. PermissionEvaluator.evaluate()
   ├─ Get bit index: 'article.create' → bit index 0
   ├─ Load permission sources:
   │  ├─ Scope permissions: Load từ scope_permissions WHERE scopeType='organization' AND scopeId='123'
   │  ├─ User roles: Load từ user_roles WHERE userId='user123' + roles WHERE id IN (...)
   │  └─ User permissions: Load từ user_permissions WHERE userId='user123'
   │
   ├─ Aggregate permissions:
   │  ├─ scopeAllow = aggregate(scope_permissions.allowPermissions)
   │  ├─ scopeDeny = aggregate(scope_permissions.denyPermissions)
   │  ├─ roleAllow = aggregate(all roles.allowPermissions)
   │  ├─ roleDeny = aggregate(all roles.denyPermissions)
   │  ├─ userAllow = aggregate(user_permissions.allowPermissions)
   │  └─ userDeny = aggregate(user_permissions.denyPermissions)
   │
   └─ Evaluate với precedence:
      ├─ Check scope level (bit index 0):
      │  ├─ If scopeDeny has bit 0 → return { allowed: false, level: 'scope' }
      │  └─ If scopeAllow has bit 0 → return { allowed: true, level: 'scope' }
      │
      ├─ Check role level (nếu scope không có kết quả):
      │  ├─ If roleDeny has bit 0 → return { allowed: false, level: 'role' }
      │  └─ If roleAllow has bit 0 → return { allowed: true, level: 'role' }
      │
      ├─ Check user level (nếu role không có kết quả):
      │  ├─ If userDeny has bit 0 → return { allowed: false, level: 'user' }
      │  └─ If userAllow has bit 0 → return { allowed: true, level: 'user' }
      │
      └─ Default: return { allowed: false, level: 'default' }

4. Guard Decision
   ├─ If allowed → return true (cho phép request tiếp tục)
   └─ If not allowed → throw ForbiddenException
```

### Scenario 2: Cache Hit

```
1. Request đến với cùng userId + scope
2. PermissionEvaluator.getEffectivePermissions()
   ├─ Generate cache key: 'permissions:effective:user123:organization:123'
   ├─ Check Redis cache → HIT!
   └─ Return cached result (không cần query DB)
```

### Scenario 3: Complex Permission Logic

```typescript
@Permissions({
  all: ['article.create'],           // Phải có TẤT CẢ
  any: ['article.update', 'article.delete'], // Hoặc có MỘT TRONG
  none: ['article.delete']           // Không được có
})
```

**Flow:**
1. Check `all`: User phải có `article.create`
2. Check `any`: User phải có ít nhất một trong `article.update` hoặc `article.delete`
3. Check `none`: User không được có `article.delete`
4. Tất cả điều kiện phải thỏa mãn

---

## Cách Sử Dụng

### 1. Sử Dụng Decorator @Permissions

#### Basic Usage

```typescript
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('articles')
export class ArticlesController {
  // Yêu cầu 1 permission
  @Post()
  @Auth()
  @Permissions({ all: ['article.create'] })
  async create(@Body() dto: CreateArticleDto) {
    // ...
  }

  // Yêu cầu nhiều permissions (AND)
  @Patch(':id')
  @Auth()
  @Permissions({ all: ['article.update', 'article.read'] })
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    // ...
  }

  // Yêu cầu ít nhất 1 permission (OR)
  @Delete(':id')
  @Auth()
  @Permissions({ any: ['article.delete', 'article.manage'] })
  async delete(@Param('id') id: string) {
    // ...
  }

  // Không được có permission này
  @Get('draft')
  @Auth()
  @Permissions({ none: ['article.read'] })
  async getDrafts() {
    // Chỉ user không có article.read mới được truy cập
  }
}
```

#### Với Scope

```typescript
// Explicit scope
@Post('organizations/:orgId/articles')
@Auth()
@Permissions({
  all: ['article.create'],
  scopeType: 'organization',
  scopeId: 'orgId' // Sẽ lấy từ params.orgId
})
async createInOrg(@Param('orgId') orgId: string) {
  // ...
}

// Auto-detect scope
@Post('organizations/:orgId/articles')
@Auth()
@Permissions({
  all: ['article.create'],
  autoDetectScope: true // Tự động detect từ URL/params
})
async createInOrg(@Param('orgId') orgId: string) {
  // Guard sẽ tự động extract scope từ request
}
```

#### Complex Logic

```typescript
@Patch(':id')
@Auth()
@Permissions({
  // Phải có TẤT CẢ permissions này
  all: ['article.read'],
  // Và phải có ÍT NHẤT MỘT trong các permissions này
  any: ['article.update', 'article.manage'],
  // Và KHÔNG được có permission này
  none: ['article.delete'],
  autoDetectScope: true
})
async updateArticle(@Param('id') id: string) {
  // Logic phức tạp: 
  // - Phải có article.read
  // - Và (article.update HOẶC article.manage)
  // - Và không có article.delete
}
```

### 2. Sử Dụng PermissionEvaluator Trong Service

```typescript
import { PermissionEvaluator } from 'src/permissions/services/permission-evaluator.service';

@Injectable()
export class ArticleService {
  constructor(
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async createArticle(userId: string, orgId: string, dto: CreateArticleDto) {
    // Kiểm tra permission trước khi tạo
    const hasPermission = await this.permissionEvaluator.evaluate(
      userId,
      'article.create',
      'organization',
      orgId
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        messageKey: 'auth.FORBIDDEN',
        details: { message: 'You do not have permission to create articles' }
      });
    }

    // Tạo article...
  }

  async getEffectivePermissions(userId: string, orgId: string) {
    // Lấy tất cả permissions hiệu quả
    const effective = await this.permissionEvaluator.getEffectivePermissions(
      userId,
      'organization',
      orgId
    );

    return {
      canCreate: effective.permissions['article.create'] ?? false,
      canUpdate: effective.permissions['article.update'] ?? false,
      canDelete: effective.permissions['article.delete'] ?? false,
      // ...
    };
  }
}
```

### 3. Tạo Role Với Permissions

```typescript
import { PermissionRegistry } from 'src/permissions/services/permission-registry.service';

@Injectable()
export class RoleService {
  constructor(
    private readonly permissionRegistry: PermissionRegistry,
  ) {}

  async createRoleWithPermissions(name: string, permissionKeys: PermissionKey[]) {
    // Lấy bit masks cho các permissions
    const allowPermissions = this.permissionRegistry.getBitMasks(permissionKeys);

    // Tạo role
    const role = new Role();
    role.name = name;
    role.setAllowPermissionsFromBigInt(allowPermissions);

    return await this.roleRepository.save(role);
  }
}
```

### 4. Gán Permission Cho User

```typescript
import { PermissionRegistry } from 'src/permissions/services/permission-registry.service';

@Injectable()
export class UserPermissionService {
  constructor(
    private readonly permissionRegistry: PermissionRegistry,
  ) {}

  async grantPermissionToUser(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string
  ) {
    const bitMask = this.permissionRegistry.getBitMask(permissionKey);

    const userPermission = new UserPermission();
    userPermission.userId = userId;
    userPermission.setAllowPermissionsFromBigInt(bitMask);
    userPermission.contextType = scopeType;
    userPermission.contextId = scopeId;

    return await this.userPermissionRepository.save(userPermission);
  }

  async revokePermissionFromUser(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string
  ) {
    // Tìm user permission
    const userPermission = await this.userPermissionRepository.findOne({
      where: { userId, contextType: scopeType, contextId: scopeId }
    });

    if (userPermission) {
      const bitMask = this.permissionRegistry.getBitMask(permissionKey);
      const currentAllow = userPermission.getAllowPermissionsAsBigInt();
      
      // Clear bit (revoke)
      const newAllow = currentAllow & ~bitMask;
      userPermission.setAllowPermissionsFromBigInt(newAllow);

      await this.userPermissionRepository.save(userPermission);
    }
  }
}
```

### 5. Invalidate Cache

```typescript
@Injectable()
export class RoleService {
  constructor(
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async assignRoleToUser(userId: string, roleId: string) {
    // Assign role...
    await this.userRoleRepository.save({ userId, roleId });

    // Invalidate cache để permissions được reload
    await this.permissionEvaluator.invalidateUserCache(userId);
  }

  async updateRolePermissions(roleId: string, permissions: PermissionKey[]) {
    // Update role permissions...
    
    // Invalidate cache cho tất cả users có role này
    const userRoles = await this.userRoleRepository.find({ where: { roleId } });
    for (const userRole of userRoles) {
      await this.permissionEvaluator.invalidateUserCache(userRole.userId);
    }
  }
}
```

---

## Ví Dụ Thực Tế

### Ví Dụ 1: Article Management

```typescript
@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
  ) {}

  // Public: Ai cũng có thể đọc
  @Get()
  async findAll(@Query() dto: GetArticlesDto) {
    return this.articlesService.findAll(dto);
  }

  // Yêu cầu authenticated + permission
  @Post()
  @Auth()
  @Permissions({ all: ['article.create'] })
  async create(@Body() dto: CreateArticleDto, @Req() req: ReqUser) {
    return this.articlesService.create(req.user.uid, dto);
  }

  // Yêu cầu permission trong organization scope
  @Post('organizations/:orgId/articles')
  @Auth()
  @Permissions({
    all: ['article.create'],
    scopeType: 'organization',
    autoDetectScope: true
  })
  async createInOrg(
    @Param('orgId') orgId: string,
    @Body() dto: CreateArticleDto,
    @Req() req: ReqUser
  ) {
    return this.articlesService.createInOrganization(req.user.uid, orgId, dto);
  }

  // Complex permission: có thể update nếu có quyền update HOẶC manage
  @Patch(':id')
  @Auth()
  @Permissions({
    all: ['article.read'],
    any: ['article.update', 'article.manage']
  })
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() dto: UpdateArticleDto,
    @Req() req: ReqUser
  ) {
    return this.articlesService.update(id, req.user.uid, dto);
  }

  // Chỉ admin hoặc user có quyền delete
  @Delete(':id')
  @Auth()
  @Permissions({ all: ['article.delete'] })
  async delete(@Param('id', SnowflakeIdPipe) id: string) {
    return this.articlesService.remove(id);
  }
}
```

### Ví Dụ 2: Organization Management

```typescript
@Controller('organizations')
export class OrganizationsController {
  // Tạo organization: cần permission global
  @Post()
  @Auth()
  @Permissions({ all: ['organization.create'] })
  async create(@Body() dto: CreateOrganizationDto, @Req() req: ReqUser) {
    return this.organizationsService.create(req.user.uid, dto);
  }

  // Xem organization: cần read permission trong scope đó
  @Get(':id')
  @Auth()
  @Permissions({
    all: ['organization.read'],
    scopeType: 'organization',
    autoDetectScope: true
  })
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.organizationsService.findById(id);
  }

  // Update organization: cần update permission trong scope đó
  @Patch(':id')
  @Auth()
  @Permissions({
    all: ['organization.update'],
    scopeType: 'organization',
    autoDetectScope: true
  })
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() dto: UpdateOrganizationDto
  ) {
    return this.organizationsService.update(id, dto);
  }
}
```

### Ví Dụ 3: Service-Level Permission Check

```typescript
@Injectable()
export class ArticleService extends BaseService<Article> {
  constructor(
    @InjectRepository(Article) repo: Repository<Article>,
    private readonly permissionEvaluator: PermissionEvaluator,
    cacheService: CacheService,
  ) {
    super(repo, { /* ... */ }, cacheService);
  }

  async publishArticle(articleId: string, userId: string) {
    const article = await this.findById(articleId);

    // Kiểm tra permission trong organization scope
    if (article.organizationId) {
      const canPublish = await this.permissionEvaluator.evaluate(
        userId,
        'article.update',
        'organization',
        article.organizationId
      );

      if (!canPublish) {
        throw new ForbiddenException({
          messageKey: 'auth.FORBIDDEN',
          details: { message: 'You do not have permission to publish articles in this organization' }
        });
      }
    }

    // Publish article...
    article.status = 'published';
    return await this.save(article);
  }

  async getArticleWithPermissions(articleId: string, userId: string) {
    const article = await this.findById(articleId);

    // Lấy permissions hiệu quả
    const effective = article.organizationId
      ? await this.permissionEvaluator.getEffectivePermissions(
          userId,
          'organization',
          article.organizationId
        )
      : null;

    return {
      ...article,
      permissions: {
        canUpdate: effective?.permissions['article.update'] ?? false,
        canDelete: effective?.permissions['article.delete'] ?? false,
      }
    };
  }
}
```

---

## Best Practices

### 1. Sử Dụng Decorator Thay Vì Manual Check

✅ **Tốt:**
```typescript
@Post()
@Auth()
@Permissions({ all: ['article.create'] })
async create(@Body() dto: CreateArticleDto) {
  // Logic tạo article
}
```

❌ **Không tốt:**
```typescript
@Post()
@Auth()
async create(@Body() dto: CreateArticleDto, @Req() req: ReqUser) {
  const hasPermission = await this.permissionEvaluator.evaluate(
    req.user.uid,
    'article.create'
  );
  if (!hasPermission) {
    throw new ForbiddenException();
  }
  // Logic tạo article
}
```

### 2. Sử Dụng Auto-Detect Scope Khi Có Thể

✅ **Tốt:**
```typescript
@Permissions({
  all: ['article.create'],
  autoDetectScope: true // Tự động detect từ URL
})
```

❌ **Không tốt:**
```typescript
@Permissions({
  all: ['article.create'],
  scopeType: 'organization',
  scopeId: 'orgId' // Phải manual extract
})
```

### 3. Invalidate Cache Khi Thay Đổi Permissions

✅ **Tốt:**
```typescript
async assignRoleToUser(userId: string, roleId: string) {
  await this.userRoleRepository.save({ userId, roleId });
  await this.permissionEvaluator.invalidateUserCache(userId);
}
```

❌ **Không tốt:**
```typescript
async assignRoleToUser(userId: string, roleId: string) {
  await this.userRoleRepository.save({ userId, roleId });
  // Quên invalidate cache → permissions cũ vẫn được dùng
}
```

### 4. Sử Dụng Complex Logic Một Cách Hợp Lý

✅ **Tốt:**
```typescript
// Rõ ràng, dễ hiểu
@Permissions({
  all: ['article.read'],
  any: ['article.update', 'article.manage']
})
```

❌ **Không tốt:**
```typescript
// Quá phức tạp, khó maintain
@Permissions({
  all: ['article.read', 'organization.read'],
  any: ['article.update', 'article.manage', 'article.moderate'],
  none: ['article.delete', 'article.archive']
})
```

### 5. Kiểm Tra Permissions Ở Service Level Khi Cần

✅ **Tốt:**
```typescript
// Khi logic phức tạp, cần check trong service
async transferArticle(articleId: string, fromOrgId: string, toOrgId: string, userId: string) {
  // Check permission ở cả 2 organizations
  const canRemove = await this.permissionEvaluator.evaluate(
    userId, 'article.delete', 'organization', fromOrgId
  );
  const canCreate = await this.permissionEvaluator.evaluate(
    userId, 'article.create', 'organization', toOrgId
  );
  
  if (!canRemove || !canCreate) {
    throw new ForbiddenException();
  }
  // Transfer logic...
}
```

### 6. Sử Dụng Type-Safe PermissionKeys

✅ **Tốt:**
```typescript
import { ARTICLE_CREATE, ARTICLE_UPDATE } from 'src/permissions/constants';

@Permissions({ all: [ARTICLE_CREATE] })
```

❌ **Không tốt:**
```typescript
@Permissions({ all: ['article.create'] }) // String literal, dễ typo
```

---

## Troubleshooting

### Vấn Đề 1: Permission không hoạt động

**Triệu chứng:** User có role/permission nhưng vẫn bị từ chối

**Nguyên nhân có thể:**
1. Cache chưa được invalidate
2. Permission key không đúng format
3. Scope không được extract đúng

**Giải pháp:**
```typescript
// 1. Invalidate cache
await permissionEvaluator.invalidateUserCache(userId);

// 2. Kiểm tra permission key
const isValid = isPermissionKey('article.create'); // Phải là true

// 3. Debug scope extraction
const context = await contextResolverService.autoDetectContext(request);
console.log('Detected context:', context);
```

### Vấn Đề 2: Admin vẫn bị check permission

**Triệu chứng:** Admin user vẫn bị từ chối

**Nguyên nhân:** User role không được set đúng trong AuthPayload

**Giải pháp:**
```typescript
// Kiểm tra AuthPayload có role không
// Admin roles: USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.SUPER_ADMIN
```

### Vấn Đề 3: Scope không được detect

**Triệu chứng:** Permission check không sử dụng scope

**Giải pháp:**
```typescript
// Explicit scope
@Permissions({
  all: ['article.create'],
  scopeType: 'organization',
  scopeId: 'orgId' // Hoặc dùng param name
})

// Hoặc enable auto-detect
@Permissions({
  all: ['article.create'],
  autoDetectScope: true
})
```

### Vấn Đề 4: Performance chậm

**Triệu chứng:** Permission check mất nhiều thời gian

**Nguyên nhân:** Cache miss, query DB nhiều lần

**Giải pháp:**
```typescript
// 1. Đảm bảo Redis cache hoạt động
// 2. Sử dụng getEffectivePermissions() thay vì evaluate() nhiều lần
const effective = await permissionEvaluator.getEffectivePermissions(userId, scopeType, scopeId);
// Check nhiều permissions từ 1 lần query thay vì nhiều lần
```

### Vấn Đề 5: Permission bị conflict

**Triệu chứng:** User có permission nhưng vẫn bị deny

**Nguyên nhân:** Deny permission ở level cao hơn

**Giải pháp:**
```typescript
// Kiểm tra chi tiết
const result = await permissionEvaluator.evaluateWithDetails(
  userId,
  'article.create',
  scopeType,
  scopeId
);
console.log('Result:', result);
// result.reason sẽ cho biết permission bị deny ở level nào
```

---

## Tóm Tắt

Hệ thống permission này cung cấp:

1. **Flexibility**: Hỗ trợ multi-level, scoped permissions
2. **Performance**: Bitfield-based với Redis caching
3. **Type Safety**: TypeScript với type checking
4. **Ease of Use**: Decorator-based API đơn giản
5. **Scalability**: Có thể mở rộng với nhiều permissions và scopes

**Key Takeaways:**
- Sử dụng `@Permissions()` decorator cho route protection
- Deny luôn override Allow
- Scope → Role → User precedence
- Luôn invalidate cache khi thay đổi permissions
- Sử dụng auto-detect scope khi có thể

---

**Tài liệu này được cập nhật lần cuối:** [Ngày hiện tại]
**Phiên bản:** 1.0.0
