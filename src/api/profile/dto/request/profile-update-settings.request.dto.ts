import { IsEnumRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import {
    UserNotificationType,
    UserThemeType
} from "@orm/entities";
import { Expose } from "class-transformer";
import { IsOptional } from "class-validator";

export class ProfileUpdateSettingsRequestDto {
    @ApiProperty()
    @Expose()
    @IsEnumRu(UserNotificationType)
    @IsOptional()
    notifications_web?: "true" | "false";

    @ApiProperty()
    @Expose()
    @IsEnumRu(UserNotificationType)
    @IsOptional()
    notifications_email?: "true" | "false";

    @ApiProperty()
    @Expose()
    @IsEnumRu(UserThemeType)
    @IsOptional()
    theme?: string;
}