import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CustomerResponseDto } from "./dto/response/customer.response.dto";
import { TransformResponse } from "@interceptors/transform-response.interceptor";

@ApiTags("customer")
@ApiBearerAuth()
@Controller("customer")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @UseInterceptors(new TransformResponse(CustomerResponseDto))
  @ApiResponse({ type: CustomerResponseDto })
  findAll() {
    return this.customerService.findAll();
  }
}
