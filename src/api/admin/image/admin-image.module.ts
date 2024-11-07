import { Module } from "@nestjs/common";
import { AdminImageController } from "@api/admin/image/admin-image.controller";
import { AdminImageService } from "@api/admin/image/admin-image.service";

@Module({
  imports: [],
  controllers: [AdminImageController],
  providers: [AdminImageService],
  exports: [AdminImageService],
})
export class AdminImageModule {}