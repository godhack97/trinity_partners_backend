import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddProcessorGenerationRequestDto } from './dto/request/add-processor-generation.request.dto';
import { CnfProcessorGenerationRepository } from '@orm/repositories';

@Injectable()
export class AdminConfiguratorProcessorGenerationService {
  constructor(private readonly cnfProcessorGenerationRepository: CnfProcessorGenerationRepository,
  ) {}

  async addProcessorGeneration({ name }: AddProcessorGenerationRequestDto) {
    const processorGeneration = await this.cnfProcessorGenerationRepository.findOneBy({ name });

    if (processorGeneration) {
      throw new HttpException(`Поколение процессора ${name} уже существует`, HttpStatus.I_AM_A_TEAPOT);
    }

    return await this.cnfProcessorGenerationRepository.save({ name })
  }


  async updateProcessorGeneration(id: string, { name }: AddProcessorGenerationRequestDto) {
    const processorGeneration = await this.cnfProcessorGenerationRepository.findOneBy({id});

    if(!processorGeneration) {
      throw new HttpException(`Поколение процессора ${id} не найдено`, HttpStatus.NOT_FOUND);
    }

    const processorGenerationName = await this.cnfProcessorGenerationRepository.findOneBy({ name });

    if (processorGenerationName) {
      throw new HttpException(`Поколение процессора ${name} уже существует`, HttpStatus.CONFLICT);
    }

    const updatedProcessorGeneration =  await this.cnfProcessorGenerationRepository.update(id, {
      name
    });

    if (updatedProcessorGeneration.affected === 0) {
      throw new HttpException('Не удалось обновить поколение процессора', HttpStatus.INTERNAL_SERVER_ERROR);
    }
      
    return {
      message: `Поколение процессора с id ${id} было успешно обновлено`,
      succes: true,
    };  
  }

  async removeProcessorGeneration(id: string) {
    const removedProcessorGeneration =  await this.cnfProcessorGenerationRepository.delete(id);

    if (removedProcessorGeneration.affected === 0) {
      throw new HttpException('Не удалось удалить поколение процессора', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    throw new HttpException('', HttpStatus.NO_CONTENT);
  }
}
