import { RoleTypes } from "@app/types/RoleTypes";
import { IsNotEmptyRu, IsNumberRu, IsStringRu } from "@decorators/validate";
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
  second: { groups: [RoleTypes.Partner] },
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
  phone: string;

  @ApiProperty()
  @Expose(opts.second)
  @IsStringRu(opts.second)
  company_business_line: string; //направления деятельности

  @ApiProperty()
  @Expose(opts.second)
  @IsNotEmptyRu(opts.second)
  @IsNumberRu({}, opts.second)
  employees_count: number;

  @ApiProperty()
  @Expose(opts.second)
  @IsStringRu(opts.second)
  site_url: string;

  @ApiProperty()
  @Expose(opts.second)
  @IsStringRu(opts.second)
  promoted_products: string;

  @ApiProperty()
  @Expose(opts.second)
  @IsStringRu(opts.second)
  products_of_interest: string;

  @ApiProperty()
  @Expose(opts.second)
  @IsStringRu(opts.second)
  main_customers: string;
}
