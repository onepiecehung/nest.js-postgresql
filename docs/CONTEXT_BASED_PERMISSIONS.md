# 🔐 Context-Based Permissions Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Permission Types](#permission-types)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Integration Guide](#integration-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Context-Based Permissions system extends the role-based permission model to support **resource-specific permissions**. This allows you to grant permissions for specific resources (like segments) to users, providing fine-grained access control beyond roles.

### Key Features

- ✅ **Resource-Specific Permissions**: Grant permissions for specific segments, articles, or other resources
- ✅ **Flexible Access Control**: Combine role-based and context-based permissions
- ✅ **Automatic Permission Calculation**: System automatically merges role and context permissions
- ✅ **Audit Trail**: Track who granted permissions and why
- ✅ **Expiration Support**: Set time-limited permissions
- ✅ **Soft Delete**: Revoke permissions without losing audit history

### Use Cases

- **Segment Editors**: Grant `SEGMENTS_UPDATE` permission for specific segments only
- **Content Moderators**: Allow moderation of specific articles or series
- **Organization Members**: Provide organization-specific permissions
- **Temporary Access**: Grant time-limited permissions for specific resources

---

## 🔑 Core Concepts

### 1. Permission Hierarchy

The system calculates effective permissions in this order:

```
Effective Permissions = Role Permissions (OR) + Context Permissions (OR)
```

**Example:**
- User has role "Editor" with `SEGMENTS_UPDATE` → Can update ALL segments
- User has UserPermission with `SEGMENTS_UPDATE` for segment-1 → Can update segment-1
- **Result**: User can update ALL segments (from role) + segment-1 (from context)

### 2. Permission Types

#### Role-Based Permissions (Global)
- Stored in `roles.permissions` (BigInt bitmask)
- Applied to all resources of that type
- Example: Role "Admin" has `SEGMENTS_UPDATE` → Can update all segments

#### Context-Based Permissions (Resource-Specific)
- Stored in `user_permissions` table
- Applied to specific resources (segments, articles, etc.)
- Example: User has `SEGMENTS_UPDATE` for segment-1 → Can only update segment-1

### 3. Permission Check Logic

When checking if a user can update a segment:

```typescript
canUpdateSegment(userId, segmentId) {
  // 1. Check general permission (from roles)
  if (hasGeneralPermission(userId, 'SEGMENTS_UPDATE')) {
    return true; // Can update all segments
  }
  
  // 2. Check context-specific permission
  if (hasContextPermission(userId, 'SEGMENTS_UPDATE', segmentId)) {
    return true; // Can update this specific segment
  }
  
  return false; // No permission
}
```

---

## 📊 Permission Types

### Available Permissions for Segments

Currently supported permissions for segment context:

- **`SEGMENTS_UPDATE`**: Update a specific segment
- **`SEGMENTS_CREATE`**: Create segments (typically used with series context)

### Permission Bit Positions

```typescript
SEGMENTS_CREATE: 1n << 6n  // Bit 6
SEGMENTS_UPDATE: 1n << 7n  // Bit 7
```

### All Available Permissions

See `src/shared/constants/permission.constants.ts` for complete list:

- **Content Management**: `ARTICLE_CREATE`, `ARTICLE_READ`, `ARTICLE_UPDATE`, `ARTICLE_MANAGE_ALL`
- **Series**: `SERIES_CREATE`, `SERIES_UPDATE`
- **Segments**: `SEGMENTS_CREATE`, `SEGMENTS_UPDATE`
- **Media**: `MEDIA_UPLOAD`
- **Organization**: `ORGANIZATION_MANAGE_MEMBERS`, `ORGANIZATION_MANAGE_SETTINGS`, etc.
- **Stickers**: `STICKER_CREATE`, `STICKER_READ`, `STICKER_UPDATE`, `STICKER_DELETE`
- **Moderation**: `REPORT_READ`, `REPORT_MODERATE`

---

## 📚 API Reference

### 1. Grant Segment Permission

Grant a permission to a user for a specific segment.

**Endpoint:** `POST /permissions/segments/permissions`

**Request Body:**
```typescript
{
  userId: string;              // User ID (Snowflake)
  segmentId: string;           // Segment ID (Snowflake)
  permission: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE';
  reason?: string;             // Optional: Reason for granting
  grantedBy?: string;          // Optional: ID of user who granted
  expiresAt?: string;          // Optional: ISO date string for expiration
}
```

**Response:** `UserPermission` entity

**Example:**
```bash
curl -X POST http://localhost:3000/permissions/segments/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "1234567890123456789",
    "segmentId": "9876543210987654321",
    "permission": "SEGMENTS_UPDATE",
    "reason": "User assigned as segment editor",
    "grantedBy": "1111111111111111111"
  }'
```

**Response:**
```json
{
  "id": "1122334455667788990",
  "userId": "1234567890123456789",
  "permission": "SEGMENTS_UPDATE",
  "value": "128",
  "contextId": "9876543210987654321",
  "contextType": "segment",
  "reason": "User assigned as segment editor",
  "grantedBy": "1111111111111111111",
  "expiresAt": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Revoke Segment Permission

Revoke a permission from a user for a specific segment.

**Endpoint:** `DELETE /permissions/segments/permissions`

**Request Body:**
```typescript
{
  userId: string;
  segmentId: string;
  permission: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE';
}
```

**Response:** `204 No Content`

**Example:**
```bash
curl -X DELETE http://localhost:3000/permissions/segments/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "1234567890123456789",
    "segmentId": "9876543210987654321",
    "permission": "SEGMENTS_UPDATE"
  }'
```

---

### 3. Get User Segment Permissions

Get all segment permissions for a specific user.

**Endpoint:** `GET /permissions/users/:userId/segments/permissions`

**Response:** Array of `UserPermission` entities

**Example:**
```bash
curl -X GET http://localhost:3000/permissions/users/1234567890123456789/segments/permissions \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "id": "1122334455667788990",
    "userId": "1234567890123456789",
    "permission": "SEGMENTS_UPDATE",
    "value": "128",
    "contextId": "9876543210987654321",
    "contextType": "segment",
    "reason": "User assigned as segment editor",
    "grantedBy": "1111111111111111111",
    "expiresAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "1122334455667788991",
    "userId": "1234567890123456789",
    "permission": "SEGMENTS_UPDATE",
    "value": "128",
    "contextId": "9876543210987654322",
    "contextType": "segment",
    "reason": "Temporary access",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-20T14:00:00.000Z"
  }
]
```

---

### 4. Get Users with Segment Permission

Get all users who have permission for a specific segment.

**Endpoint:** `GET /permissions/segments/:segmentId/permissions`

**Query Parameters:**
- `permission` (optional): Filter by permission type (`SEGMENTS_UPDATE` | `SEGMENTS_CREATE`)

**Response:** Array of `UserPermission` entities with user relations

**Example:**
```bash
curl -X GET "http://localhost:3000/permissions/segments/9876543210987654321/permissions?permission=SEGMENTS_UPDATE" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "id": "1122334455667788990",
    "userId": "1234567890123456789",
    "permission": "SEGMENTS_UPDATE",
    "contextId": "9876543210987654321",
    "contextType": "segment",
    "user": {
      "id": "1234567890123456789",
      "username": "editor1",
      "email": "editor1@example.com"
    },
    "grantedBy": "1111111111111111111",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

## 💡 Usage Examples

### Example 1: Assign Segment Editor

**Scenario:** Assign a user as editor for specific segments in a series.

```typescript
import { PermissionsService } from 'src/permissions/permissions.service';

// In your service or controller
async assignSegmentEditor(
  userId: string,
  segmentIds: string[],
  grantedBy: string,
) {
  const permissions = [];
  
  for (const segmentId of segmentIds) {
    const permission = await this.permissionsService.grantSegmentPermission({
      userId,
      segmentId,
      permission: 'SEGMENTS_UPDATE',
      reason: `Assigned as editor for segment ${segmentId}`,
      grantedBy,
    });
    permissions.push(permission);
  }
  
  return permissions;
}
```

---

### Example 2: Check Permission Before Update

**Scenario:** Check if user can update a segment before allowing the operation.

```typescript
import { PermissionsService } from 'src/permissions/permissions.service';

// In SegmentsController
@Patch(':id')
@Auth()
async update(
  @Param('id', SnowflakeIdPipe) id: string,
  @Body() updateSegmentDto: UpdateSegmentDto,
  @Request() req: Request & { user: AuthPayload },
) {
  // Check permission
  const canUpdate = await this.permissionsService.canUpdateSegment(
    req.user.uid,
    id,
  );
  
  if (!canUpdate) {
    throw new ForbiddenException({
      messageKey: 'permission.FORBIDDEN',
      details: {
        message: 'You do not have permission to update this segment',
        segmentId: id,
      },
    });
  }
  
  // Proceed with update
  return this.segmentsService.update(id, updateSegmentDto);
}
```

---

### Example 3: Grant Temporary Permission

**Scenario:** Grant time-limited permission for a specific segment.

```typescript
// Grant permission that expires in 30 days
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30);

await permissionsService.grantSegmentPermission({
  userId: '1234567890123456789',
  segmentId: '9876543210987654321',
  permission: 'SEGMENTS_UPDATE',
  reason: 'Temporary editor access for review period',
  grantedBy: '1111111111111111111',
  expiresAt: expiresAt.toISOString(),
});
```

---

### Example 4: Bulk Grant Permissions

**Scenario:** Grant permissions to multiple users for multiple segments.

```typescript
async bulkGrantSegmentPermissions(
  userIds: string[],
  segmentIds: string[],
  permission: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE',
  grantedBy: string,
) {
  const results = [];
  
  for (const userId of userIds) {
    for (const segmentId of segmentIds) {
      try {
        const perm = await this.permissionsService.grantSegmentPermission({
          userId,
          segmentId,
          permission,
          reason: 'Bulk assignment',
          grantedBy,
        });
        results.push({ success: true, permission: perm });
      } catch (error) {
        results.push({
          success: false,
          userId,
          segmentId,
          error: error.message,
        });
      }
    }
  }
  
  return results;
}
```

---

### Example 5: List All Editors for a Segment

**Scenario:** Get all users who can edit a specific segment.

```typescript
async getSegmentEditors(segmentId: string) {
  const permissions = await this.permissionsService.getUsersWithSegmentPermission(
    segmentId,
    'SEGMENTS_UPDATE',
  );
  
  return permissions.map((perm) => ({
    userId: perm.userId,
    user: perm.user,
    grantedBy: perm.grantedBy,
    grantedAt: perm.createdAt,
    expiresAt: perm.expiresAt,
    reason: perm.reason,
  }));
}
```

---

### Example 6: Revoke All Permissions for a User

**Scenario:** Remove all segment permissions from a user (e.g., when removing from team).

```typescript
async revokeAllSegmentPermissions(userId: string) {
  // Get all segment permissions for user
  const permissions = await this.permissionsService.getUserSegmentPermissions(
    userId,
  );
  
  // Revoke each permission
  for (const perm of permissions) {
    if (perm.contextType === 'segment' && perm.contextId) {
      await this.permissionsService.revokeSegmentPermission({
        userId,
        segmentId: perm.contextId,
        permission: perm.permission as 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE',
      });
    }
  }
  
  return { revoked: permissions.length };
}
```

---

## 🔧 Integration Guide

### Step 1: Import PermissionsModule

In your feature module (e.g., `SeriesModule`):

```typescript
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [
    // ... other imports
    PermissionsModule,
  ],
  // ...
})
export class SeriesModule {}
```

### Step 2: Inject PermissionsService

In your controller or service:

```typescript
import { PermissionsService } from 'src/permissions/permissions.service';

@Controller('segments')
export class SegmentsController {
  constructor(
    private readonly segmentsService: SegmentsService,
    private readonly permissionsService: PermissionsService,
  ) {}
}
```

### Step 3: Add Permission Check

In your controller method:

```typescript
@Patch(':id')
@Auth()
async update(
  @Param('id', SnowflakeIdPipe) id: string,
  @Body() updateSegmentDto: UpdateSegmentDto,
  @Request() req: Request & { user: AuthPayload },
) {
  // Check permission
  const canUpdate = await this.permissionsService.canUpdateSegment(
    req.user.uid,
    id,
  );
  
  if (!canUpdate) {
    throw new ForbiddenException('Insufficient permissions');
  }
  
  // Proceed with operation
  return this.segmentsService.update(id, updateSegmentDto);
}
```

---

## ✅ Best Practices

### 1. Permission Hierarchy

**Recommended approach:**
- Use **roles** for general permissions (e.g., "All editors can update segments")
- Use **context permissions** for specific resources (e.g., "User can only update segment-1")

**Example:**
```typescript
// Good: Role for general access
Role "Editor" → SEGMENTS_UPDATE (all segments)

// Good: Context permission for specific access
UserPermission → SEGMENTS_UPDATE for segment-1 only
```

### 2. Audit Trail

Always provide `reason` and `grantedBy` when granting permissions:

```typescript
await permissionsService.grantSegmentPermission({
  userId,
  segmentId,
  permission: 'SEGMENTS_UPDATE',
  reason: 'Assigned as editor for episode 1', // Clear reason
  grantedBy: currentUser.id, // Track who granted
});
```

### 3. Expiration Dates

Use expiration dates for temporary access:

```typescript
// Grant permission for 30 days
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30);

await permissionsService.grantSegmentPermission({
  // ...
  expiresAt: expiresAt.toISOString(),
});
```

### 4. Permission Cleanup

Regularly clean up expired permissions:

```typescript
async cleanupExpiredPermissions() {
  const expired = await this.userPermissionRepository.find({
    where: {
      contextType: 'segment',
      expiresAt: LessThan(new Date()),
    },
  });
  
  for (const perm of expired) {
    await this.userPermissionRepository.softDelete(perm.id);
  }
  
  return { cleaned: expired.length };
}
```

### 5. Error Handling

Always handle permission errors gracefully:

```typescript
try {
  const canUpdate = await this.permissionsService.canUpdateSegment(
    userId,
    segmentId,
  );
  
  if (!canUpdate) {
    throw new ForbiddenException({
      messageKey: 'permission.FORBIDDEN',
      details: {
        segmentId,
        requiredPermission: 'SEGMENTS_UPDATE',
      },
    });
  }
} catch (error) {
  if (error instanceof ForbiddenException) {
    throw error;
  }
  // Log and handle other errors
  this.logger.error('Permission check failed', error);
  throw new InternalServerErrorException('Permission check failed');
}
```

### 6. Caching Considerations

Permissions are automatically cached. When granting/revoking:

- Cache is automatically refreshed via `refreshUserPermissions()`
- No manual cache invalidation needed
- Cache TTL: 1 hour (configurable)

---

## 🐛 Troubleshooting

### Issue 1: Permission Not Working

**Symptoms:** User has permission but still gets Forbidden error.

**Solutions:**
1. Check if permission is expired:
   ```typescript
   const perm = await userPermissionRepository.findOne({ ... });
   if (perm.isExpired()) {
     // Permission has expired
   }
   ```

2. Verify permission is not soft-deleted:
   ```typescript
   const perm = await userPermissionRepository.findOne({
     where: { ... },
     withDeleted: true, // Include soft-deleted
   });
   if (perm.isDeleted()) {
     // Permission was revoked
   }
   ```

3. Check cache: Clear user permission cache:
   ```typescript
   await userPermissionService.clearUserPermissions(userId);
   ```

### Issue 2: Duplicate Permission Error

**Symptoms:** Error "USER_PERMISSION_ALREADY_EXISTS" when granting.

**Solutions:**
1. Check if permission already exists:
   ```typescript
   const existing = await userPermissionRepository.findOne({
     where: {
       userId,
       permission: 'SEGMENTS_UPDATE',
       contextId: segmentId,
       contextType: 'segment',
     },
   });
   ```

2. If exists but soft-deleted, it will be restored automatically.

3. If exists and active, revoke first:
   ```typescript
   await permissionsService.revokeSegmentPermission({
     userId,
     segmentId,
     permission: 'SEGMENTS_UPDATE',
   });
   ```

### Issue 3: Permission Check Returns False

**Symptoms:** `canUpdateSegment()` returns false even though permission exists.

**Solutions:**
1. Check role permissions first:
   ```typescript
   const hasGeneral = await permissionsService.hasPermission(
     userId,
     PERMISSIONS.SEGMENTS_UPDATE,
   );
   ```

2. Check context permissions:
   ```typescript
   const contextPerm = await userPermissionRepository.findOne({
     where: {
       userId,
       permission: 'SEGMENTS_UPDATE',
       contextId: segmentId,
       contextType: 'segment',
     },
   });
   ```

3. Verify effective permissions:
   ```typescript
   const effective = await permissionsService.computeEffectivePermissions({
     userId,
   });
   // Check if SEGMENTS_UPDATE is in effective.mask
   ```

### Issue 4: Performance Issues

**Symptoms:** Permission checks are slow.

**Solutions:**
1. Ensure caching is enabled (default: enabled)
2. Check cache hit rate:
   ```typescript
   const isCached = await userPermissionService.isCached(userId);
   ```
3. Use batch operations for multiple checks:
   ```typescript
   // Instead of multiple individual checks
   const permissions = await permissionsService.getUserSegmentPermissions(userId);
   // Filter in memory
   ```

---

## 📝 Summary

### Key Takeaways

1. **Context-based permissions** extend role-based permissions for resource-specific access
2. **Permission calculation** automatically merges role and context permissions
3. **API endpoints** provide full CRUD operations for segment permissions
4. **Automatic caching** ensures high performance
5. **Audit trail** tracks who granted permissions and why

### Quick Reference

```typescript
// Grant permission
POST /permissions/segments/permissions

// Revoke permission
DELETE /permissions/segments/permissions

// Get user permissions
GET /permissions/users/:userId/segments/permissions

// Get segment editors
GET /permissions/segments/:segmentId/permissions

// Check permission (in code)
await permissionsService.canUpdateSegment(userId, segmentId);
```

---

## 🔗 Related Documentation

- [Permission System Overview](./PERMISSION_SYSTEM.md) - General permission system documentation
- [Base Service Guide](./BASE_SERVICE_GUIDE.md) - Service patterns and best practices
- [Architecture](./ARCHITECTURE.md) - System architecture overview

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0

