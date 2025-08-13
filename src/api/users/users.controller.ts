import { UsersService } from "./users.service";
import { UserEntity } from "../../orm/entities/user.entity";
import {
  Controller,
  Delete,
  Get,
  Param,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

@Controller("users")
@ApiTags("users")
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("/count")
  @ApiBearerAuth()
  @ApiResponse({ type: Number })
  async getCount() {
    return this.usersService.getCount();
  }

  @Get()
  async find(): Promise<UserEntity[]> {
    try {
      return await this.usersService.findUsersByRoleIdGreaterThanOne();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}
