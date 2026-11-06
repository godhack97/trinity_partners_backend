import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class AddDealParticipantDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  user_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  participant_role?: string;
}
