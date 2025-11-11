import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { DownloadCentr } from './download-centr.entity';
import { CreateDownloadCentrDto, UpdateDownloadCentrDto } from './download-centr.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DownloadCentrService {
  constructor(
    @InjectRepository(DownloadCentr)
    private downloadCentrRepository: Repository<DownloadCentr>,
  ) { }

  async update(
    id: number,
    updateDto: UpdateDownloadCentrDto,
    file?: Express.Multer.File,
  ): Promise<DownloadCentr> {
    const existingFile = await this.findOne(id);

    if (file) {
      const oldFilePath = path.join(process.cwd(), existingFile.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      const uploadDir = path.join(process.cwd(), 'upload', 'centr');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, file.buffer);

      existingFile.filePath = `/upload/centr/${fileName}`;
    }

    if (updateDto.name !== undefined) {
      existingFile.name = updateDto.name;
    }

    if (updateDto.description !== undefined) {
      existingFile.description = updateDto.description;
    }

    if (updateDto.tags !== undefined) {
      existingFile.tags = updateDto.tags;
    }

    return await this.downloadCentrRepository.save(existingFile);
  }

  async create(
    createDto: CreateDownloadCentrDto,
    file: Express.Multer.File,
  ): Promise<DownloadCentr> {
    const uploadDir = path.join(process.cwd(), 'upload', 'centr');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const downloadCentr = this.downloadCentrRepository.create({
      ...createDto,
      filePath: `/upload/centr/${fileName}`,
    });

    return await this.downloadCentrRepository.save(downloadCentr);
  }

  async findAll(search?: string, tags?: string): Promise<DownloadCentr[]> {
    const queryBuilder = this.downloadCentrRepository.createQueryBuilder('dc');

    if (search) {
      queryBuilder.where(
        '(dc.name LIKE :search OR dc.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      tagArray.forEach((tag, index) => {
        const paramName = `tag${index}`;
        if (index === 0) {
          queryBuilder.andWhere(`dc.tags LIKE :${paramName}`, { [paramName]: `%${tag}%` });
        } else {
          queryBuilder.orWhere(`dc.tags LIKE :${paramName}`, { [paramName]: `%${tag}%` });
        }
      });
    }

    queryBuilder.orderBy('dc.uploaded_at', 'DESC');

    return await queryBuilder.getMany();
  }

  async findOne(id: number): Promise<DownloadCentr> {
    const item = await this.downloadCentrRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }
    return item;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);

    const fullPath = path.join(process.cwd(), item.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await this.downloadCentrRepository.delete(id);
  }

  async getAllTags(): Promise<string[]> {
    const items = await this.downloadCentrRepository.find();
    const tagsSet = new Set<string>();

    items.forEach(item => {
      if (item.tags) {
        item.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tagsSet.add(trimmedTag);
          }
        });
      }
    });

    return Array.from(tagsSet).sort();
  }
}