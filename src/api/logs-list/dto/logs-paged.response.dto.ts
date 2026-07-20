import { ApiProperty } from "@nestjs/swagger";

export class UserActionUserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;
}

export class UserActionListResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  user_id: number | null;

  @ApiProperty({ type: UserActionUserResponseDto, nullable: true })
  user: UserActionUserResponseDto | null;

  @ApiProperty()
  action: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  details: Record<string, unknown>;

  @ApiProperty({ format: "date-time" })
  created_at: Date;

  @ApiProperty()
  actionLabel: string;

  @ApiProperty({ nullable: true })
  entityName: string | null;
}

export class LogsPagedResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  skip: number;

  @ApiProperty()
  take: number;

  @ApiProperty({ type: [UserActionListResponseDto] })
  logs: UserActionListResponseDto[];
}
