import { ProfileUpdateEmailRequestDto } from "@api/profile/dto/request/profile-update-email.request.dto";
import { ProfileUpdateSettingsRequestDto } from "@api/profile/dto/request/profile-update-settings.request.dto";
import { ProfileUpdateRequestDto } from "@api/profile/dto/request/profile-update.request.dto";
import { ProfileService } from "@api/profile/profile.service";
import { ProfileUpdatePasswordRequestDto } from "@api/profile/dto/request/profile-update-password.request.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import { AuthUser } from "@decorators/auth-user";
import { Roles } from "@decorators/Roles";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Post,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiResponse,
    ApiTags
} from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get()
    @ApiBearerAuth()
    get(@AuthUser() auth_user: Partial<UserEntity>) {
        return this.profileService.getProfile(auth_user)
    }

    @Post()
    @ApiBearerAuth()
    @UseInterceptors(new TransformResponse(ProfileUpdateRequestDto))
    @ApiResponse({ type: ProfileUpdateRequestDto })
    update(@Body() data: ProfileUpdateRequestDto, @AuthUser() auth_user: Partial<UserEntity>) {
        return this.profileService.update(auth_user, data)
    }

    @Post('/settings')
    @ApiBearerAuth()
    @UseInterceptors(new TransformResponse(ProfileUpdateSettingsRequestDto))
    @ApiResponse({ type: ProfileUpdateSettingsRequestDto })
    updateNotifications(@Body() data: ProfileUpdateSettingsRequestDto, @AuthUser() auth_user: Partial<UserEntity>) {
        return this.profileService.updateSettings(auth_user, data)
    }

    @Post('/updateEmail')
    @UseInterceptors(new TransformResponse(ProfileUpdateEmailRequestDto))
    @ApiResponse({ type: ProfileUpdateEmailRequestDto })
    async updateEmail(@AuthUser() auth_user: Partial<UserEntity>, @Body() data: ProfileUpdateEmailRequestDto) {
        try {
            return await this.profileService.updateEmail(auth_user.id, data);
        } catch (error) {
            throw new HttpException({
                status: HttpStatus.FORBIDDEN,
                error: error.message,
            }, HttpStatus.FORBIDDEN);
        }
    }

    @Post('/updatePassword')
    @UseInterceptors(new TransformResponse(ProfileUpdatePasswordRequestDto))
    @ApiResponse({ type: ProfileUpdatePasswordRequestDto })
    async updatePassword(@AuthUser() auth_user: Partial<UserEntity>, @Body() data: ProfileUpdatePasswordRequestDto) {
        try {
            return await this.profileService.updatePassword(auth_user.id, data);
        } catch (error) {
            throw new HttpException({
                status: HttpStatus.FORBIDDEN,
                error: error.message,
            }, HttpStatus.FORBIDDEN);
        }
    }
}