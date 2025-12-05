import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EffectivePermissions } from './constants/permissions.constants';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { EffectivePermissionsDto } from './dto/effective-permissions.dto';
import { GrantSegmentPermissionDto } from './dto/grant-segment-permission.dto';
import { RevokeSegmentPermissionDto } from './dto/revoke-segment-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsService } from './permissions.service';

/**
 * Permissions controller providing REST API endpoints for Discord-style permission system
 * Handles role management, user-role assignments, and permission calculations
 */
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ==================== ROLE ENDPOINTS ====================

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.permissionsService.createRole(dto);
  }

  @Get('roles')
  async getAllRoles(): Promise<Role[]> {
    return this.permissionsService.getAllRoles();
  }

  @Get('roles/:id')
  async getRole(@Param('id') id: string): Promise<Role> {
    return this.permissionsService.findById(id);
  }

  @Patch('roles/:id')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.permissionsService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string): Promise<void> {
    return this.permissionsService.remove(id);
  }

  // ==================== USER-ROLE ENDPOINTS ====================

  @Post('users/roles')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(@Body() dto: AssignRoleDto): Promise<UserRole> {
    return this.permissionsService.assignRole(dto);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    return this.permissionsService.removeRole(userId, roleId);
  }

  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId') userId: string): Promise<UserRole[]> {
    return this.permissionsService.getUserRoles(userId);
  }

  @Get('roles/:roleId/users')
  async getUsersWithRole(@Param('roleId') roleId: string): Promise<UserRole[]> {
    return this.permissionsService.getUsersWithRole(roleId);
  }

  // ==================== PERMISSION CALCULATION ENDPOINTS ====================

  @Get('effective')
  async computeEffectivePermissions(
    @Query() dto: EffectivePermissionsDto,
  ): Promise<EffectivePermissions> {
    return this.permissionsService.computeEffectivePermissions(dto);
  }

  // ==================== SEGMENT PERMISSIONS ENDPOINTS ====================

  @Post('segments/permissions')
  @HttpCode(HttpStatus.CREATED)
  async grantSegmentPermission(
    @Body() dto: GrantSegmentPermissionDto,
  ): Promise<UserPermission> {
    return this.permissionsService.grantSegmentPermission(dto);
  }

  @Delete('segments/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSegmentPermission(
    @Body() dto: RevokeSegmentPermissionDto,
  ): Promise<void> {
    return this.permissionsService.revokeSegmentPermission(dto);
  }

  @Get('users/:userId/segments/permissions')
  async getUserSegmentPermissions(
    @Param('userId') userId: string,
  ): Promise<UserPermission[]> {
    return this.permissionsService.getUserSegmentPermissions(userId);
  }

  @Get('segments/:segmentId/permissions')
  async getUsersWithSegmentPermission(
    @Param('segmentId') segmentId: string,
    @Query('permission') permission?: 'SEGMENTS_UPDATE' | 'SEGMENTS_CREATE',
  ): Promise<UserPermission[]> {
    return this.permissionsService.getUsersWithSegmentPermission(
      segmentId,
      permission,
    );
  }

  // ==================== UTILITY ENDPOINTS ====================
  // Note: Default roles are now created automatically when creating an organization
  // This endpoint has been removed as roles must be associated with an organization
}
