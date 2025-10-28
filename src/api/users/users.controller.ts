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
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";

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

  @Get("/all")
  async findAll(@Query() filters: UserFilterRequestDto) {
    try {
      return await this.usersService.findAll(filters);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
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