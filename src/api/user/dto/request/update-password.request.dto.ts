import { MinLengthRu } from "@decorators/validate";
export class UpdatePasswordRequestDto {
    @MinLengthRu(6)
    passwordPrev: string;

    @MinLengthRu(6)
    passwordNew: string;

    @MinLengthRu(6)
    passwordNew2: string;
}
