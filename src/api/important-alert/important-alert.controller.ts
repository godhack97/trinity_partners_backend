import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ImportantAlertService } from "./important-alert.service";

@ApiTags("important-alerts")
@ApiBearerAuth()
@Controller("important-alerts")
export class ImportantAlertController {
  constructor(
    private readonly importantAlertService: ImportantAlertService,
  ) {}

  @Get("/active")
  @ApiOperation({ summary: "Получить активные важные оповещения" })
  async getActive() {
    return this.importantAlertService.getActive();
  }
}
