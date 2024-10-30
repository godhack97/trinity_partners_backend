import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Expose } from "class-transformer";

export class DealResponseDto  extends WithIdDto{
  @ApiProperty()
  @Expose()
  distributor_id: number;

  @ApiProperty()
  @Expose()
  customer_id: number;

  @ApiProperty()
  @Expose()
  partner_id: number;

  @ApiProperty()
  @Expose()
  title?: string;

  @ApiProperty()
  @Expose()
  deal_sum: number;

  @ApiProperty()
  @Expose()
  competition_link: string;

  @ApiProperty()
  @Expose()
  configuration_link: string;

  @ApiProperty()
  @Expose()
  purchase_date: Date | string;

  @ApiProperty()
  @Expose()
  comment: string;

  @ApiProperty()
  @Expose()
  deal_num: string;

  @ApiProperty()
  @Expose()
  special_discount: number | null;

  @ApiProperty()
  @Expose()
  special_price: number | null;

  @ApiProperty()
  @Expose()
  discount_date: Date | string | null;

  @ApiProperty()
  @Expose()
  status: DealStatus;
}