import { ProfileUpdateEmailRequestDto } from "@api/profile/dto/request/profile-update-email.request.dto";
import { ProfileUpdateSettingsRequestDto } from "@api/profile/dto/request/profile-update-settings.request.dto";
import { ProfileUpdateRequestDto } from "@api/profile/dto/request/profile-update.request.dto";
import { ProfileService } from "@api/profile/profile.service";
import { ProfileUpdatePasswordRequestDto } from "@api/profile/dto/request/profile-update-password.request.dto";
import { ValidationException } from "@app/filters/validation.exception";
import { AuthUser } from "@decorators/auth-user";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Post,
    Req,
    UseInterceptors,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiResponse,
    ApiTags
} from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { LogAction } from 'src/logs/log-action.decorator';

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
    @LogAction('profile_update', 'users')
    @UseInterceptors(new TransformResponse(ProfileUpdateRequestDto))
    @ApiResponse({ type: ProfileUpdateRequestDto })
    async update(@Req() req: Request, @AuthUser() auth_user: Partial<UserEntity>) {
        const groups = { groups: [auth_user.role.name]}
        const data = plainToInstance(ProfileUpdateRequestDto, req.body, groups);

        try {
            await validateOrReject(data, groups);
        } catch (e) {
            if (e.length > 0) throw new ValidationException(e)
        }

        return this.profileService.update(auth_user, data)
    }

    @Post('/settings')
    @ApiBearerAuth()
    @LogAction('profile_update_settings', 'users')
    @UseInterceptors(new TransformResponse(ProfileUpdateSettingsRequestDto))
    @ApiResponse({ type: ProfileUpdateSettingsRequestDto })
    updateNotifications(@Body() data: ProfileUpdateSettingsRequestDto, @AuthUser() auth_user: Partial<UserEntity>) {
        return this.profileService.updateSettings(auth_user, data)
    }

    @Post('/updateEmail')
    @LogAction('profile_update_email', 'users')
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
    @LogAction('profile_update_password', 'users')
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

    @Get('/notifications')
    async notifications(@AuthUser() auth_user: Partial<UserEntity>) {
        return await this.profileService.getNotifications(auth_user.id);
    }
}