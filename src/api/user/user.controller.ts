import { ProfileUpdatePasswordRequestDto } from "@api/profile/dto/request/profile-update-password.request.dto";
import { UpdateUserRequestDto } from "@api/user/dto/request/update-user.request.dto";
import { UserOwnerGuard } from "@app/guards/user-owner.guard";
import { AuthUser } from "@decorators/auth-user";
import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponse } from 'src/interceptors/transform-response.interceptor';
import { UserResponseDto } from './dto/response/user.response.dto';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(new TransformResponse(UserResponseDto, true))
  @ApiResponse({ type: [UserResponseDto] })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiResponse({ type: UserResponseDto })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
