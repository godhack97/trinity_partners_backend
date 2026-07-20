import { PartialType } from "@nestjs/swagger";
import { CreateImportantAlertDto } from "./create-important-alert.dto";

export class UpdateImportantAlertDto extends PartialType(CreateImportantAlertDto) {}
