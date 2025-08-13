import {
  Controller,
  Delete,
  Get,
  Param,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "src/interceptors/transform-response.interceptor";
import { UserResponseDto } from "./dto/response/user.response.dto";
import { UserService } from "./user.service";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("user")
@ApiBearerAuth()
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(new TransformResponse(UserResponseDto, true))
  @ApiResponse({ type: [UserResponseDto] })
  findAll() {
    return this.userService.findAll();
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiResponse({ type: UserResponseDto })
  findOne(@Param("id") id: string) {
    return this.userService.findOne(+id);
  }

  @Delete(":id")
  @LogAction("user_archive", "users")
  remove(@Param("id") id: string) {
    return this.userService.remove(+id);
  }
}
