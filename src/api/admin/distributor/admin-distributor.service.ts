import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddDistributorRequestDto } from './dto/request/add-distributor.request.dto';
import { DistributorRepository } from '@orm/repositories';

@Injectable()
export class AdminDistributorService {

  constructor(private readonly distributorRepository: DistributorRepository) {}

  async addDistributor({name}: AddDistributorRequestDto) {
    return await this.distributorRepository.save({
      name
    })
  }
  

  async updateDistributor(id: string, { name }) {
     const distributor = await this.distributorRepository.findById(+id);

     if(!distributor) {
      throw new HttpException(`Дистрибьютор с id ${id} не найден`, HttpStatus.NOT_FOUND);
     }

     const updatedDistributor = await this.distributorRepository.update(id, {
      name
    });

    if ( updatedDistributor.affected === 0) {
      throw new HttpException('Не удалось обновить дистрибьютора', HttpStatus.INTERNAL_SERVER_ERROR);
    }
      
    return {
      message: `Дистрибьютор с id ${id} был успешно обновлен`,
      succes: true,
    };  
  }

  async deleteDistributor(id: string) {
     const distributor = await this.distributorRepository.findById(+id);

     if(!distributor) {
      throw new HttpException(`Дистрибьютор с id ${id} не найден`, HttpStatus.NOT_FOUND);
     }

     const deletedDistributor = await this.distributorRepository.update(id, {
      deleted_at: new Date()
    });

    if ( deletedDistributor.affected === 0) {
      throw new HttpException('Не удалось удалить дистрибьютора', HttpStatus.INTERNAL_SERVER_ERROR);
    }
      
    return {
      message: `Дистрибьютор с id ${id} был успешно удален`,
      succes: true,
    };  
  }

}
