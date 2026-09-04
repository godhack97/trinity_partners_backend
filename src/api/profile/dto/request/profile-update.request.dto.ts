import { RoleTypes } from "@app/types/RoleTypes";
import { IsRussianPhoneRu, IsStringRu } from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { IsOptional } from "class-validator";

const opts = {
  first: {
    groups: [
      RoleTypes.Employee,
      RoleTypes.Partner,
      RoleTypes.SuperAdmin,
      RoleTypes.EmployeeAdmin,
      RoleTypes.ContentManager,
    ],
  },
};

export class ProfileUpdateRequestDto {
  @ApiPropertyOptional()
  @IsOptional(opts.first)
  @Expose(opts.first)
  photo_url?: string;

  @ApiProperty()
  @Expose(opts.first)
  @IsStringRu(opts.first)
  job_title: string;

  @ApiProperty()
  @Expose(opts.first)
  @IsStringRu(opts.first)
  @IsRussianPhoneRu(opts.first)
  phone: string;

}
