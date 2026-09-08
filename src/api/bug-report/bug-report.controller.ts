import { AuthUser } from "@decorators/auth-user";
import { UserEntity } from "@orm/entities";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BugReportService } from "./bug-report.service";
import { CreateBugReportDto } from "./dto/create-bug-report.dto";

@ApiTags("bug-report")
@ApiBearerAuth()
@Controller("bug-report")
export class BugReportController {
  constructor(private readonly bugReportService: BugReportService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CreateBugReportDto })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      example: { message: "Сообщение об ошибке отправлено" },
    },
  })
  send(
    @AuthUser() authUser: UserEntity,
    @Body() dto: CreateBugReportDto,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.bugReportService.send(authUser, dto, { userAgent });
  }
}
