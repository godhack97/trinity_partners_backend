import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../../orm/entities/permission.entity';
import { RoleEntity } from '../../../orm/entities/role.entity';
import { In } from "typeorm";
import { ASSIGNABLE_PERMISSION_NAMES } from "@app/access/admin-section-permissions";
import { RoleTypes } from "@app/types/RoleTypes";

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
  ) {}

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { name: In(ASSIGNABLE_PERMISSION_NAMES) },
      order: { resource_type: 'ASC', resource_name: 'ASC', action: 'ASC', display_name: 'ASC' }
    });
  }

  async findRoleWithPermissions(roleId: number): Promise<RoleEntity> {
    return this.roleRepository.findOne({
      where: { id: roleId, deleted_at: null },
      relations: ['permissions']
    });
  }

  async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, deleted_at: null },
      relations: ['permissions']
    });

    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    const permissions = await this.permissionRepository.findByIds(permissionIds);
    role.permissions = [...role.permissions, ...permissions];
    
    await this.roleRepository.save(role);
  }

  async removePermissionsFromRole(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, deleted_at: null },
      relations: ['permissions']
    });

    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    role.permissions = role.permissions.filter(
      permission => !permissionIds.includes(permission.id)
    );
    
    await this.roleRepository.save(role);
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, deleted_at: null },
      relations: ['permissions']
    });

    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    if (role.name === RoleTypes.SuperAdmin) {
      throw new BadRequestException(
        "Права супер-администратора нельзя ограничить",
      );
    }

    const uniquePermissionIds = [...new Set(permissionIds || [])];
    const permissions = uniquePermissionIds.length
      ? await this.permissionRepository.find({
          where: {
            id: In(uniquePermissionIds),
            name: In(ASSIGNABLE_PERMISSION_NAMES),
          },
        })
      : [];
    if (permissions.length !== uniquePermissionIds.length) {
      throw new BadRequestException(
        "Передан неизвестный или недоступный для назначения доступ",
      );
    }
    const assignableNames = new Set(ASSIGNABLE_PERMISSION_NAMES);
    const preservedPermissions = role.permissions.filter(
      (permission) => !assignableNames.has(permission.name),
    );
    role.permissions = [...preservedPermissions, ...permissions];
    
    await this.roleRepository.save(role);
  }

  async createPermission(data: Partial<Permission>): Promise<Permission> {
    const permission = this.permissionRepository.create(data);
    return this.permissionRepository.save(permission);
  }

  async getPermissionsByResourceType(resourceType: 'api' | 'menu' | 'system'): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { resource_type: resourceType },
      order: { resource_name: 'ASC', action: 'ASC' }
    });
  }
}
