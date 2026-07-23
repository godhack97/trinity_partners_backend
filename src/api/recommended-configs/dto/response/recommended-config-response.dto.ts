import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import { RecommendedConfigComponentDto } from "../request/create-recommended-config.dto";

export class RecommendedConfigResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  category: string;

  @ApiProperty()
  @Expose()
  category_label: string;

  @ApiProperty({ nullable: true, format: "uuid" })
  @Expose()
  server_id: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  server_name: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  description: string | null;

  @ApiProperty({ nullable: true, type: [RecommendedConfigComponentDto] })
  @Expose()
  @Type(() => RecommendedConfigComponentDto)
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })
  components: RecommendedConfigComponentDto[] | null;

  @ApiProperty({ nullable: true })
  @Expose()
  image: string | null;

  @ApiProperty()
  @Expose()
  is_active: boolean;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;
}
