import { ApiProperty } from "@nestjs/swagger";

export enum ShareRecipientType {
  CompanyEmployee = "company_employee",
  ResponsibleManager = "responsible_manager",
  TechnicalSpecialist = "technical_specialist",
}

export class ShareRecipientResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  job_title?: string | null;

  @ApiProperty({ enum: ShareRecipientType })
  recipient_type: ShareRecipientType;
}
