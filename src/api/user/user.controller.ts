import { UpdateUserRequestDto } from "@api/user/dto/request/update-user.request.dto";
import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
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

  @Post(':id/update')
  @UseInterceptors(new TransformResponse(UpdateUserRequestDto))
  @ApiResponse({ type: UpdateUserRequestDto })
  update(@Param('id') id: string, @Body() data: UpdateUserRequestDto) {
    return this.userService.update(+id, data);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
