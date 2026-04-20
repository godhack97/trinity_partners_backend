import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class RecommendedConfigResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  category: string;

  @ApiProperty()
  @Expose()
  category_label: string;

  @ApiProperty()
  @Expose()
  server_id: string;

  @ApiProperty()
  @Expose()
  server_name: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  components: any;

  @ApiProperty()
  @Expose()
  image: string;

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
