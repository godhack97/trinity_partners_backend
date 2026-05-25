import { AuthUser } from "@decorators/auth-user";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
} from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { ConfiguratorDraftsService } from "./configurator-drafts.service";
import { CreateConfiguratorDraftDto } from "./dto/request/create-configurator-draft.dto";
import { UpdateConfiguratorDraftDto } from "./dto/request/update-configurator-draft.dto";
import { ShareConfiguratorDraftDto } from "./dto/request/share-configurator-draft.dto";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { ConfiguratorDraftResponseDto } from "./dto/response/configurator-draft-response.dto";

@ApiTags("configurator-drafts")
@ApiBearerAuth()
@Controller("configurator-drafts")
export class ConfiguratorDraftsController {
  constructor(
    private readonly draftsService: ConfiguratorDraftsService,
  ) {}

  @Get()
  @UseInterceptors(new TransformResponse(ConfiguratorDraftResponseDto))
  @ApiResponse({ type: ConfiguratorDraftResponseDto, isArray: true })
  findAll(@AuthUser() auth_user: UserEntity) {
    return this.draftsService.findAll(auth_user);
  }

  @Get("count")
  @ApiResponse({ type: Number })
  getCount(@AuthUser() auth_user: UserEntity) {
    return this.draftsService.getCount(auth_user);
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(ConfiguratorDraftResponseDto))
  @ApiResponse({ type: ConfiguratorDraftResponseDto })
  findOne(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.draftsService.findOne(+id, auth_user);
  }

  @Post()
  @ApiBody({ type: () => CreateConfiguratorDraftDto })
  @UseInterceptors(new TransformResponse(ConfiguratorDraftResponseDto))
  @ApiResponse({ type: ConfiguratorDraftResponseDto })
  create(
    @AuthUser() auth_user: UserEntity,
    @Body() dto: CreateConfiguratorDraftDto,
  ) {
    return this.draftsService.create(auth_user, dto);
  }

  @Put(":id")
  @ApiBody({ type: () => UpdateConfiguratorDraftDto })
  @UseInterceptors(new TransformResponse(ConfiguratorDraftResponseDto))
  @ApiResponse({ type: ConfiguratorDraftResponseDto })
  update(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() dto: UpdateConfiguratorDraftDto,
  ) {
    return this.draftsService.update(+id, auth_user, dto);
  }

  @Post(":id/duplicate")
  @UseInterceptors(new TransformResponse(ConfiguratorDraftResponseDto))
  @ApiResponse({ type: ConfiguratorDraftResponseDto })
  duplicate(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.draftsService.duplicate(+id, auth_user);
  }

  @Post(":id/share")
  @ApiBody({ type: () => ShareConfiguratorDraftDto })
  @UseInterceptors(new TransformResponse(ConfiguratorDraftResponseDto))
  @ApiResponse({ type: ConfiguratorDraftResponseDto })
  share(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() dto: ShareConfiguratorDraftDto,
  ) {
    return this.draftsService.share(+id, auth_user, dto);
  }

  @Delete(":id")
  @ApiResponse({
    description: "Конфигурация успешно удалена",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  })
  async remove(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    await this.draftsService.remove(+id, auth_user);
    return { message: "Конфигурация успешно удалена" };
  }
}
