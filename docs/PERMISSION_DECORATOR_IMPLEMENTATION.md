# Permission Decorator Implementation Guide

## Tổng quan

`@RequirePermissions` decorator được triển khai trong `ArticlesController` để kiểm soát quyền truy cập các endpoint dựa trên hệ thống phân quyền bitfield của Discord-style.

## Cách triển khai trong ArticlesController

### 1. Import Decorator

```typescript
import { Auth, RequirePermissions } from 'src/common/decorators';
```

### 2. Các Endpoint và Quyền hạn

#### **POST /articles** - Tạo bài viết
```typescript
@RequirePermissions({ all: ['article.create'] })
```
- **Mục đích**: Chỉ những user có quyền `article.create` mới có thể tạo bài viết
- **Logic**: Phải có quyền `article.create` (AND operation)

#### **GET /articles** - Xem danh sách bài viết
```typescript
@RequirePermissions({
  any: ['article.read'],
})
```
- **Mục đích**: User có quyền `article.read` có thể xem bài viết
- **Logic**: Phải có quyền `article.read` (OR operation)

#### **GET /articles/cursor** - Xem danh sách với cursor pagination
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
})
```
- **Logic**: Tương tự như GET /articles

#### **GET /articles/:id** - Xem chi tiết bài viết
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
})
```
- **Logic**: Tương tự như GET /articles

#### **PATCH /articles/:id** - Cập nhật bài viết
```typescript
@RequirePermissions({
  all: ['article.update'],
})
```
- **Mục đích**: User có quyền `article.update` có thể cập nhật bài viết
- **Logic**: Phải có quyền `article.update` (AND operation)

#### **PATCH /articles/:id/publish** - Publish bài viết
```typescript
@RequirePermissions({
  all: ['article.update'],
})
```
- **Mục đích**: User có quyền `article.update` có thể publish bài viết
- **Logic**: Phải có quyền `article.update` (AND operation)

#### **PATCH /articles/:id/unpublish** - Unpublish bài viết
```typescript
@RequirePermissions({
  all: ['article.update'],
})
```
- **Logic**: Tương tự như publish - cần quyền `article.update`

#### **DELETE /articles/:id** - Xóa bài viết
```typescript
@RequirePermissions({
  all: ['article.update'],
})
```
- **Mục đích**: User có quyền `article.update` có thể xóa bài viết
- **Logic**: Phải có quyền `article.update` (AND operation)

## Các Pattern Sử Dụng

### 1. **Simple Permission Check**
```typescript
@RequirePermissions({ all: ['article.create'] })
```
- Kiểm tra user phải có quyền cụ thể

### 2. **OR Logic**
```typescript
@RequirePermissions({ any: ['article.read', 'article.update'] })
```
- User có thể có một trong các quyền được liệt kê

### 3. **AND Logic**
```typescript
@RequirePermissions({ all: ['article.update'] })
```
- User phải có tất cả quyền được liệt kê

### 4. **Complex Logic**
```typescript
@RequirePermissions({
  all: ['article.update'],
  any: ['article.delete'],
  none: ['article.read']
})
```
- User phải có `article.update` AND (`article.delete` OR ownership) AND không có quyền đọc

### 5. **With Scope Context**
```typescript
@RequirePermissions({
  all: ['organization.update'],
  scopeType: 'organization',
  autoDetectScope: true
})
```
- User phải có quyền `organization.update` trong scope của organization được tự động phát hiện từ request

## Quyền hạn theo Role

### **OWNER** (Tất cả quyền)
- `article.create`, `article.read`, `article.update`, `article.delete`

### **ADMIN** (Quyền quản lý)
- `article.create`, `article.read`, `article.update`

### **MEMBER** (Quyền cơ bản)
- `article.create`, `article.read`

## Lợi ích của Implementation

### 1. **Granular Control**
- Kiểm soát chi tiết từng hành động
- Phân biệt quyền xem draft vs published content

### 2. **Flexible Logic**
- Hỗ trợ AND/OR/NOT operations
- Có thể kết hợp nhiều điều kiện phức tạp

### 3. **Role-based Access**
- Dễ dàng phân quyền theo vai trò
- Admin có thể override các quyền hạn thông thường

### 4. **Security**
- Ngăn chặn unauthorized access
- Kiểm tra quyền ở controller level

### 5. **Maintainability**
- Code rõ ràng, dễ hiểu
- Dễ dàng thay đổi quyền hạn mà không ảnh hưởng business logic

## Best Practices

### 1. **Luôn kết hợp với @Auth()**
```typescript
@Auth()
@RequirePermissions({ all: ['ARTICLE_CREATE'] })
```

### 2. **Sử dụng comments để giải thích logic phức tạp**
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish
})
```

### 3. **Kiểm tra ownership trong service layer**
- Decorator chỉ kiểm tra quyền hạn
- Service layer kiểm tra ownership và business rules

### 4. **Sử dụng consistent naming**
- Tất cả permission keys đều theo format `{component}.{action}` (e.g., `article.create`, `organization.update`)
- Dễ dàng identify và maintain

## Kết luận

Việc triển khai `@RequirePermissions` trong `ArticlesController` cung cấp một hệ thống phân quyền linh hoạt và mạnh mẽ, đảm bảo security và maintainability cho ứng dụng. Pattern này có thể được áp dụng cho các controller khác trong hệ thống.
