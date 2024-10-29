import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors } from '@nestjs/common';
import { DistributorService } from './distributor.service';
import { CreateDistributorDto } from './dto/request/create-distributor.dto';
import { UpdateDistributorDto } from './dto/request/update-distributor.dto';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DistributorResponseDto } from './dto/response/distributor.response.dto';

@ApiTags('distributor')
@ApiBearerAuth()
@Controller('distributor')
export class DistributorController {
  constructor(private readonly distributorService: DistributorService) {}


  @Get()
  @UseInterceptors(new TransformResponse(DistributorResponseDto))
  @ApiResponse({ type: DistributorResponseDto })
  findAll() {
    return this.distributorService.findAll();
  }

}
