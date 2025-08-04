import { CustomerResponseDto } from "@api/customer/dto/response/customer.response.dto";
import { DistributorResponseDto } from "@api/distributor/dto/response/distributor.response.dto";
import { UserResponseDto } from "@api/user/dto/response/user.response.dto";
import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Expose, Type } from "class-transformer";

export class DealResponseDto  extends WithIdDto{
  @ApiProperty()
  @Expose()
  distributor_id: number;

  @ApiProperty()
  @Expose()
  customer_id: number;

  @ApiProperty()
  @Expose()
  creator_id: number;

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

  @ApiProperty()
  @Expose()
  @Type(() => UserResponseDto)
  partner: UserResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => CustomerResponseDto)
  customer: CustomerResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => DistributorResponseDto)
  distributor: DistributorResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => DistributorResponseDto)
  created_at: Date;

  @ApiProperty({ description: 'Статус заявки на удаление сделки', enum: ['yes', 'no'] })
  @Expose()
  delete_request_status: 'yes' | 'no';
}