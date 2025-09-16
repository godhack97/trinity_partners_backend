import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CnfServerboxHeightRepository } from "../../../../orm/repositories";
import { QueryFailedError } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class AdminConfiguratorServerHeightService {
  constructor(
    private readonly cnfServerboxHeightRepository: CnfServerboxHeightRepository,
  ) {}

  async addServerHeight({ name }) {
    const serverHeight = await this.cnfServerboxHeightRepository.findOneBy({
      name,
    });

    if (serverHeight)
      throw new HttpException(
        `Высота сервера ${name} уже существует`,
        HttpStatus.I_AM_A_TEAPOT,
      );

    return await this.cnfServerboxHeightRepository.save({
      name,
    });
  }

  async updateServerHeight(id: string, { name }) {
    const serverHeight = await this.cnfServerboxHeightRepository.findOneBy({
      id,
    });
  
    if (!serverHeight)
      throw new HttpException(
        `Высота сервера ${id} не найдена`,
        HttpStatus.NOT_FOUND,
      );
  
    try {
      return await this.cnfServerboxHeightRepository.update(id, {
        name,
      });
    } catch (error) {
      if (error instanceof QueryFailedError && error.message.includes('Data too long for column')) {
        throw new BadRequestException('Название слишком длинное');
      }
      throw error;
    }
  }

  async deleteServerHeight(id: string) {
    try {
      return await this.cnfServerboxHeightRepository.delete(id);
    } catch (error) {
      if (error instanceof QueryFailedError && error.message.includes('foreign key constraint fails')) {
        throw new BadRequestException('Невозможно удалить: запись используется серверами');
      }
      throw error;
    }
  }
}
