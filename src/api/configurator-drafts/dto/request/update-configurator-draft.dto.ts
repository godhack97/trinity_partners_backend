import { PartialType } from "@nestjs/swagger";
import { CreateConfiguratorDraftDto } from "./create-configurator-draft.dto";

export class UpdateConfiguratorDraftDto extends PartialType(
  CreateConfiguratorDraftDto,
) {}
