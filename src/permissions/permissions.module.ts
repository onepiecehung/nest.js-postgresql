import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from 'src/shared/services';
import { Role } from './entities/role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { AuthPermissionService, UserPermissionService } from './services';

/**
 * Permissions module providing Discord-style permission system
 * Handles roles, user-role assignments, and permission calculations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, UserPermission]),
    CacheModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, UserPermissionService, AuthPermissionService],
  exports: [PermissionsService, UserPermissionService, AuthPermissionService],
})
export class PermissionsModule {}
