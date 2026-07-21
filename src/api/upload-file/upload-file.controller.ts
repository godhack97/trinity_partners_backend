import {
  Controller,
  ParseFilePipe,
  Post,
  UnsupportedMediaTypeException,
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
          return cb(
            new UnsupportedMediaTypeException("Неверный тип файла"),
            false,
          );
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
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  uploadPdfFile(
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    const filePath = path.posix.join("public", "files", file.filename);

    // Store a host-independent path. Clients resolve it against the API host,
    // so links keep working behind a proxy and in local/stage environments.
    const configuration_link = `/${filePath}`;
    return {
      configuration_link,
    };
  }
}
