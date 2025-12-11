import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from 'src/shared/services';
import { Role } from './entities/role.entity';
import { ScopePermission } from './entities/scope-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionHealthCheckService } from './monitoring/health-check.service';
import { PermissionMetricsService } from './monitoring/permission-metrics.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import {
  ArticleContextResolver,
  OrganizationContextResolver,
  SegmentContextResolver,
} from './resolvers';
import { AuthPermissionService, UserPermissionService } from './services';
import { ContextResolverService } from './services/context-resolver.service';
import { PermissionEvaluator } from './services/permission-evaluator.service';
import { PermissionRegistry } from './services/permission-registry.service';
import { ScopePermissionService } from './services/scope-permission.service';

/**
 * Permissions module providing Discord-style permission system
 * Handles roles, user-role assignments, and permission calculations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, UserPermission, ScopePermission]),
    CacheModule,
  ],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    UserPermissionService,
    AuthPermissionService,
    ContextResolverService,
    SegmentContextResolver,
    OrganizationContextResolver,
    ArticleContextResolver,
    PermissionRegistry,
    PermissionEvaluator,
    ScopePermissionService,
    PermissionMetricsService,
    PermissionHealthCheckService,
  ],
  exports: [
    PermissionsService,
    UserPermissionService,
    AuthPermissionService,
    ContextResolverService,
    PermissionRegistry,
    PermissionEvaluator,
    ScopePermissionService,
    PermissionMetricsService,
    PermissionHealthCheckService,
  ],
})
export class PermissionsModule {}
