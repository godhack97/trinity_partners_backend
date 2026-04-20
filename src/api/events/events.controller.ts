import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  Delete,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/request/create-event.dto";
import { EventResponseDto } from "./dto/response/event-response.dto";

@ApiTags("events")
@ApiBearerAuth()
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseInterceptors(new TransformResponse(EventResponseDto))
  @ApiResponse({ type: EventResponseDto, isArray: true })
  @ApiQuery({ name: "upcoming", required: false, type: Boolean })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @Query("upcoming") upcoming?: string,
    @Query("limit") limit?: string,
  ) {
    return this.eventsService.findAll(
      upcoming === "true",
      limit ? +limit : undefined,
    );
  }

  @Get("count")
  @ApiResponse({ type: Number })
  getCount() {
    return this.eventsService.getCount();
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(EventResponseDto))
  @ApiResponse({ type: EventResponseDto })
  findOne(@Param("id") id: string) {
    return this.eventsService.findOne(+id);
  }

  @Post()
  @ApiBody({ type: () => CreateEventDto })
  @UseInterceptors(new TransformResponse(EventResponseDto))
  @ApiResponse({ type: EventResponseDto })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Put(":id")
  @ApiBody({ type: () => CreateEventDto })
  @UseInterceptors(new TransformResponse(EventResponseDto))
  @ApiResponse({ type: EventResponseDto })
  update(@Param("id") id: string, @Body() dto: Partial<CreateEventDto>) {
    return this.eventsService.update(+id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.eventsService.remove(+id);
    return { message: "Мероприятие удалено" };
  }
}
