import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class AddDealMessageDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  text?: string;

  @ApiPropertyOptional({ type: "array", items: { type: "object" } })
  @IsOptional()
  @IsArray()
  attachments?: unknown[];
}

export class MarkDealChannelReadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  message_id?: number;
}
