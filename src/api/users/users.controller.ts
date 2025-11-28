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
import { ApiBearerAuth, ApiResponse, ApiTags, ApiOperation } from "@nestjs/swagger";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";

@Controller("users")
@ApiTags("users")
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("/count")
  @ApiOperation({ summary: 'Получить кол-во пользователей' })
  @ApiBearerAuth()
  @ApiResponse({ type: Number })
  async getCount() {
    return this.usersService.getCount();
  }

  @Get("/all")
  @ApiOperation({ summary: 'Получить всех пользователей' })
  async findAll(@Query() filters: UserFilterRequestDto) {
    try {
      return await this.usersService.findAll(filters);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('/by-email')
  @ApiOperation({ summary: 'Поиск пользователя' })
  async findbyEmail(@Query() filters: UserFilterRequestDto): Promise<UserEntity> {
    try {
      return await this.usersService.findByEmail(filters);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Поиск пользователя' })
  async find(): Promise<UserEntity[]> {
    try {
      return await this.usersService.findUsersByRoleIdGreaterThanOne();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}