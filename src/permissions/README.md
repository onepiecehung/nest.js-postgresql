# Permissions System Architecture

## Overview

The permissions system provides a flexible, scope-based permission model with support for:
- PermissionKeys in the format `{component}.{action}` (e.g., "article.create", "series.read")
- Dual bitfields: Each permission source has both `allowPermissions` and `denyPermissions` bitfields
- Scope-Based Permissions: Support for permissions attached to scopes (organization, team, project, etc.)
- Evaluation Precedence: Scope → Role → User (scope has highest priority, user lowest)
- Deny Override: Deny always overrides allow at each level
- Fall-Through Logic: If a bit is undefined at a level, fall through to the next level
- Default Deny: If no level allows a permission, it is denied by default

## Architecture Components

### Core Services

- **PermissionRegistry**: Central registry that maps PermissionKey → bit index, built at bootstrap
- **PermissionEvaluator**: Core evaluation service implementing precedence logic
- **ScopePermissionService**: Manages scope-level permissions

### Entities

- **ScopePermission**: Entity for scope-level permissions
- **Role**: Extended with `allowPermissions`, `denyPermissions`, `scopeType`, `scopeId`
- **UserPermission**: Extended with `allowPermissions`, `denyPermissions`

### Evaluation Algorithm

```
1. Get bit index for permissionKey from registry
2. Load scope permissions (if scopeType/scopeId provided)
3. Load user roles (global + scoped to scopeType/scopeId)
4. Load user permissions (global + scoped)

5. Check scope level:
   - If deny bit set → return false
   - If allow bit set → return true
   - If undefined → continue

6. Check role level (aggregate all roles):
   - Aggregate allowPermissions (OR all role allows)
   - Aggregate denyPermissions (OR all role denies)
   - If deny bit set → return false
   - If allow bit set → return true
   - If undefined → continue

7. Check user level:
   - If deny bit set → return false
   - If allow bit set → return true
   - If undefined → return false (default deny)
```

## Cache Strategy

- **Cache Keys**: `permissions:effective:{userId}:{scopeType}:{scopeId}`
- **TTL**: 300 seconds (5 minutes)
- **Invalidation**: On Role, UserRole, UserPermission, or ScopePermission changes
- **Structure**: `{ allowPermissions: string, denyPermissions: string }`

## Components & Actions

### Components
- `article`
- `series`
- `segment`
- `organization`
- `team`
- `project`
- `media`
- `sticker`
- `report`

### Actions
- `create`
- `read`
- `update`
- `delete`

## Usage Examples

### Basic Permission Check

```typescript
// Using PermissionKey
const hasPermission = await permissionEvaluator.evaluate(
  userId,
  'article.update',
  'organization',
  organizationId
);
```

### With Decorator

```typescript
// Direct PermissionKeys format
@RequirePermissions({
  all: ['article.update'],
  scopeType: 'organization',
  autoDetectScope: true
})
async updateArticle() {
  // ...
}
```

## Performance Targets

- Cache hit rate: > 90%
- Evaluation time (cached): < 10ms
- Evaluation time (uncached): < 50ms
