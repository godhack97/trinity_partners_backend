import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['api', 'menu', 'system'] })
  @IsEnum(['api', 'menu', 'system'])
  resource_type: 'api' | 'menu' | 'system';

  @ApiProperty()
  @IsString()
  resource_name: string;

  @ApiProperty()
  @IsString()
  action: string;
}

export class AssignPermissionsDto {
  @ApiProperty({ type: [Number] })
  permissionIds: number[];
}