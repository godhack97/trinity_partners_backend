import { IsEmailRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
export class ProfileUpdateEmailRequestDto {
    @ApiProperty()
    @Expose()
    @IsEmailRu()
    email: string;
}
