import { IsEmailRu, IsRussianPhoneRu, MinLengthRu } from "@decorators/validate";
import { IsRussianInn } from "@decorators/validate/is-russian-inn";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Transform } from "class-transformer";
import { IsOptional, IsString, ValidateIf } from "class-validator";
import { normalizeLegacyRussianInn } from "@app/utils/russian-inn";

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  @MinLengthRu(2)
  first_name: string;

  @ApiProperty()
  @IsString()
  @MinLengthRu(2)
  last_name: string;

  @ApiProperty({
    description: "ИНН юридического лица или индивидуального предпринимателя",
    example: "7707083893",
  })
  @Transform(({ value }) => normalizeLegacyRussianInn(value) ?? value)
  @IsRussianInn()
  inn: string;

  // The canonical value is computed by server code and never trusted from the
  // request body, even when the global ValidationPipe is not in whitelist mode.
  @Exclude({ toClassOnly: true })
  inn_normalized?: never;

  @ApiProperty()
  @IsString()
  @MinLengthRu(2)
  company_name: string;

  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @ValidateIf((_object, value) => value !== "")
  @IsRussianPhoneRu()
  phone: string;
}
