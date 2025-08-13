import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CnfServerboxHeightRepository } from "../../../../orm/repositories";

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

    return await this.cnfServerboxHeightRepository.update(id, {
      name,
    });
  }

  async deleteServerHeight(id: string) {
    return await this.cnfServerboxHeightRepository.delete(id);
  }
}
