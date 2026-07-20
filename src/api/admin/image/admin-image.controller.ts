import {
  Controller,
  UnsupportedMediaTypeException,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { AdminImageService } from "@api/admin/image/admin-image.service";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { FileInterceptor } from "@nestjs/platform-express";
import { multerStorage } from "@config/multer_storage";
import { createFilePipe } from "@app/pipes/parse-files.pipe";

@ApiTags("image")
@Controller("admin/image")
@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
export class AdminImageController {
  constructor(private readonly adminImageService: AdminImageService) {}

  // @ts-ignore
  @UseInterceptors(FileInterceptor("file", {
    storage: multerStorage.images,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
      if (![
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/quicktime",
      ].includes(file.mimetype)) {
        return callback(
          new UnsupportedMediaTypeException("Неверный тип файла"),
          false,
        );
      }
      callback(null, true);
    },
  }))
  @Post()
  @ApiOperation({ summary: 'Загрузить изображение' })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async saveForm(@UploadedFile(createFilePipe()) file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path.split(process.cwd())[1],
      size: file.size,
    };
  }
}
