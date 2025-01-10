import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class NewsResponseListDto  {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  photo: string;

  @ApiProperty()
  @Expose()
  url: string;

  @ApiProperty()
  @Expose()
  created_at: string;
}

export class NewsResponseDto extends NewsResponseListDto{
  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @Expose()
  author_id: string;

  @ApiProperty()
  @Expose()
  updated_at: string;
}


