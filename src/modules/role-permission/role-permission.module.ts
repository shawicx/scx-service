import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../permission/entities/permission.entity';
import { Role } from '../role/entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { RolePermissionService } from './role-permission.service';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermission, Role, Permission])],
  providers: [RolePermissionService],
  exports: [RolePermissionService],
})
export class RolePermissionModule {}
