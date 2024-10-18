import { IsEmailRu, MinLengthRu } from "../../../../decorators/validate";

export class CreateUserRequestDto {
  @IsEmailRu()
  email: string;

  @MinLengthRu(6)
  password: string;
}
