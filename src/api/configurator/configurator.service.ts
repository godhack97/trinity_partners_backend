import { Injectable } from '@nestjs/common';
import { CnfMultislotRepository, CnfProcessorGenerationRepository, CnfServerGenerationRepository } from '@orm/repositories';
import { CnfComponentTypeRepository } from 'src/orm/repositories/cnf/cnf-component-type.repository';
import { CnfComponentRepository } from 'src/orm/repositories/cnf/cnf-component.repository';
import { CnfServerSlotRepository } from 'src/orm/repositories/cnf/cnf-server-slot.repository';
import { CnfServerRepository } from 'src/orm/repositories/cnf/cnf-server.repository';
import { CnfServerboxHeightRepository } from 'src/orm/repositories/cnf/cnf-serverbox-height.repository';
import { CnfSlotRepository } from 'src/orm/repositories/cnf/cnf-slot.repository';
import { SearchComponentsDto } from './dto/request/search-components.request.dto';

@Injectable()
export class ConfiguratorService {
  constructor(
    private readonly cnfServerRepository: CnfServerRepository,
    private readonly cnfComponentRepository: CnfComponentRepository,
    private readonly cnfComponentTypeRepository: CnfComponentTypeRepository,
    private readonly cnfServerboxHeightRepository: CnfServerboxHeightRepository,
    private readonly cnfSlotRepository: CnfSlotRepository,
    private readonly cnfMultislotRepository: CnfMultislotRepository,
    private readonly cnfServerGenerationRepository: CnfServerGenerationRepository,
    private readonly cnfProcessorGenerationRepository: CnfProcessorGenerationRepository
  ) {}

  // Методы для подсчета
  async getServerboxCount(): Promise<number> {
    return await this.cnfServerboxHeightRepository.count();
  }

  async getSlotsCount(): Promise<number> {
    return await this.cnfSlotRepository.count();
  }

  async getServerGenerationsCount(): Promise<number> {
    return await this.cnfServerGenerationRepository.count();
  }

  async getServersCount(): Promise<number> {
    return await this.cnfServerRepository.count();
  }

  async getProcessorGenerationsCount(): Promise<number> {
    return await this.cnfProcessorGenerationRepository.count();
  }

  async getComponentsCount(): Promise<number> {
    return await this.cnfComponentRepository.count();
  }

  // Существующие методы
  async serverHeight() {
    return this.cnfServerboxHeightRepository.find()
  }

  async serverGeneration() {
    return await this.cnfServerGenerationRepository.find();
  }

  async processorGeneration() {
    return await this.cnfProcessorGenerationRepository.find();
  }
  
  async getSlots() {
    return await this.cnfSlotRepository.find();
  }

  async getSlotsAndMultislots() {

    const slots = await this.cnfSlotRepository.find();
    const multislots = await this.cnfMultislotRepository.find();

    return [ 

      ...slots, 
      ...multislots.map( el => ({ ...el, isMultiSlot: true  }) ) 

    ];

  }

  async getServers() {
    
    const data = await this.cnfServerRepository.createQueryBuilder('srv')
      .leftJoinAndMapMany(
        "srv.serverbox_height",
        "cnf_serverbox_height",
        "sbh",
        "sbh.id = srv.serverbox_height_id"
      )
      .leftJoinAndMapMany(
        "srv.multislots",
        "cnf_server_multislots",
        "csm",
        "csm.server_id = srv.id"
      )
      .leftJoinAndMapMany(
        "csm.multislot_slots",
        "cnf_multislot_slots",
        "cms",
        "cms.multislot_id = csm.multislot_id",
      )
      .leftJoinAndMapMany(
        "csm.slots",
        "cnf_slots",
        "mcs",
        "cms.slot_id = mcs.id",
      )
      .leftJoinAndMapMany(
        "srv.server_slots",
        "cnf_server_slots",
        "cssr",
        "cssr.server_id = srv.id",
      )
      .leftJoinAndMapMany(
        "cssr.slots",
        "cnf_slots",
        "css",
        "cssr.slot_id = css.id",
      )
      .orderBy('srv.sort', 'ASC')
      .getMany();

    function transformData( data = [] ) {

      const result = [];

      for ( const server of data ) {

        if ( !server?.multislots ) { continue; }

        const slots = [];
        const multislots = [];

        for ( const multislot of server.multislots ) {

          const slotIds = [];
          const slotNames = [];

          multislot.slots.forEach(( slot ) => {
            
            slotIds.push( slot.id ) 
            slotNames.push( slot.name )
          
          })

          multislots.push({

            ...multislot,
            slotIds,
            slotNames: slotNames.join('/'),
            onBackPanel: multislot.on_back_panel,
            on_back_panel: undefined,
            multislot_slots: undefined,
            created_at: undefined,
            updated_at: undefined,
            server_id: undefined,


          })

        }


        for ( const el of server.server_slots ) {

          slots.push({

            amount: el.amount,
            onBackPanel: el.on_back_panel,
            slotId: el.slots[ 0 ].id,
            typeId: el.slots[ 0 ]?.type_id,
            name: el.slots[ 0 ].name

          });

        }

        result.push({

          ...server,
          serverboxHeightId: server.serverbox_height_id,
          serverboxHeightName: server.serverbox_height[ 0 ].name,
          serverbox_height: undefined,
          multislots,
          slots

        })

      }

      return result;

    }

    return transformData( data );
    
  }

  async getComponents( entry?: SearchComponentsDto ) {
    const queryBuilder = this.cnfComponentRepository.createQueryBuilder('cmp')
      .leftJoinAndMapMany(
        "cmp.component_slots",
        "cnf_component_slots",
        "cms",
        "cms.component_id = cmp.id"
      )
      .leftJoinAndMapMany(
        "cms.slots",
        "cnf_slots",
        "cs",
        "cms.slot_id = cs.id",
      );

    if ( entry?.componentType ) {

      queryBuilder.andWhere("cmp.type_id = :componentType", { componentType: entry.componentType });

    }

    const data = await queryBuilder.getMany();

    function transformData( data = [] ) {

      const result = [];

      for ( const component of data ) {

        const slots = [];

        for ( const el of component.component_slots ) {

          slots.push({
            
            slot_id: el.slot_id,
            slotId: el.slot_id,
            amount: el.amount,
            increase: el.increase,
            name: el.slots[ 0 ].name

          });

        }

        result.push({

          ...component,
          typeId: component.type_id,
          slots

        })

      }

      return result;

    }

    return transformData( data );

  }

  async getComponentTypes() {
    return await this.cnfComponentTypeRepository.find();
  }

  async getComponent(id: string) {
    return await this.cnfComponentRepository.findOne({
      where: {id},
      relations: ["slots"]
    });
  }
}