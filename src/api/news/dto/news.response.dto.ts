import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { PaginationResponseDto } from "@app/dto/pagination.response.dto";

export class NewsResponseListDto {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ nullable: true })
  @Expose()
  photo: string | null;

  @ApiProperty()
  @Expose()
  url: string;

  @ApiProperty()
  @Expose()
  created_at: string;
}

export class NewsResponseDto extends NewsResponseListDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty({ nullable: true })
  @Expose()
  image_big: string | null;

  @ApiProperty()
  @Expose()
  author_id: number;

  @ApiProperty()
  @Expose()
  updated_at: string;
}

export class NewsPaginationResponseDto extends PaginationResponseDto<NewsResponseDto> {
  @ApiProperty({ type: [NewsResponseDto] })
  @Expose()
  @Type(() => NewsResponseDto)
  data: NewsResponseDto[];
}

export class NewsUnreadCountResponseDto {
  @ApiProperty()
  @Expose()
  unread_count: number;
}
