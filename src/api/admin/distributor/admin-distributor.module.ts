import { Module } from "@nestjs/common";
import { AdminDistributorService } from "./admin-distributor.service";
import { AdminDistributorController } from "./admin-distributor.controller";

@Module({
  controllers: [AdminDistributorController],
  providers: [AdminDistributorService],
})
export class AdminDistributorModule {}
