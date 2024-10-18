import { PartialType } from '@nestjs/swagger';
import { CreateConfiguratorDto } from './create-configurator.request.dto';

export class UpdateConfiguratorDto extends PartialType(CreateConfiguratorDto) {}
