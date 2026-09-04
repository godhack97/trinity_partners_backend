import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmailRu } from "@decorators/validate";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class UpdateUserRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmailRu()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email_confirmed?: boolean;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  manager_id?: number;
}
