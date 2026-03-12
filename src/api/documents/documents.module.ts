import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from '@orm/entities/document.entity';
import { DocumentGroupEntity } from '@orm/entities/document-group.entity';
import { DocumentTagEntity } from '@orm/entities/document-tag.entity';
import { DocumentAccessLevelEntity } from '@orm/entities/document-access-level.entity';
import { RoleEntity } from '@orm/entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentEntity,
      DocumentGroupEntity,
      DocumentTagEntity,
      DocumentAccessLevelEntity,
      RoleEntity,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
