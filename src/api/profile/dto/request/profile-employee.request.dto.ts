import {
    MinLengthRu
} from "@decorators/validate";
import {
    ApiProperty,
} from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class ProfileEmployeeRequestDto {
    @ApiProperty()
    @Expose()
    @MinLengthRu(6)
    photo_url?: string;

    @ApiProperty()
    @Expose()
    job_title?: string;

    @ApiProperty()
    @Expose()
    phone?: string;
}