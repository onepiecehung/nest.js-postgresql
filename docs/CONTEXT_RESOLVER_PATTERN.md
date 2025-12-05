# 🔧 Context Resolver Pattern - Generic Permission System

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Creating Custom Context Resolvers](#creating-custom-context-resolvers)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)

---

## 🎯 Overview

The **Context Resolver Pattern** provides a **generic, extensible solution** for context-based permission checking. Instead of hardcoding logic for each resource type (segment, article, organization), the system uses **pluggable resolvers** that can be easily extended for new resource types.

### Key Benefits

- ✅ **Extensible**: Add new context types without modifying core guard logic
- ✅ **Reusable**: Same pattern works for segments, articles, organizations, and any future resources
- ✅ **Maintainable**: Each resolver is isolated and testable
- ✅ **Flexible**: Support multiple contexts in a single request
- ✅ **Auto-detection**: Automatically detect context from request when enabled

---

## 🏗️ Architecture

### Component Structure

```
permissions/
├── interfaces/
│   └── context-resolver.interface.ts    # IContextResolver interface
├── resolvers/
│   ├── segment-context.resolver.ts     # Segment context resolver
│   ├── organization-context.resolver.ts # Organization context resolver
│   ├── article-context.resolver.ts     # Article context resolver
│   └── index.ts                        # Exports
├── services/
│   └── context-resolver.service.ts     # Resolver registry and manager
└── ...
```

### Data Flow

```
HTTP Request
    ↓
PermissionsGuard.canActivate()
    ↓
1. Extract contexts using ContextResolverService
    ↓
2. For each context:
   - Check general permission (from roles)
   - Check context-specific permission (from UserPermission)
    ↓
3. Allow/Deny based on results
```

---

## 🔄 How It Works

### 1. Context Resolver Interface

Every resolver implements `IContextResolver`:

```typescript
interface IContextResolver {
  getContextType(): string;  // e.g., 'segment', 'article'
  extractContext(request: Request, options?): PermissionContext | undefined;
  canHandle(request: Request): boolean;
}
```

### 2. Context Resolver Service

`ContextResolverService` manages all resolvers:

- **Registry**: Stores all registered resolvers
- **Extraction**: Extracts contexts from requests using configured resolvers
- **Auto-detection**: Automatically detects context when enabled

### 3. Permission Check Flow

```typescript
// 1. Extract contexts from request
const contexts = await contextResolverService.extractContexts(request, configs);

// 2. Check permissions for each context
for (const [contextType, context] of contexts) {
  const hasPermission = await permissionsService.hasContextPermission(
    userId,
    permission,
    contextType,
    context.id,
  );
}
```

---

## 🛠️ Creating Custom Context Resolvers

### Example: Series Context Resolver

```typescript
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  IContextResolver,
  PermissionContext,
} from '../interfaces/context-resolver.interface';

@Injectable()
export class SeriesContextResolver implements IContextResolver {
  getContextType(): string {
    return 'series';
  }

  canHandle(request: Request): boolean {
    const url = request.url.toLowerCase();
    return (
      url.includes('/series/') ||
      request.params.seriesId !== undefined ||
      request.body?.seriesId !== undefined
    );
  }

  extractContext(
    request: Request,
    options?: Record<string, unknown>,
  ): PermissionContext | undefined {
    const paramName = (options?.paramName as string) || 'id';
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown>;
    const query = request.query as Record<string, string>;

    let seriesId: string | undefined;

    // Priority: params > body > query
    if (params[paramName] && this.isSeriesContext(request.url)) {
      seriesId = params[paramName];
    } else if (params.seriesId) {
      seriesId = params.seriesId;
    }

    if (!seriesId && body?.seriesId) {
      seriesId = body.seriesId as string;
    }

    if (!seriesId && query.seriesId) {
      seriesId = query.seriesId;
    }

    if (!seriesId) {
      return undefined;
    }

    return {
      type: 'series',
      id: seriesId,
      metadata: {
        paramName,
        source: this.getSource(params, body, query, seriesId),
      },
    };
  }

  private isSeriesContext(url: string): boolean {
    return url.includes('/series/');
  }

  private getSource(
    params: Record<string, string>,
    body: Record<string, unknown>,
    query: Record<string, string>,
    seriesId: string,
  ): string {
    if (params.seriesId === seriesId || params.id === seriesId) {
      return 'params';
    }
    if (body.seriesId === seriesId) {
      return 'body';
    }
    if (query.seriesId === seriesId) {
      return 'query';
    }
    return 'unknown';
  }
}
```

### Registering the Resolver

In `ContextResolverService` constructor:

```typescript
constructor(
  private readonly segmentResolver: SegmentContextResolver,
  private readonly organizationResolver: OrganizationContextResolver,
  private readonly articleResolver: ArticleContextResolver,
  private readonly seriesResolver: SeriesContextResolver, // Add new resolver
) {
  this.registerResolver(segmentResolver);
  this.registerResolver(organizationResolver);
  this.registerResolver(articleResolver);
  this.registerResolver(seriesResolver); // Register new resolver
}
```

In `PermissionsModule`:

```typescript
providers: [
  // ... existing providers
  SeriesContextResolver, // Add to providers
],
```

---

## 💡 Usage Examples

### Example 1: Segment Context (Explicit)

```typescript
@Patch('segments/:id')
@Auth()
@RequirePermissions({
  all: ['SEGMENTS_UPDATE'],
  contexts: [
    {
      type: 'segment',
      paramName: 'id', // Extract from :id param
      required: true,
    },
  ],
})
async update(@Param('id') id: string, @Body() dto: UpdateSegmentDto) {
  // Guard automatically checks:
  // 1. General SEGMENTS_UPDATE permission, OR
  // 2. SEGMENTS_UPDATE permission for this specific segment
  return this.segmentsService.update(id, dto);
}
```

### Example 2: Auto-Detect Context

```typescript
@Patch(':id')
@Auth()
@RequirePermissions({
  all: ['SEGMENTS_UPDATE'],
  autoDetectContext: true, // Automatically detect segment/article/etc.
})
async update(@Param('id') id: string, @Body() dto: UpdateDto) {
  // Guard automatically detects context from URL and checks permission
  return this.service.update(id, dto);
}
```

### Example 3: Multiple Contexts

```typescript
@Post('organizations/:orgId/articles')
@Auth()
@RequirePermissions({
  all: ['ARTICLE_CREATE'],
  contexts: [
    {
      type: 'organization',
      paramName: 'orgId',
      required: true,
    },
    {
      type: 'article',
      paramName: 'articleId', // From body
      required: false,
    },
  ],
})
async create(
  @Param('orgId') orgId: string,
  @Body() dto: CreateArticleDto,
) {
  // Guard checks permissions for both organization and article contexts
  return this.articlesService.create({ ...dto, organizationId: orgId });
}
```

### Example 4: Backward Compatibility (Organization)

```typescript
@Patch('organizations/:organizationId/settings')
@Auth()
@RequirePermissions({
  all: ['ORGANIZATION_MANAGE_SETTINGS'],
  // Still works with old organizationId field
  organizationId: 'from-decorator', // Optional, will be extracted from request if not provided
})
async updateSettings(
  @Param('organizationId') orgId: string,
  @Body() dto: UpdateSettingsDto,
) {
  // Works with both old and new context system
  return this.organizationsService.updateSettings(orgId, dto);
}
```

---

## ✅ Best Practices

### 1. Resolver Design

**DO:**
- Keep resolvers focused on a single context type
- Handle edge cases (nested objects, different param names)
- Return `undefined` if context cannot be extracted (don't throw)

**DON'T:**
- Mix multiple context types in one resolver
- Throw errors in `extractContext()` (return `undefined` instead)
- Hardcode specific permission logic in resolver

### 2. Context Configuration

**Recommended:**
```typescript
contexts: [
  {
    type: 'segment',
    paramName: 'id',      // Explicit param name
    required: true,       // Fail if not found
    options: {            // Resolver-specific options
      fallbackToQuery: true,
    },
  },
]
```

### 3. Permission Checking

**Priority Order:**
1. General permission (from roles) → Allows access to ALL resources
2. Context-specific permission → Allows access to SPECIFIC resource
3. If neither → Deny access

### 4. Error Handling

```typescript
// In resolver
extractContext(request: Request): PermissionContext | undefined {
  try {
    // Extract logic
    return context;
  } catch (error) {
    // Log but don't throw
    this.logger.warn('Failed to extract context', error);
    return undefined;
  }
}
```

### 5. Testing Resolvers

```typescript
describe('SegmentContextResolver', () => {
  it('should extract segmentId from URL params', () => {
    const request = {
      url: '/segments/123',
      params: { id: '123' },
    } as Request;

    const context = resolver.extractContext(request);
    expect(context).toEqual({
      type: 'segment',
      id: '123',
      metadata: { source: 'params' },
    });
  });
});
```

---

## 🔍 Advanced Usage

### Custom Resolver Options

```typescript
@RequirePermissions({
  all: ['ARTICLE_UPDATE'],
  contexts: [
    {
      type: 'article',
      paramName: 'id',
      options: {
        // Custom options for resolver
        allowNested: true,
        fallbackToBody: true,
      },
    },
  ],
})
```

### Dynamic Context Resolution

```typescript
// In your service
async checkPermissionWithDynamicContext(
  userId: string,
  permission: PermissionName,
  resourceType: string,
  resourceId: string,
) {
  return this.permissionsService.hasContextPermission(
    userId,
    permission,
    resourceType,
    resourceId,
  );
}
```

### Batch Context Checks

```typescript
// Check multiple resources at once
const checks = await Promise.all([
  permissionsService.hasContextPermission(userId, 'SEGMENTS_UPDATE', 'segment', segmentId1),
  permissionsService.hasContextPermission(userId, 'SEGMENTS_UPDATE', 'segment', segmentId2),
  permissionsService.hasContextPermission(userId, 'SEGMENTS_UPDATE', 'segment', segmentId3),
]);

const allAllowed = checks.every((result) => result === true);
```

---

## 📊 Comparison: Old vs New Approach

### Old Approach (Hardcoded)

```typescript
// ❌ Hardcoded for each resource type
private extractSegmentId(request: Request): string | undefined { ... }
private extractArticleId(request: Request): string | undefined { ... }
private extractOrganizationId(request: Request): string | undefined { ... }

// ❌ Hardcoded permission check
if (segmentId) {
  return await this.canUpdateSegment(userId, segmentId);
}
if (articleId) {
  return await this.canUpdateArticle(userId, articleId);
}
// ... more if statements for each type
```

### New Approach (Generic)

```typescript
// ✅ Generic resolver pattern
const contexts = await contextResolverService.extractContexts(request, configs);

// ✅ Generic permission check
for (const [contextType, context] of contexts) {
  const hasPermission = await permissionsService.hasContextPermission(
    userId,
    permission,
    contextType,
    context.id,
  );
}
```

**Benefits:**
- ✅ Add new resource type: Just create a new resolver
- ✅ No changes to guard logic
- ✅ Consistent pattern across all resources
- ✅ Easy to test and maintain

---

## 🎓 Summary

### Key Concepts

1. **Context Resolver**: Extracts resource context from HTTP requests
2. **Context Resolver Service**: Manages and uses resolvers
3. **Generic Permission Check**: `hasContextPermission()` works with any context type
4. **Flexible Configuration**: Support explicit contexts or auto-detection

### When to Use

- ✅ **Use explicit contexts** when you know exactly which resources need permission checks
- ✅ **Use auto-detection** when context can vary or for simpler use cases
- ✅ **Create custom resolvers** when adding new resource types

### Extension Points

1. **New Context Type**: Create resolver → Register in service → Use in decorator
2. **Custom Extraction Logic**: Override `extractContext()` in resolver
3. **Multiple Contexts**: Add multiple entries to `contexts` array

---

## 🔗 Related Documentation

- [Context-Based Permissions Guide](./CONTEXT_BASED_PERMISSIONS.md) - Detailed usage guide
- [Permission System Overview](./PERMISSION_SYSTEM.md) - General permission system
- [Architecture](./ARCHITECTURE.md) - System architecture

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0

