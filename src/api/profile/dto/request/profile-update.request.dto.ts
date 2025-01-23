import {
    IsNumberRu,
    MinLengthRu
} from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsOptional } from "class-validator";

export class ProfileUpdateRequestDto {
    
    @ApiPropertyOptional()
    @IsOptional()
    photo_url?: string;

    @ApiProperty()
    @Expose()
    job_title: string;

    @ApiProperty()
    @Expose()
    phone: string;
    @ApiProperty()
    @Expose()
    company_business_line: string; //направления деятельности

    @ApiProperty()
    @Expose()
    @IsNumberRu()
    employees_count: number;

    @ApiProperty()
    @Expose()
    site_url: string;

    @ApiProperty()
    @Expose()
    promoted_products: string;

    @ApiProperty()
    @Expose()
    products_of_interest: string;

    @ApiProperty()
    @Expose()
    main_customers: string;
}




