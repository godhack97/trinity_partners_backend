import { Module } from "@nestjs/common";
import { ProfileController } from "@api/profile/profile.controller";
import { ProfileService } from "@api/profile/profile.service";

@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
