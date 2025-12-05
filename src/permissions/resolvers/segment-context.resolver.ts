import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  IContextResolver,
  PermissionContext,
} from '../interfaces/context-resolver.interface';

/**
 * Context resolver for segment resources
 * Extracts segmentId from request params, body, or query
 */
@Injectable()
export class SegmentContextResolver implements IContextResolver {
  getContextType(): string {
    return 'segment';
  }

  canHandle(request: Request): boolean {
    // Check if URL path suggests segment context
    const url = request.url.toLowerCase();
    return (
      url.includes('/segments/') ||
      url.includes('/segment/') ||
      request.params.segmentId !== undefined ||
      request.body?.segmentId !== undefined ||
      request.query.segmentId !== undefined
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

    // Priority: URL params > body > query
    let segmentId: string | undefined;

    // 1. Check URL parameters (most common)
    if (params[paramName] && this.isSegmentContext(request.url)) {
      segmentId = params[paramName];
    } else if (params.segmentId) {
      segmentId = params.segmentId;
    }

    // 2. Check request body
    if (!segmentId && body) {
      if (this.isValidString(body.segmentId)) {
        segmentId = body.segmentId;
      } else if (body.segment && typeof body.segment === 'object') {
        const segment = body.segment as Record<string, unknown>;
        if (this.isValidString(segment.id)) {
          segmentId = segment.id;
        }
      }
    }

    // 3. Check query parameters
    if (!segmentId && this.isValidString(query.segmentId)) {
      segmentId = query.segmentId;
    }

    if (!segmentId) {
      return undefined;
    }

    return {
      type: 'segment',
      id: segmentId,
      metadata: {
        paramName,
        source: this.getSource(params, body, query, segmentId),
      },
    };
  }

  /**
   * Check if URL path suggests segment context
   */
  private isSegmentContext(url: string): boolean {
    return url.includes('/segments/') || url.includes('/segment/');
  }

  /**
   * Determine source of segmentId
   */
  private getSource(
    params: Record<string, string>,
    body: Record<string, unknown>,
    query: Record<string, string>,
    segmentId: string,
  ): string {
    if (params.segmentId === segmentId || params.id === segmentId) {
      return 'params';
    }
    if (body.segmentId === segmentId) {
      return 'body';
    }
    if (query.segmentId === segmentId) {
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
