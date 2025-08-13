import { CompanyEmployeesResponseDto } from "@api/company/dto/response/company-employees-response.dto";
import { NewsResponseListDto } from "@api/news/dto/news.response.dto";
import { NotificationsResponseDto } from "@api/notification/notifications.response.dto";
import { PartnerResponseDto } from "@api/partner/dto/response/PartnerResponseDto";
import { UserResponseDto } from "@api/user/dto/response/user.response.dto";
import { UserInfoDto } from "@app/dto/user-info.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class UserSettingsDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  user_id: number;

  @ApiProperty()
  @Expose()
  type: string;

  @ApiProperty()
  @Expose()
  value: string;
}

export class CompanyEmployeesWithCompanyResponseDto extends CompanyEmployeesResponseDto {
  @ApiProperty()
  @Expose()
  @Type(() => PartnerResponseDto)
  company: PartnerResponseDto;
}
export class AuthCheckResponseDto extends UserResponseDto {
  @ApiProperty()
  @Expose()
  @Type(() => CompanyEmployeesWithCompanyResponseDto)
  company_employee: CompanyEmployeesWithCompanyResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => UserInfoDto)
  user_info: UserInfoDto;

  @ApiProperty()
  @Expose()
  @Type(() => UserSettingsDto)
  user_settings: UserSettingsDto;

  @ApiProperty()
  @Expose()
  @Type(() => NotificationsResponseDto)
  notifications: NotificationsResponseDto[];

  @ApiProperty()
  @Expose()
  notifications_unread: number;

  @ApiProperty()
  @Expose()
  @Type(() => NewsResponseListDto)
  news: NewsResponseListDto[];
}
