import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import {
  ContextConfig,
  IContextResolver,
  PermissionContext,
} from '../interfaces/context-resolver.interface';
import {
  ArticleContextResolver,
  OrganizationContextResolver,
  SegmentContextResolver,
} from '../resolvers';

/**
 * Service for managing and using context resolvers
 * Provides a unified interface for extracting context from requests
 */
@Injectable()
export class ContextResolverService {
  private readonly logger = new Logger(ContextResolverService.name);
  private readonly resolvers: Map<string, IContextResolver> = new Map();

  constructor(
    private readonly segmentResolver: SegmentContextResolver,
    private readonly organizationResolver: OrganizationContextResolver,
    private readonly articleResolver: ArticleContextResolver,
  ) {
    // Register default resolvers
    this.registerResolver(segmentResolver);
    this.registerResolver(organizationResolver);
    this.registerResolver(articleResolver);
  }

  /**
   * Register a new context resolver
   * @param resolver - Context resolver to register
   */
  registerResolver(resolver: IContextResolver): void {
    const contextType = resolver.getContextType();
    this.resolvers.set(contextType, resolver);
    this.logger.log(`Registered context resolver for type: ${contextType}`);
  }

  /**
   * Get resolver for a specific context type
   * @param contextType - Type of context (e.g., 'segment', 'article')
   * @returns Resolver instance or undefined if not found
   */
  getResolver(contextType: string): IContextResolver | undefined {
    return this.resolvers.get(contextType);
  }

  /**
   * Extract context from request based on configuration
   * @param request - Express request object
   * @param config - Context configuration
   * @returns PermissionContext if found, undefined otherwise
   */
  async extractContext(
    request: Request,
    config: ContextConfig,
  ): Promise<PermissionContext | undefined> {
    const resolver = this.getResolver(config.type);

    if (!resolver) {
      this.logger.warn(`No resolver found for context type: ${config.type}`);
      return undefined;
    }

    // Check if resolver can handle this request
    if (!resolver.canHandle(request)) {
      if (config.required) {
        this.logger.warn(
          `Required context type ${config.type} could not be extracted from request`,
        );
      }
      return undefined;
    }

    try {
      const context = await resolver.extractContext(request, config.options);

      if (!context && config.required) {
        this.logger.warn(
          `Required context type ${config.type} was not found in request`,
        );
      }

      return context;
    } catch (error) {
      this.logger.error(`Error extracting context type ${config.type}:`, error);
      return undefined;
    }
  }

  /**
   * Extract multiple contexts from request
   * @param request - Express request object
   * @param configs - Array of context configurations
   * @returns Map of context type to PermissionContext
   */
  async extractContexts(
    request: Request,
    configs: ContextConfig[],
  ): Promise<Map<string, PermissionContext>> {
    const contexts = new Map<string, PermissionContext>();

    const extractPromises = configs.map(async (config) => {
      const context = await this.extractContext(request, config);
      if (context) {
        contexts.set(config.type, context);
      }
    });

    await Promise.all(extractPromises);

    return contexts;
  }

  /**
   * Auto-detect context from request
   * Tries all registered resolvers and returns the first match
   * @param request - Express request object
   * @returns PermissionContext if detected, undefined otherwise
   */
  async autoDetectContext(
    request: Request,
  ): Promise<PermissionContext | undefined> {
    // Try resolvers in order of priority
    const priorityOrder = ['segment', 'article', 'organization'];

    for (const contextType of priorityOrder) {
      const resolver = this.getResolver(contextType);
      if (resolver && resolver.canHandle(request)) {
        const context = await resolver.extractContext(request);
        if (context) {
          return context;
        }
      }
    }

    // Try all other resolvers
    for (const [contextType, resolver] of this.resolvers.entries()) {
      if (!priorityOrder.includes(contextType)) {
        if (resolver.canHandle(request)) {
          const context = await resolver.extractContext(request);
          if (context) {
            return context;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Get all registered context types
   * @returns Array of context type strings
   */
  getRegisteredContextTypes(): string[] {
    return Array.from(this.resolvers.keys());
  }
}
