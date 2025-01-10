import { ApiProperty } from "@nestjs/swagger";

export class NewsRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  photo: string;
}


