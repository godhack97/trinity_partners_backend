import { Controller, Get, Post, Body, Param, UseInterceptors, Req, Query, UseGuards, UploadedFile, BadRequestException } from '@nestjs/common';
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { DealResponseDto } from './dto/response/deal-response.dto';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';
import { CheckUserOrCompanyStatusGuard } from '@app/guards/check-user-or-company-status.guard';
import { multerStorage } from '@config/multer_storage';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';

@ApiTags('deal')
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard)
@Controller('deal')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @ApiBody({ type: () => CreateDealDto })
  create(@Req() request: Request, @Body() createDealDto: CreateDealDto) {
    return this.dealService.create(request, createDealDto);
  }

  //@Public()
  @UseInterceptors(FileInterceptor ('file', { 
    storage: multerStorage.files,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        return cb(new BadRequestException('Неверный тип файла'), false);
      }
      cb(null, true);
    },
  }))
  @Post('upload-file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadPdfFile(
    @UploadedFile(
    ) file : Express.Multer.File
  ) {
    const baseUrl = process.env.BACKEND_HOSTNAME;
    const filePath = path.posix.join('public', 'files', file.filename);

    const configuration_link = `${baseUrl}/${filePath}`;
    return {
      configuration_link
    };
  }

  @Get()
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto, isArray: true })
  findAll(@Req() request: Request, @Query() entry?: SearchDealDto) {
    return this.dealService.findAll(request, entry);
  }

  @Get('statistic')
  //@UseInterceptors(new TransformResponse(DealStatisticsResponseDto))
  @ApiResponse({ type: DealStatisticsResponseDto })
  getDealStatistic(@Req() request: Request): Promise<DealStatisticsResponseDto> {
    return this.dealService.getDealStatistic(request);
  }

  @Get(':id')
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  findOne(@Param('id') id: string, @Req() request: Request) {
    return this.dealService.findOne(+id, request);
  }
}
