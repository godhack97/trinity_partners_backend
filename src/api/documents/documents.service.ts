import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleEntity } from '@orm/entities/role.entity';
import { DocumentEntity } from '@orm/entities/document.entity';
import { DocumentGroupEntity } from '@orm/entities/document-group.entity';
import { DocumentTagEntity } from '@orm/entities/document-tag.entity';
import { DocumentAccessLevelEntity } from '@orm/entities/document-access-level.entity';
import { UserEntity } from '@orm/entities/user.entity';
import { RoleTypes } from 'src/types/RoleTypes';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  FindDocumentsQueryDto,
  CreateDocumentGroupDto,
  UpdateDocumentGroupDto,
  CreateDocumentTagDto,
  UpdateDocumentTagDto,
  CreateDocumentAccessLevelDto,
  UpdateDocumentAccessLevelDto,
} from './documents.dto';
import * as fs from 'fs';
import * as path from 'path';

const EMPLOYEE_ROLES = [
  RoleTypes.SuperAdmin,
  RoleTypes.Employee,
  RoleTypes.EmployeeAdmin,
  RoleTypes.ContentManager,
] as string[];

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepo: Repository<DocumentEntity>,

    @InjectRepository(DocumentGroupEntity)
    private groupRepo: Repository<DocumentGroupEntity>,

    @InjectRepository(DocumentTagEntity)
    private tagRepo: Repository<DocumentTagEntity>,

    @InjectRepository(DocumentAccessLevelEntity)
    private accessLevelRepo: Repository<DocumentAccessLevelEntity>,

    @InjectRepository(RoleEntity)
    private roleRepo: Repository<RoleEntity>,
  ) {}

  // ─── Groups ────────────────────────────────────────────────────────────────

  async findAllGroups(): Promise<DocumentGroupEntity[]> {
    return this.groupRepo.find({ order: { sort_order: 'ASC', name: 'ASC' } });
  }

  async createGroup(dto: CreateDocumentGroupDto): Promise<DocumentGroupEntity> {
    const group = this.groupRepo.create(dto);
    return this.groupRepo.save(group);
  }

  async updateGroup(id: number, dto: UpdateDocumentGroupDto): Promise<DocumentGroupEntity> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Группа #${id} не найдена`);
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async removeGroup(id: number): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Группа #${id} не найдена`);
    await this.groupRepo.delete(id);
  }

  // ─── Tags ──────────────────────────────────────────────────────────────────

  async findAllTags(): Promise<DocumentTagEntity[]> {
    return this.tagRepo.find({ order: { name: 'ASC' } });
  }

  async createTag(dto: CreateDocumentTagDto): Promise<DocumentTagEntity> {
    const tag = this.tagRepo.create(dto);
    return this.tagRepo.save(tag);
  }

  async updateTag(id: number, dto: UpdateDocumentTagDto): Promise<DocumentTagEntity> {
    const tag = await this.tagRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException(`Тег #${id} не найден`);
    Object.assign(tag, dto);
    return this.tagRepo.save(tag);
  }

  async removeTag(id: number): Promise<void> {
    const tag = await this.tagRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException(`Тег #${id} не найден`);
    await this.tagRepo.delete(id);
  }

  // ─── Access Levels ─────────────────────────────────────────────────────────

  async findAllAccessLevels(user?: UserEntity): Promise<DocumentAccessLevelEntity[]> {
    const all = await this.accessLevelRepo.find({ order: { id: 'ASC' }, relations: ['roles'] });
    if (!user) return all;

    const isEmployee = EMPLOYEE_ROLES.includes(user.role?.name);
    if (isEmployee) return all;

    const userRoleIds = this.getUserRoleIds(user);
    return all.filter(al => al.roles.length === 0 || al.roles.some(r => userRoleIds.includes(r.id)));
  }

  async createAccessLevel(dto: CreateDocumentAccessLevelDto): Promise<DocumentAccessLevelEntity> {
    const roles = dto.role_ids?.length
      ? await this.roleRepo.findBy({ id: In(dto.role_ids) })
      : [];
    const level = this.accessLevelRepo.create({ name: dto.name, roles });
    return this.accessLevelRepo.save(level);
  }

  async updateAccessLevel(id: number, dto: UpdateDocumentAccessLevelDto): Promise<DocumentAccessLevelEntity> {
    const level = await this.accessLevelRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!level) throw new NotFoundException(`Уровень доступа #${id} не найден`);
    if (dto.name !== undefined) level.name = dto.name;
    if (dto.role_ids !== undefined) {
      level.roles = dto.role_ids.length
        ? await this.roleRepo.findBy({ id: In(dto.role_ids) })
        : [];
    }
    return this.accessLevelRepo.save(level);
  }

  async removeAccessLevel(id: number): Promise<void> {
    const level = await this.accessLevelRepo.findOne({ where: { id } });
    if (!level) throw new NotFoundException(`Уровень доступа #${id} не найден`);
    await this.accessLevelRepo.delete(id);
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async findAll(user: UserEntity, query: FindDocumentsQueryDto): Promise<DocumentEntity[]> {
    const qb = this.documentRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.group', 'grp')
      .leftJoinAndSelect('d.access_level', 'al')
      .leftJoinAndSelect('al.roles', 'al_role')
      .leftJoinAndSelect('d.tags', 'tag');

    const isEmployee = EMPLOYEE_ROLES.includes(user.role?.name);

    if (!isEmployee) {
      const userRoleIds = this.getUserRoleIds(user);
      if (userRoleIds.length > 0) {
        // Документ доступен если: нет уровня доступа, ИЛИ у уровня нет ролей (открытый), ИЛИ хотя бы одна роль уровня совпадает с ролью пользователя
        qb.andWhere(
          `(d.access_level_id IS NULL OR (SELECT COUNT(*) FROM document_access_level_roles dalr WHERE dalr.access_level_id = al.id) = 0 OR al_role.id IN (:...userRoleIds))`,
          { userRoleIds },
        );
      } else {
        qb.andWhere(
          `(d.access_level_id IS NULL OR (SELECT COUNT(*) FROM document_access_level_roles dalr WHERE dalr.access_level_id = al.id) = 0)`,
        );
      }
    }

    if (query.groupId) {
      qb.andWhere('d.group_id = :groupId', { groupId: query.groupId });
    }

    if (query.accessLevelId) {
      qb.andWhere('d.access_level_id = :accessLevelId', { accessLevelId: query.accessLevelId });
    }

    if (query.tagIds) {
      const tagIds = Array.isArray(query.tagIds)
        ? query.tagIds.map(Number).filter(Boolean)
        : String(query.tagIds).split(',').map(Number).filter(Boolean);
      if (tagIds.length > 0) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM document_tag_relations dtr WHERE dtr.document_id = d.id AND dtr.tag_id IN (:...tagIds))`,
          { tagIds },
        );
      }
    }

    if (query.search) {
      qb.andWhere('d.name LIKE :search', { search: `%${query.search}%` });
    }

    qb.orderBy('d.uploadedAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: number): Promise<DocumentEntity> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Документ #${id} не найден`);
    return doc;
  }

  async create(dto: CreateDocumentDto, file: Express.Multer.File): Promise<DocumentEntity> {
    if (!file) throw new BadRequestException('Файл не прикреплён');
    const filePath = this.saveFile(file);

    let tags: DocumentTagEntity[] = [];
    if (dto.tag_ids && dto.tag_ids.length > 0) {
      tags = await this.tagRepo.findBy({ id: In(dto.tag_ids) });
    }

    const doc = this.documentRepo.create({
      name: dto.name,
      group_id: dto.group_id ?? null,
      access_level_id: dto.access_level_id ?? null,
      filePath,
      tags,
    });

    return this.documentRepo.save(doc);
  }

  async update(id: number, dto: UpdateDocumentDto, file?: Express.Multer.File): Promise<DocumentEntity> {
    const doc = await this.findOne(id);

    if (file) {
      this.deleteFile(doc.filePath);
      doc.filePath = this.saveFile(file);
    }

    if (dto.name !== undefined) doc.name = dto.name;
    if ('group_id' in dto) doc.group_id = dto.group_id ?? null;
    if ('access_level_id' in dto) doc.access_level_id = dto.access_level_id ?? null;

    if (dto.tag_ids !== undefined) {
      doc.tags = dto.tag_ids.length > 0
        ? await this.tagRepo.findBy({ id: In(dto.tag_ids) })
        : [];
    }

    return this.documentRepo.save(doc);
  }

  async remove(id: number): Promise<void> {
    const doc = await this.findOne(id);
    this.deleteFile(doc.filePath);
    await this.documentRepo.delete(id);
  }

  // ─── File helpers ──────────────────────────────────────────────────────────

  private saveFile(file: Express.Multer.File): string {
    const uploadDir = path.join(process.cwd(), 'upload', 'documents');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(file.originalname) || '';
    const fileName = `${Date.now()}${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), file.buffer);
    return `/upload/documents/${fileName}`;
  }

  private deleteFile(filePath: string): void {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (_) {}
  }

  private getUserRoleIds(user: UserEntity): number[] {
    const ids: number[] = [];
    if (user.role_id) ids.push(user.role_id);
    if (user.user_roles?.length > 0) {
      user.user_roles.forEach(ur => { if (ur.role_id) ids.push(ur.role_id); });
    }
    return [...new Set(ids)];
  }
}
