import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddServerGenerationRequestDto } from './dto/request/add-server-generation.request.dto';
import { CnfServerGenerationRepository } from '@orm/repositories';

@Injectable()
export class AdminConfiguratorServerGenerationService {

  constructor(private readonly cnfServerGenerationRepository: CnfServerGenerationRepository,
  ) {}

  async addServerGeneration({ name }: AddServerGenerationRequestDto) {
    const serverGeneration = await this.cnfServerGenerationRepository.findOneBy({ name });

    if (serverGeneration) {
      throw new HttpException(`Поколение сервера ${name} уже существует`, HttpStatus.I_AM_A_TEAPOT);
    }

    return await this.cnfServerGenerationRepository.save({ name })
  }


  async updateServerGeneration(id: string, { name }: AddServerGenerationRequestDto) {
    const serverGeneration = await this.cnfServerGenerationRepository.findOneBy({id});

    if(!serverGeneration) {
      throw new HttpException(`Поколение сервера ${id} не найдено`, HttpStatus.NOT_FOUND);
    }

    const serverGenerationName = await this.cnfServerGenerationRepository.findOneBy({ name });

    if (serverGenerationName) {
      throw new HttpException(`Поколение сервера ${name} уже существует`, HttpStatus.CONFLICT);
    }

    const updatedServerGeneration =  await this.cnfServerGenerationRepository.update(id, {
      name
    });

    if (updatedServerGeneration.affected === 0) {
      throw new HttpException('Не удалось обновить поколение сервера', HttpStatus.INTERNAL_SERVER_ERROR);
    }
      
    return {
      message: `Поколение сервера с id ${id} было успешно обновлено`,
      succes: true,
    };  
  }

  async removeServerGeneration(id: string) {
    const removedServerGeneration =  await this.cnfServerGenerationRepository.delete(id);

    if (removedServerGeneration.affected === 0) {
      throw new HttpException('Не удалось удалить поколение сервера', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    throw new HttpException('', HttpStatus.NO_CONTENT);
  }
}
