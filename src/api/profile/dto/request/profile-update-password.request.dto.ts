import { MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
export class ProfileUpdatePasswordRequestDto {
    @ApiProperty()
    @Expose()
    @MinLengthRu(6)
    passwordPrev: string;

    @ApiProperty()
    @Expose()
    @MinLengthRu(6)
    passwordNew: string;

    @ApiProperty()
    @Expose()
    @MinLengthRu(6)
    passwordNew2: string;
}
