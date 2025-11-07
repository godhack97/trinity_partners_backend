import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DownloadCentrController } from './download-centr.controller';
import { DownloadCentrService } from './download-centr.service';
import { DownloadCentr } from './download-centr.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DownloadCentr])],
  controllers: [DownloadCentrController],
  providers: [DownloadCentrService],
  exports: [DownloadCentrService],
})
export class DownloadCentrModule {}