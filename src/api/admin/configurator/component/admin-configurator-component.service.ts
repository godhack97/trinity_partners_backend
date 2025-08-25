import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CnfComponentRepository, CnfComponentTypeRepository, CnfSlotRepository } from "@orm/repositories";
import { CreateConfigurationComponentRequestDto } from "./dto/request/create-configurator-component.request.dto";
import { CnfComponentEntity, CnfComponentSlotEntity } from "@orm/entities";
import * as entities from "src/orm/entities";


interface ExcelRow {
  ID?: string;
  'Название': string;
  'Подтип': string;
  'Цена': number;
  'Тип компонента'?: string;
  'Поколение сервера'?: string;
  'Поколение процессора'?: string;
  'Слот[1]'?: string;
  'Количество[1]'?: number;
  'Увеличение[1]'?: boolean;
  'Слот[2]'?: string;
  'Количество[2]'?: number;
  'Увеличение[2]'?: boolean;
  'Слот[3]'?: string;
  'Количество[3]'?: number;
  'Увеличение[3]'?: boolean;
  'Слот[4]'?: string;
  'Количество[4]'?: number;
  'Увеличение[4]'?: boolean;
  'Слот[5]'?: string;
  'Количество[5]'?: number;
  'Увеличение[5]'?: boolean;
}

@Injectable()
export class AdminConfiguratorComponentService {
  constructor(
    private readonly cnfComponentRepository: CnfComponentRepository,
    private readonly cnfComponentTypeRepository: CnfComponentTypeRepository,
    private readonly cnfSlotRepository: CnfSlotRepository,
    @InjectRepository(entities.CnfProcessorGeneration)
    private readonly cnfProcessorGenerationRepo: Repository<entities.CnfProcessorGeneration>,
    @InjectRepository(entities.CnfServerGeneration)
    private readonly cnfServerGenerationRepo: Repository<entities.CnfServerGeneration>,
    @InjectRepository(entities.CnfComponentBackup)
    private cnfComponentBackupRepository: Repository<entities.CnfComponentBackup>,
    @InjectRepository(entities.CnfComponentBackupData)
    private cnfComponentBackupDataRepository: Repository<entities.CnfComponentBackupData>,

  ) {}

  async createBackup(name: string, createdBy?: string) {
    try {
      // Получаем все компоненты со слотами
      const components = await this.cnfComponentRepository
        .createQueryBuilder('component')
        .leftJoinAndSelect('component.slots', 'slot')
        .leftJoinAndSelect('slot.slot', 'slotInfo') // если есть связь со слотом
        .getMany();
  
      // Получаем все поколения для маппинга ID в имена
      const allServerGenerations = await this.cnfServerGenerationRepo.find();
      const allProcessorGenerations = await this.cnfProcessorGenerationRepo.find();
      
      const serverGenerationsById = new Map(allServerGenerations.map(gen => [gen.id, gen.name]));
      const processorGenerationsById = new Map(allProcessorGenerations.map(gen => [gen.id, gen.name]));
  
      // Создаем запись бекапа
      const backup = this.cnfComponentBackupRepository.create({
        name,
        created_by: createdBy,
        components_count: components.length
      });
  
      const savedBackup = await this.cnfComponentBackupRepository.save(backup);
  
      // Сохраняем данные компонентов в JSON
      const backupData = this.cnfComponentBackupDataRepository.create({
        backup_id: savedBackup.id,
        component_data: {
          components: components.map(component => ({
            ...component,
            server_generation_name: component.server_generation_id 
              ? serverGenerationsById.get(component.server_generation_id) 
              : null,
            processor_generation_name: component.processor_generation_id 
              ? processorGenerationsById.get(component.processor_generation_id) 
              : null
          }))
        }
      });
  
      await this.cnfComponentBackupDataRepository.save(backupData);
  
      return {
        id: savedBackup.id,
        name: savedBackup.name,
        created_at: savedBackup.created_at,
        components_count: savedBackup.components_count
      };
    } catch (error) {
      throw new Error(`Ошибка создания бекапа: ${error.message}`);
    }
  }

  async getBackups() {
    try {
      const backups = await this.cnfComponentBackupRepository
        .createQueryBuilder('backup')
        .orderBy('backup.created_at', 'DESC')
        .getMany();
  
      return backups.map(backup => ({
        id: backup.id,
        name: backup.name,
        created_at: backup.created_at,
        components_count: backup.components_count
      }));
    } catch (error) {
      throw new Error(`Ошибка получения бекапов: ${error.message}`);
    }
  }


  async restoreFromBackup(backupId: string) {
    const queryRunner = this.cnfComponentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  
    try {
      // Проверяем существование бекапа
      const backup = await this.cnfComponentBackupRepository.findOne({ 
        where: { id: backupId } 
      });
      
      if (!backup) {
        throw new Error('Бекап не найден');
      }
  
      // Получаем данные бекапа
      const backupData = await this.cnfComponentBackupDataRepository.findOne({
        where: { backup_id: backupId }
      });
  
      if (!backupData) {
        throw new Error('Данные бекапа не найдены');
      }
  
      // Очищаем текущие данные
      await queryRunner.manager.delete(entities.CnfComponentSlotEntity, {});
      await queryRunner.manager.delete(entities.CnfComponentEntity, {});
  
      // Восстанавливаем компоненты
      const { components } = backupData.component_data;
      
      for (const componentData of components) {
        const { slots, server_generation_name, processor_generation_name, ...componentFields } = componentData;
        
        // Находим поколения по именам
        let serverGenerationId = null;
        let processorGenerationId = null;
        
        if (server_generation_name) {
          const serverGeneration = await this.cnfServerGenerationRepo.findOne({
            where: { name: server_generation_name }
          });
          serverGenerationId = serverGeneration?.id || null;
        }
        
        if (processor_generation_name) {
          const processorGeneration = await this.cnfProcessorGenerationRepo.findOne({
            where: { name: processor_generation_name }
          });
          processorGenerationId = processorGeneration?.id || null;
        }
  
        // Преобразуем даты в Date объекты
        const componentToRestore = {
          ...componentFields,
          server_generation_id: serverGenerationId,
          processor_generation_id: processorGenerationId,
          created_at: componentFields.created_at ? new Date(componentFields.created_at) : new Date(),
          updated_at: componentFields.updated_at ? new Date(componentFields.updated_at) : new Date()
        };
  
        // Создаем компонент с оригинальным ID
        const newComponent = queryRunner.manager.create(entities.CnfComponentEntity, componentToRestore);
  
        // Сохраняем компонент (TypeORM правильно обработает даты)
        const savedComponent = await queryRunner.manager.save(entities.CnfComponentEntity, newComponent);
  
        // Восстанавливаем слоты с оригинальными ID
        if (slots && slots.length > 0) {
          for (const slotData of slots) {
            const slotToRestore = {
              ...slotData,
              component_id: savedComponent.id,
              created_at: slotData.created_at ? new Date(slotData.created_at) : new Date(),
              updated_at: slotData.updated_at ? new Date(slotData.updated_at) : new Date()
            };
  
            const newSlot = queryRunner.manager.create(entities.CnfComponentSlotEntity, slotToRestore);
            await queryRunner.manager.save(entities.CnfComponentSlotEntity, newSlot);
          }
        }
      }
  
      await queryRunner.commitTransaction();
  
      return {
        success: true,
        message: `Успешно восстановлено ${components.length} компонентов из бекапа "${backup.name}" с оригинальными ID`
      };
  
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Ошибка восстановления бекапа: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
  
  async deleteBackup(backupId: string) {
    try {
      const backup = await this.cnfComponentBackupRepository.findOne({
        where: { id: backupId }
      });
  
      if (!backup) {
        throw new Error('Бекап не найден');
      }
  
      // Удаляем данные бекапа (CASCADE удалит связанные записи)
      await this.cnfComponentBackupRepository.delete(backupId);
      await this.cnfComponentBackupDataRepository.delete({ backup_id: backupId });
  
      return { success: true };
    } catch (error) {
      throw new Error(`Ошибка удаления бекапа: ${error.message}`);
    }
  }
  

  async exportExcel() {
    const components = await this.cnfComponentRepository.find({
      relations: ["slots", "slots.slot"],
    });

    // Получаем все типы компонентов, поколения серверов и процессоров
    const allTypes = await this.cnfComponentTypeRepository.find();
    const allServerGenerations = await this.cnfServerGenerationRepo.find();
    const allProcessorGenerations = await this.cnfProcessorGenerationRepo.find();

    const typesById = new Map(allTypes.map(type => [type.id, type]));
    const serverGenerationsById = new Map(allServerGenerations.map(gen => [gen.id, gen]));
    const processorGenerationsById = new Map(allProcessorGenerations.map(gen => [gen.id, gen]));

    return components.map((component) => {
      const result: any = {
        'ID': component.id,
        'Название': component.name,
        'Подтип': component.subtype || 'Не указано',
        'Цена': component.price || 0,
        'Тип компонента': component.type_id || '',
        'Поколение сервера': component.server_generation_id 
          ? serverGenerationsById.get(component.server_generation_id)?.name || ''
          : '',
        'Поколение процессора': component.processor_generation_id 
          ? processorGenerationsById.get(component.processor_generation_id)?.name || ''
          : '',
      };

      // Добавляем до 5 слотов
      for (let i = 1; i <= 5; i++) {
        const slot = component.slots?.[i - 1];
        if (slot?.slot?.name) {
          // Если слот есть - заполняем все поля
          result[`Слот[${i}]`] = slot.slot.name;
          result[`Количество[${i}]`] = slot.amount || 1;
          result[`Увеличение[${i}]`] = slot.increase ? 'Да' : 'Нет';
        } else {
          // Если слота нет - оставляем поля пустыми
          result[`Слот[${i}]`] = '';
          result[`Количество[${i}]`] = '';
          result[`Увеличение[${i}]`] = '';
        }
      }

      return result;
    });
  }

  async importExcel(excelData: any[], userId?: string) {

    try {
      const backupName = `Авто-бекап перед импортом ${new Date().toLocaleString('ru-RU')}`;
      await this.createBackup(backupName, userId);
      console.log('Автоматический бекап создан:', backupName);
    } catch (error) {
      console.error('Ошибка создания автобекапа:', error);
      // Не останавливаем импорт, только логируем ошибку
    }

    console.log('Starting Excel import. Total rows:', excelData.length);
    console.log('First few rows:', excelData.slice(0, 3));

    const errors: string[] = [];
    const validatedData: any[] = [];

    // Получаем все типы, слоты и поколения для валидации
    const allTypes = await this.cnfComponentTypeRepository.find();
    const allSlots = await this.cnfSlotRepository.find();
    const allServerGenerations = await this.cnfServerGenerationRepo.find();
    const allProcessorGenerations = await this.cnfProcessorGenerationRepo.find();

    console.log('Available types count:', allTypes.length);
    console.log('Available slots count:', allSlots.length);
    console.log('Available server generations count:', allServerGenerations.length);
    console.log('Available processor generations count:', allProcessorGenerations.length);

    const typesByName = new Map(allTypes.map(type => [type.name, type]));
    const slotsByName = new Map(allSlots.map(slot => [slot.name, slot]));
    const serverGenerationsByName = new Map(allServerGenerations.map(gen => [gen.name, gen]));
    const processorGenerationsByName = new Map(allProcessorGenerations.map(gen => [gen.name, gen]));

    console.log('Slot names:', Array.from(slotsByName.keys()));
    console.log('Server generation names:', Array.from(serverGenerationsByName.keys()));
    console.log('Processor generation names:', Array.from(processorGenerationsByName.keys()));

    // Валидация всех строк
    for (let rowIndex = 0; rowIndex < excelData.length; rowIndex++) {
      const row = excelData[rowIndex] as ExcelRow;
      const rowNum = rowIndex + 2; // +2 так как в Excel нумерация с 1 и есть заголовок

      console.log(`Processing row ${rowNum}:`, {
        ID: row.ID,
        Название: row['Название'],
        Подтип: row['Подтип'],
        Цена: row['Цена'],
        'Поколение сервера': row['Поколение сервера'],
        'Поколение процессора': row['Поколение процессора']
      });

      // Пропускаем пустые строки
      if (!row || Object.keys(row).length === 0 || !row['Название']) {
        console.log(`Skipping empty row ${rowNum}`);
        continue;
      }

      // Валидация обязательных полей
      if (!row['Название']?.toString()?.trim()) {
        errors.push(`Строка ${rowNum}: Поле "Название" обязательно для заполнения`);
        console.log(`Row ${rowNum}: Missing name`);
        continue;
      }

      // Валидация подтипа - разрешаем "Не указано"
      if (!row['Подтип']?.toString()?.trim()) {
        errors.push(`Строка ${rowNum}: Поле "Подтип" обязательно для заполнения`);
        console.log(`Row ${rowNum}: Missing subtype`);
        continue;
      }

      // Валидация цены
      if (row['Цена'] === undefined || row['Цена'] === null) {
        errors.push(`Строка ${rowNum}: Поле "Цена" обязательно для заполнения`);
        console.log(`Row ${rowNum}: Missing price`);
        continue;
      }

      const price = Number(row['Цена']);
      if (isNaN(price) || price < 0) {
        errors.push(`Строка ${rowNum}: Поле "Цена" должно быть положительным числом`);
        console.log(`Row ${rowNum}: Invalid price:`, row['Цена']);
        continue;
      }

      // Валидация поколения сервера (необязательное поле)
      let serverGenerationId = null;
      const serverGenerationName = row['Поколение сервера']?.toString()?.trim();
      if (serverGenerationName) {
        if (!serverGenerationsByName.has(serverGenerationName)) {
          errors.push(`Строка ${rowNum}: Поколение сервера "${serverGenerationName}" не найдено`);
          console.log(`Row ${rowNum}: Server generation "${serverGenerationName}" not found`);
          continue;
        }
        serverGenerationId = serverGenerationsByName.get(serverGenerationName)!.id;
      }

      // Валидация поколения процессора (необязательное поле)
      let processorGenerationId = null;
      const processorGenerationName = row['Поколение процессора']?.toString()?.trim();
      if (processorGenerationName) {
        if (!processorGenerationsByName.has(processorGenerationName)) {
          errors.push(`Строка ${rowNum}: Поколение процессора "${processorGenerationName}" не найдено`);
          console.log(`Row ${rowNum}: Processor generation "${processorGenerationName}" not found`);
          continue;
        }
        processorGenerationId = processorGenerationsByName.get(processorGenerationName)!.id;
      }

      const validatedSlots: any[] = [];

      // Валидация слотов
      for (let i = 1; i <= 5; i++) {
        const slotName = row[`Слот[${i}]` as keyof ExcelRow]?.toString()?.trim();
        const amount = row[`Количество[${i}]` as keyof ExcelRow];
        const increase = row[`Увеличение[${i}]` as keyof ExcelRow];

        if (slotName) {
          console.log(`Row ${rowNum}, Slot ${i}:`, { slotName, amount, increase });

          // Проверяем существование слота
          if (!slotsByName.has(slotName)) {
            errors.push(`Строка ${rowNum}, колонка "Слот[${i}]": Слот "${slotName}" не найден`);
            console.log(`Row ${rowNum}: Slot "${slotName}" not found`);
            continue;
          }

          // Валидация amount - обязательно при указании слота
          if (amount === undefined || amount === null || amount === '') {
            errors.push(`Строка ${rowNum}, колонка "Количество[${i}]": Поле обязательно при указании слота`);
            console.log(`Row ${rowNum}: Missing amount for slot ${i}`);
            continue;
          }

          // Валидация increase - обязательно при указании слота
          if (increase === undefined || increase === null || increase === '') {
            errors.push(`Строка ${rowNum}, колонка "Увеличение[${i}]": Поле обязательно при указании слота`);
            console.log(`Row ${rowNum}: Missing increase for slot ${i}`);
            continue;
          }

          const numericAmount = Number(amount);
          if (isNaN(numericAmount) || numericAmount < 0) {
            errors.push(`Строка ${rowNum}, колонка "Количество[${i}]": Значение должно быть положительным числом`);
            console.log(`Row ${rowNum}: Invalid amount for slot ${i}:`, amount);
            continue;
          }

          // Обрабатываем "Да"/"Нет" для increase
          const boolIncrease = increase === 'Да' || increase === true || increase === 1;

          validatedSlots.push({
            slot_id: slotsByName.get(slotName)!.id,
            amount: numericAmount,
            increase: boolIncrease,
          });
        }
      }

      // Формируем данные для компонента
      const componentData: any = {
        name: row['Название'].toString().trim(),
        subtype: row['Подтип'].toString().trim() === 'Не указано' ? null : row['Подтип'].toString().trim(),
        price: Number(row['Цена']),
        type_id: row['Тип компонента']?.toString()?.trim() || null,
        server_generation_id: serverGenerationId,
        processor_generation_id: processorGenerationId,
        slots: validatedSlots,
      };

      // Добавляем ID только если он есть и не пустой
      const rawId = row.ID?.toString()?.trim();
      if (rawId) {
        componentData.id = rawId;
      }

      console.log(`Validated component data for row ${rowNum}:`, componentData);
      validatedData.push(componentData);
    }

    console.log('Validation completed. Errors:', errors.length);
    console.log('Valid components:', validatedData.length);

    // Если есть ошибки, не выполняем импорт
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      throw new HttpException(
        `Ошибки валидации:\n${errors.join('\n')}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Выполняем импорт
    let importedCount = 0;
    for (const componentData of validatedData) {
      try {
        if (componentData.id) {
          console.log(`Updating existing component: ${componentData.id}`);
          await this.updateExistingComponent(componentData);
        } else {
          console.log(`Creating new component: ${componentData.name}`);
          await this.createNewComponent(componentData);
        }
        importedCount++;
      } catch (error) {
        console.error(`Error processing component ${componentData.name}:`, error);
        errors.push(`Ошибка при обработке компонента "${componentData.name}": ${error.message}`);
      }
    }

    console.log(`Import completed. Processed ${importedCount} components.`);

    if (errors.length > 0) {
      throw new HttpException(
        `Ошибки при импорте:\n${errors.join('\n')}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private async updateExistingComponent(componentData: any) {
    console.log(`Updating component with ID: ${componentData.id}`);
    
    const existingComponent = await this.cnfComponentRepository.findOne({
      where: { id: componentData.id },
      relations: ["slots"],
    });

    if (!existingComponent) {
      console.log(`Component with ID ${componentData.id} not found, skipping update`);
      return;
    }

    console.log(`Found existing component: ${existingComponent.name}`);

    // Проверяем есть ли изменения
    const hasChanges = 
      existingComponent.name !== componentData.name ||
      (existingComponent.subtype || null) !== (componentData.subtype || null) ||
      existingComponent.price !== componentData.price ||
      existingComponent.type_id !== componentData.type_id ||
      existingComponent.server_generation_id !== componentData.server_generation_id ||
      existingComponent.processor_generation_id !== componentData.processor_generation_id ||
      this.hasSlotChanges(existingComponent.slots, componentData.slots);

    console.log(`Component has changes: ${hasChanges}`);

    if (hasChanges) {
      try {
        existingComponent.name = componentData.name;
        existingComponent.subtype = componentData.subtype;
        existingComponent.price = componentData.price;
        existingComponent.type_id = componentData.type_id;
        existingComponent.server_generation_id = componentData.server_generation_id;
        existingComponent.processor_generation_id = componentData.processor_generation_id;

        // Удаляем старые slots
        console.log(`Deleting old slots for component ${componentData.id}`);
        await this.cnfComponentRepository
          .createQueryBuilder()
          .delete()
          .from(CnfComponentSlotEntity)
          .where('component_id = :id', { id: componentData.id })
          .execute();

        // Сохраняем компонент без слотов
        console.log(`Saving updated component ${componentData.id}`);
        await this.cnfComponentRepository.save(existingComponent);

        // Создаем новые slots с правильным component_id
        if (componentData.slots && componentData.slots.length > 0) {
          console.log(`Creating ${componentData.slots.length} new slots`);
          
          for (const slotData of componentData.slots) {
            const newSlot = CnfComponentSlotEntity.init({
              ...slotData,
              component_id: componentData.id,
            });
            console.log(`Saving slot:`, newSlot);
            await this.cnfComponentRepository.manager.save(CnfComponentSlotEntity, newSlot);
          }
        }

        console.log(`Successfully updated component ${componentData.id}`);
      } catch (error) {
        console.error(`Error updating component ${componentData.id}:`, error);
        throw error;
      }
    } else {
      console.log(`No changes detected for component ${componentData.id}, skipping update`);
    }
  }

  private async createNewComponent(componentData: any) {
    console.log(`Creating new component: ${componentData.name}`);
    
    try {
      // Исключаем slots из данных для создания компонента
      const { slots, ...componentOnlyData } = componentData;
      
      console.log(`Component data:`, componentOnlyData);
      
      // Создаем новый компонент без слотов
      const newComponent = CnfComponentEntity.init(componentOnlyData);
      console.log(`Initialized component entity:`, newComponent);
      
      const savedComponent = await this.cnfComponentRepository.save(newComponent);
      console.log(`Saved component with ID: ${savedComponent.id}`);

      // Создаем слоты после сохранения компонента
      if (slots && slots.length > 0) {
        console.log(`Creating ${slots.length} slots for component ${savedComponent.id}`);
        
        for (const slotData of slots) {
          const newSlot = CnfComponentSlotEntity.init({
            ...slotData,
            component_id: savedComponent.id,
          });
          console.log(`Saving slot:`, newSlot);
          await this.cnfComponentRepository.manager.save(CnfComponentSlotEntity, newSlot);
        }
        
        console.log(`Successfully created all slots for component ${savedComponent.id}`);
      } else {
        console.log(`No slots to create for component ${savedComponent.id}`);
      }

      console.log(`Successfully created component ${savedComponent.id}: ${savedComponent.name}`);
    } catch (error) {
      console.error(`Error creating component ${componentData.name}:`, error);
      throw error;
    }
  }

  private hasSlotChanges(existingSlots: CnfComponentSlotEntity[], newSlots: any[]): boolean {
    if (existingSlots.length !== newSlots.length) {
      return true;
    }

    const existingSlotsData = existingSlots.map(slot => ({
      slot_id: slot.slot_id,
      amount: slot.amount,
      increase: slot.increase,
    }));

    const newSlotsData = newSlots.map(slot => ({
      slot_id: slot.slot_id,
      amount: slot.amount,
      increase: slot.increase,
    }));

    return JSON.stringify(existingSlotsData.sort()) !== JSON.stringify(newSlotsData.sort());
  }

  async createComponent(data: CreateConfigurationComponentRequestDto) {
    const component = CnfComponentEntity.init(data);
    return this.createOrUpdate(component, data);
  }

  async updateComponent(
    id: string,
    data: Partial<CreateConfigurationComponentRequestDto>,
  ) {
    const component = await this.cnfComponentRepository.findOneByOrFail({ id });
    component.update(data);
    return this.createOrUpdate(component, data);
  }

  async createOrUpdate(
    component: CnfComponentEntity,
    data: Partial<CreateConfigurationComponentRequestDto>,
  ) {
    // Сначала сохраняем компонент без слотов
    const savedComponent = await this.cnfComponentRepository.save(component);

    // Затем обрабатываем слоты, если они есть
    if (data.slots?.length > 0) {
      const slots = data.slots.map((item: Partial<CnfComponentSlotEntity>) => {
        return CnfComponentSlotEntity.init({
          ...item,
          component_id: savedComponent.id,
        });
      });

      // Сохраняем слоты по одному
      for (const slot of slots) {
        await this.cnfComponentRepository.manager.save(CnfComponentSlotEntity, slot);
      }
    }

    return await this.cnfComponentRepository.findOne({
      where: { id: savedComponent.id },
      relations: ["slots"],
    });
  }

  async deleteComponent(id: string) {
    return await this.cnfComponentRepository.delete(id);
  }
}