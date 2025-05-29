import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTableSettingsEntity } from '../../orm/entities/user-table-settings.entity';

@Injectable()
export class UserTableSettingsService {
  constructor(
    @InjectRepository(UserTableSettingsEntity)
    private readonly userSettingsRepository: Repository<UserTableSettingsEntity>,
  ) {}

  async findByUserAndTable(userId: number, tableId: string): Promise<UserTableSettingsEntity | undefined> {
    console.log(`Поиск: userId=${userId}, tableId=${tableId}`);
    const result = await this.userSettingsRepository.findOne({ where: { userId, tableId } });
    // console.log('Результат поиска:', result);
    return result;
  }

  async save(settings: UserTableSettingsEntity): Promise<UserTableSettingsEntity> {
    try {
      return await this.userSettingsRepository.save(settings);
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      throw error;
    }
  }
}