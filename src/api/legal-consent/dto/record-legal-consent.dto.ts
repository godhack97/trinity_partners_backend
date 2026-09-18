import { LegalPolicyType } from "@orm/entities";
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, Matches } from "class-validator";

export class RecordLegalConsentDto {
  @ApiProperty({ enum: LegalPolicyType })
  @IsEnum(LegalPolicyType)
  policy_type: LegalPolicyType;

  @ApiProperty({ example: "2026-09-17" })
  @IsString()
  @Matches(/^[A-Za-z0-9._-]{1,64}$/)
  policy_version: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

