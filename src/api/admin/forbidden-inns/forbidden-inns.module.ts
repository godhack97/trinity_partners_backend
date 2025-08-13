import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ForbiddenInnRepository } from "src/orm/repositories/forbidden-inn.repository";
import { ForbiddenInnService } from "./forbidden-inns.service";
import { ForbiddenInnController } from "./forbidden-inns.controller";
import { ForbiddenInn } from "src/orm/entities/forbidden-inn.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ForbiddenInn])],
  controllers: [ForbiddenInnController],
  providers: [ForbiddenInnService, ForbiddenInnRepository],
  exports: [ForbiddenInnService],
})
export class ForbiddenInnModule {}
