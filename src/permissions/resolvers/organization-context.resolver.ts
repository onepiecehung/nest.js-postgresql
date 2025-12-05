import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  IContextResolver,
  PermissionContext,
} from '../interfaces/context-resolver.interface';

/**
 * Context resolver for organization resources
 * Extracts organizationId from request params, body, or query
 */
@Injectable()
export class OrganizationContextResolver implements IContextResolver {
  getContextType(): string {
    return 'organization';
  }

  canHandle(request: Request): boolean {
    // Check if URL path suggests organization context
    const url = request.url.toLowerCase();
    return (
      url.includes('/organizations/') ||
      url.includes('/org/') ||
      request.params.organizationId !== undefined ||
      request.body?.organizationId !== undefined ||
      request.query.organizationId !== undefined
    );
  }

  extractContext(
    request: Request,
    options?: Record<string, unknown>,
  ): PermissionContext | undefined {
    const paramName = (options?.paramName as string) || 'organizationId';
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown>;
    const query = request.query as Record<string, string>;

    // Priority: URL params > body > query
    let organizationId: string | undefined;

    // 1. Check URL parameters (most common)
    if (params[paramName]) {
      organizationId = params[paramName];
    } else if (params.organizationId) {
      organizationId = params.organizationId;
    } else if (params.id && this.isOrganizationContext(request.url)) {
      organizationId = params.id;
    }

    // 2. Check request body
    if (!organizationId && body) {
      if (this.isValidString(body.organizationId)) {
        organizationId = body.organizationId;
      } else if (body.organization && typeof body.organization === 'object') {
        const org = body.organization as Record<string, unknown>;
        if (this.isValidString(org.id)) {
          organizationId = org.id;
        }
      }
    }

    // 3. Check query parameters
    if (!organizationId && this.isValidString(query.organizationId)) {
      organizationId = query.organizationId;
    }

    if (!organizationId) {
      return undefined;
    }

    return {
      type: 'organization',
      id: organizationId,
      metadata: {
        paramName,
        source: this.getSource(params, body, query, organizationId),
      },
    };
  }

  /**
   * Check if URL path suggests organization context
   */
  private isOrganizationContext(url: string): boolean {
    return url.includes('/organizations/') || url.includes('/org/');
  }

  /**
   * Determine source of organizationId
   */
  private getSource(
    params: Record<string, string>,
    body: Record<string, unknown>,
    query: Record<string, string>,
    organizationId: string,
  ): string {
    if (
      params.organizationId === organizationId ||
      params.id === organizationId
    ) {
      return 'params';
    }
    if (body.organizationId === organizationId) {
      return 'body';
    }
    if (query.organizationId === organizationId) {
      return 'query';
    }
    return 'unknown';
  }

  /**
   * Validate if value is a non-empty string
   */
  private isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
