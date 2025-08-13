import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AdminImageService } from "@api/admin/image/admin-image.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { Public } from "@decorators/Public";
import { FileInterceptor } from "@nestjs/platform-express";
import { multerStorage } from "@config/multer_storage";
import { createFilePipe } from "@app/pipes/parse-files.pipe";

@ApiTags("admin/image")
@Controller("admin/image")
//Roles([RoleTypes.SuperAdmin])
export class AdminImageController {
  constructor(private readonly adminImageService: AdminImageService) {}

  @Public()
  // @ts-ignore
  @UseInterceptors(FileInterceptor("file", { storage: multerStorage.images }))
  @Post()
  async saveForm(@UploadedFile(createFilePipe()) file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path.split(process.cwd())[1],
      size: file.size,
    };
  }
}
