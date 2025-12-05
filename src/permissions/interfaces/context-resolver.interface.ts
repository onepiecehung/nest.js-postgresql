import { Request } from 'express';

/**
 * Context information extracted from request
 * Contains resource ID and type for permission checking
 */
export interface PermissionContext {
  /** Type of context (e.g., 'segment', 'article', 'organization') */
  type: string;
  /** ID of the resource (e.g., segmentId, articleId, organizationId) */
  id: string;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Context resolver interface
 * Each resolver handles extraction of a specific context type from HTTP requests
 */
export interface IContextResolver {
  /**
   * Get the context type this resolver handles
   * @returns Context type identifier (e.g., 'segment', 'article')
   */
  getContextType(): string;

  /**
   * Extract context from HTTP request
   * @param request - Express request object
   * @param options - Optional resolver-specific options
   * @returns PermissionContext if found, undefined otherwise
   */
  extractContext(
    request: Request,
    options?: Record<string, unknown>,
  ): Promise<PermissionContext | undefined> | PermissionContext | undefined;

  /**
   * Check if this resolver can handle the given request
   * Used for resolver selection when multiple resolvers might match
   * @param request - Express request object
   * @returns true if this resolver can handle the request
   */
  canHandle(request: Request): boolean;
}

/**
 * Context configuration for permission checks
 * Defines which contexts should be extracted and checked
 */
export interface ContextConfig {
  /** Context type to extract (e.g., 'segment', 'article') */
  type: string;
  /** Parameter name to extract from (e.g., 'id', 'segmentId', 'articleId') */
  paramName?: string;
  /** Whether context is required (default: false) */
  required?: boolean;
  /** Additional resolver options */
  options?: Record<string, unknown>;
}

/**
 * Permission check result with context information
 */
export interface PermissionCheckResult {
  /** Whether permission check passed */
  allowed: boolean;
  /** Context used for permission check */
  context?: PermissionContext;
  /** Reason for denial (if not allowed) */
  reason?: string;
}
