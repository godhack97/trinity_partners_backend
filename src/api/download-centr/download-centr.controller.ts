import {
    Controller,
    Get,
    Post,
    Delete,
    Put,
    Param,
    Body,
    Query,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    ParseIntPipe,
    Res,
    StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DownloadCentrService } from './download-centr.service';
import { CreateDownloadCentrDto } from './download-centr.dto';
import { CheckUserOrCompanyStatusGuard } from "@app/guards/check-user-or-company-status.guard";
import { AuthGuard } from "@app/guards/auth.guard";
import { PermissionsGuard } from "@app/guards/permissions.guard";
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';


@ApiTags('download-centr')
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard, AuthGuard, PermissionsGuard)
@Controller('download-centr')
export class DownloadCentrController {
    constructor(private readonly downloadCentrService: DownloadCentrService) { }

    @Post()
    @ApiOperation({ summary: 'Загрузить файл в центр загрузок' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                tags: { type: 'string' },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @Body() createDto: CreateDownloadCentrDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return await this.downloadCentrService.create(createDto, file);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Обновить файл' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                tags: { type: 'string' },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: CreateDownloadCentrDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return await this.downloadCentrService.update(id, updateDto, file);
    }

    @Get()
    @ApiOperation({ summary: 'Получить все файлы' })
    @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию и описанию' })
    @ApiQuery({ name: 'tags', required: false, description: 'Фильтр по тегам (через запятую)' })
    async findAll(
        @Query('search') search?: string,
        @Query('tags') tags?: string,
    ) {
        return await this.downloadCentrService.findAll(search, tags);
    }

    @Get('tags')
    @ApiOperation({ summary: 'Получить все уникальные теги' })
    async getAllTags() {
        return await this.downloadCentrService.getAllTags();
    }

    @Get('download/:id')
    @ApiOperation({ summary: 'Скачать файл по ID' })
    async downloadFile(
        @Param('id', ParseIntPipe) id: number,
        @Res({ passthrough: true }) res: Response,
    ) {
        const file = await this.downloadCentrService.findOne(id);
        const filePath = join(process.cwd(), file.filePath);
        const fileStream = createReadStream(filePath);

        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        });

        return new StreamableFile(fileStream);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить файл по ID' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.downloadCentrService.findOne(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Удалить файл' })
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.downloadCentrService.remove(id);
        return { message: 'Файл успешно удален' };
    }
}