import { AuthUser } from "@decorators/auth-user";
import { UserEntity } from "@orm/entities";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnsupportedMediaTypeException,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { BugReportService } from "./bug-report.service";
import {
  BUG_REPORT_ALLOWED_MIME_TYPES,
  BUG_REPORT_MAX_ATTACHMENTS,
  BUG_REPORT_MAX_FILE_SIZE,
} from "./bug-report.constants";
import { CreateBugReportDto } from "./dto/create-bug-report.dto";

@ApiTags("bug-report")
@ApiBearerAuth()
@Controller("bug-report")
export class BugReportController {
  constructor(private readonly bugReportService: BugReportService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor("attachments", BUG_REPORT_MAX_ATTACHMENTS, {
      storage: memoryStorage(),
      limits: { fileSize: BUG_REPORT_MAX_FILE_SIZE },
      fileFilter: (_request, file, callback) => {
        if (
          !BUG_REPORT_ALLOWED_MIME_TYPES.includes(
            file.mimetype as (typeof BUG_REPORT_ALLOWED_MIME_TYPES)[number],
          )
        ) {
          return callback(
            new UnsupportedMediaTypeException(
              "Можно прикреплять только изображения и видео",
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["message"],
      properties: {
        message: { type: "string", maxLength: 2000 },
        pageUrl: { type: "string", maxLength: 2048 },
        attachments: {
          type: "array",
          maxItems: BUG_REPORT_MAX_ATTACHMENTS,
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      example: { message: "Сообщение об ошибке отправлено" },
    },
  })
  send(
    @AuthUser() authUser: UserEntity,
    @Body() dto: CreateBugReportDto,
    @UploadedFiles() attachments: Express.Multer.File[] = [],
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.bugReportService.send(authUser, dto, attachments, {
      userAgent,
    });
  }
}
