import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  IContextResolver,
  PermissionContext,
} from '../interfaces/context-resolver.interface';

/**
 * Context resolver for article resources
 * Extracts articleId from request params, body, or query
 * Example for future use when implementing article-specific permissions
 */
@Injectable()
export class ArticleContextResolver implements IContextResolver {
  getContextType(): string {
    return 'article';
  }

  canHandle(request: Request): boolean {
    // Check if URL path suggests article context
    const url = request.url.toLowerCase();
    return (
      url.includes('/articles/') ||
      url.includes('/article/') ||
      request.params.articleId !== undefined ||
      request.body?.articleId !== undefined ||
      request.query.articleId !== undefined
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
    let articleId: string | undefined;

    // 1. Check URL parameters (most common)
    if (params[paramName] && this.isArticleContext(request.url)) {
      articleId = params[paramName];
    } else if (params.articleId) {
      articleId = params.articleId;
    }

    // 2. Check request body
    if (!articleId && body) {
      if (this.isValidString(body.articleId)) {
        articleId = body.articleId;
      } else if (body.article && typeof body.article === 'object') {
        const article = body.article as Record<string, unknown>;
        if (this.isValidString(article.id)) {
          articleId = article.id;
        }
      }
    }

    // 3. Check query parameters
    if (!articleId && this.isValidString(query.articleId)) {
      articleId = query.articleId;
    }

    if (!articleId) {
      return undefined;
    }

    return {
      type: 'article',
      id: articleId,
      metadata: {
        paramName,
        source: this.getSource(params, body, query, articleId),
      },
    };
  }

  /**
   * Check if URL path suggests article context
   */
  private isArticleContext(url: string): boolean {
    return url.includes('/articles/') || url.includes('/article/');
  }

  /**
   * Determine source of articleId
   */
  private getSource(
    params: Record<string, string>,
    body: Record<string, unknown>,
    query: Record<string, string>,
    articleId: string,
  ): string {
    if (params.articleId === articleId || params.id === articleId) {
      return 'params';
    }
    if (body.articleId === articleId) {
      return 'body';
    }
    if (query.articleId === articleId) {
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
