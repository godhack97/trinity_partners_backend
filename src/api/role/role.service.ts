import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RoleEntity } from "../../orm/entities/role.entity";
import { CreateRoleRequestDto } from "./dto/request/create-role.request.dto";
import { UpdateRoleRequestDto } from "./dto/request/update-role.request.dto";

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
  ) {}

  async create(createRoleDto: CreateRoleRequestDto): Promise<RoleEntity> {
    try {
      // Проверяем, не существует ли уже роль с таким именем
      const existingRole = await this.roleRepository.findOne({
        where: { name: createRoleDto.name, deleted_at: null }
      });

      if (existingRole) {
        throw new ConflictException(`Роль с именем "${createRoleDto.name}" уже существует`);
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
      relations: ['permissions'],
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

    // Если обновляется имя роли, проверяем уникальность
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name, deleted_at: null }
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

    // Проверяем, что это не системная роль
    if (role.name === 'super_admin') {
      throw new BadRequestException('Нельзя удалить системную роль super_admin');
    }

    // Проверяем, есть ли пользователи с этой ролью
    const usersWithRole = await this.roleRepository.findOne({
      where: { id },
      relations: ['users']
    });

    if (usersWithRole?.users && usersWithRole.users.length > 0) {
      throw new BadRequestException('Нельзя удалить роль, назначенную пользователям');
    }

    // Мягкое удаление
    // role.deleted_at = new Date();
    await this.roleRepository.remove(role);
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

    role.deleted_at = null;
    return await this.roleRepository.save(role);
  }

  async findDeleted(): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      where: { deleted_at: null },
      withDeleted: true,
      order: { deleted_at: 'DESC' }
    }).then(roles => roles.filter(role => role.deleted_at !== null));
  }

  async getUsersCount(roleId: number): Promise<number> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, deleted_at: null },
      relations: ['users']
    });

    return role?.users?.length || 0;
  }

  async getRolesWithStats(): Promise<any[]> {
    const roles = await this.roleRepository.find({
      where: { deleted_at: null },
      relations: ['users', 'permissions'],
      order: { created_at: 'DESC' }
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      created_at: role.created_at,
      updated_at: role.updated_at,
      users_count: role.users?.length || 0,
      permissions_count: role.permissions?.length || 0,
      is_system: ['super_admin', 'admin'].includes(role.name)
    }));
  }

  async canDeleteRole(roleId: number): Promise<{ canDelete: boolean; reason?: string }> {
    const role = await this.findOne(roleId);

    // Системные роли нельзя удалять
    if (['super_admin', 'admin'].includes(role.name)) {
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
}