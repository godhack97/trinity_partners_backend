import { Module } from "@nestjs/common";
import { AdminConfiguratorComponentController } from "./admin-configurator-component.controller";
import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";
import { XlsxService } from './xlsx.service';
import { CnfComponentBackup, CnfComponentBackupData } from '@orm/entities';
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CnfComponentBackup,
      CnfComponentBackupData,
    ]),
  ],
  controllers: [AdminConfiguratorComponentController],
  providers: [AdminConfiguratorComponentService, XlsxService],
  exports: [AdminConfiguratorComponentService],
})

export class AdminConfiguratorComponentModule {}
