import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { multerStorage } from "@config/multer_storage";
import { FileInterceptor } from "@nestjs/platform-express";
import * as path from "path";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { allowedMimeTypes } from "./constants/allowed-files";

@ApiTags("upload-file")
@ApiBearerAuth()
@Controller("upload-file")
export class UploadFileController {
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multerStorage.files,
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException("Неверный тип файла"), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  uploadPdfFile(@UploadedFile() file: Express.Multer.File) {
    const baseUrl = process.env.BACKEND_HOSTNAME;
    const filePath = path.posix.join("public", "files", file.filename);

    const configuration_link = `${baseUrl}/${filePath}`;
    return {
      configuration_link,
    };
  }
}
