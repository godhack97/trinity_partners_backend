import { ProfileUpdateRequestDto } from "@api/profile/dto/request/profile-update.request.dto";
import { ProfileService } from "@api/profile/profile.service";
import { UpdateUserRequestDto } from "@api/user/dto/request/update-user.request.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import { AuthUser } from "@decorators/auth-user";
import { Roles } from "@decorators/Roles";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import {
    Body,
    Controller,
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

    @Post()
    @ApiBearerAuth()
    @UseInterceptors(new TransformResponse(UpdateUserRequestDto))
    @ApiResponse({ type: UpdateUserRequestDto })
    @Roles([RoleTypes.Partner, RoleTypes.Employee])
    update(@Body() data: ProfileUpdateRequestDto, @AuthUser() auth_user: Partial<UserEntity>) {
        return this.profileService.update(auth_user, data)
    }
}