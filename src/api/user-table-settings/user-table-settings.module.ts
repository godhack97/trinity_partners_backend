import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserTableSettingsController } from "./user-table-settings.controller";
import { UserTableSettingsService } from "./user-table-settings.service";
import { UserTableSettingsEntity } from "../../orm/entities/user-table-settings.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserTableSettingsEntity])],
  controllers: [UserTableSettingsController],
  providers: [UserTableSettingsService],
})
export class UserTableSettingsModule {}
