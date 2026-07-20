import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { RoleEntity } from "../../orm/entities/role.entity";
import { CreateRoleRequestDto } from "./dto/request/create-role.request.dto";
import { UpdateRoleRequestDto } from "./dto/request/update-role.request.dto";
import { isSystemRoleName } from "./system-role-names";

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
  ) {}

  async create(createRoleDto: CreateRoleRequestDto): Promise<RoleEntity> {
    try {
      if (isSystemRoleName(createRoleDto.name)) {
        throw new ConflictException(
          `Имя "${createRoleDto.name}" зарезервировано системной ролью`,
        );
      }

      const existingRole = await this.roleRepository.findOne({
        where: { name: createRoleDto.name },
        withDeleted: true,
      });

      if (existingRole) {
        const action = existingRole.deleted_at ? "восстановите архивную роль" : "выберите другое имя";
        throw new ConflictException(
          `Роль с именем "${createRoleDto.name}" уже существует: ${action}`,
        );
      }

      // Создаем новую роль
      const role = this.roleRepository.create({
        name: createRoleDto.name,
        description: createRoleDto.description,
      });

      return await this.roleRepository.save(role);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Не удалось создать роль');
    }
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      where: { deleted_at: null },
      relations: ['permissions', 'users'],
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['permissions', 'users']
    });

    if (!role) {
      throw new NotFoundException(`Роль с ID ${id} не найдена`);
    }

    return role;
  }

  async findByName(name: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { name, deleted_at: null },
      relations: ['permissions']
    });

    if (!role) {
      throw new NotFoundException(`Роль "${name}" не найдена`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleRequestDto): Promise<RoleEntity> {
    const role = await this.findOne(id);

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      if (isSystemRoleName(role.name)) {
        throw new BadRequestException("Нельзя переименовать системную роль");
      }
      if (isSystemRoleName(updateRoleDto.name)) {
        throw new BadRequestException("Нельзя использовать имя системной роли");
      }

      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
        withDeleted: true,
      });

      if (existingRole) {
        throw new ConflictException(`Роль с именем "${updateRoleDto.name}" уже существует`);
      }
    }

    // Обновляем роль
    Object.assign(role, updateRoleDto);
    
    return await this.roleRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);

    if (isSystemRoleName(role.name)) {
      throw new BadRequestException(`Нельзя удалить системную роль ${role.name}`);
    }

    const usersWithRole = await this.roleRepository.findOne({
      where: { id },
      relations: ['users', 'user_roles'],
    });

    if (this.getAssignedUserIds(usersWithRole).size > 0) {
      throw new BadRequestException('Нельзя удалить роль, назначенную пользователям');
    }

    await this.roleRepository.softRemove(role);
  }

  async restore(id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: true // Включаем удаленные записи
    });

    if (!role) {
      throw new NotFoundException(`Роль с ID ${id} не найдена`);
    }

    if (!role.deleted_at) {
      throw new BadRequestException('Роль не была удалена');
    }

    await this.roleRepository.restore(id);
    return this.findOne(id);
  }

  async findDeleted(): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      where: { deleted_at: Not(IsNull()) },
      withDeleted: true,
      relations: ['permissions', 'users', 'user_roles'],
      order: { deleted_at: 'DESC' },
    });
  }

  async getUsersCount(roleId: number): Promise<number> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, deleted_at: null },
      relations: ['users', 'user_roles'],
    });

    return this.getAssignedUserIds(role).size;
  }

  async getRolesWithStats(): Promise<any[]> {
    const roles = await this.roleRepository.find({
      where: { deleted_at: null },
      relations: ['users', 'user_roles', 'permissions'],
      order: { created_at: 'DESC' }
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      created_at: role.created_at,
      updated_at: role.updated_at,
      users_count: this.getAssignedUserIds(role).size,
      permissions_count: role.permissions?.length || 0,
      permissions: role.permissions || [],
      is_system: isSystemRoleName(role.name),
    }));
  }

  async canDeleteRole(roleId: number): Promise<{ canDelete: boolean; reason?: string }> {
    const role = await this.findOne(roleId);

    // Системные роли нельзя удалять
    if (isSystemRoleName(role.name)) {
      return { 
        canDelete: false, 
        reason: 'Системную роль нельзя удалить' 
      };
    }

    // Проверяем пользователей
    const usersCount = await this.getUsersCount(roleId);
    if (usersCount > 0) {
      return { 
        canDelete: false, 
        reason: `Роль назначена ${usersCount} пользователям` 
      };
    }

    return { canDelete: true };
  }

  // Метод для создания роли с разрешениями (если нужно)
  async createWithPermissions(createRoleDto: CreateRoleRequestDto, permissionIds: number[] = []): Promise<RoleEntity> {
    const role = await this.create(createRoleDto);

    if (permissionIds.length > 0) {
      // Здесь можно добавить логику назначения разрешений
      // Это будет взаимодействовать с PermissionsService
    }

    return role;
  }

  private getAssignedUserIds(role?: RoleEntity): Set<number> {
    return new Set([
      ...(role?.users || []).map(user => user.id),
      ...(role?.user_roles || []).map(userRole => userRole.user_id),
    ]);
  }
}
