import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseIntPipe,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { DocumentsService } from './documents.service';
import { AuthGuard } from '@app/guards/auth.guard';
import { CheckUserOrCompanyStatusGuard } from '@app/guards/check-user-or-company-status.guard';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  FindDocumentsQueryDto,
  CreateDocumentGroupDto,
  UpdateDocumentGroupDto,
  CreateDocumentTagDto,
  UpdateDocumentTagDto,
  CreateDocumentAccessLevelDto,
  UpdateDocumentAccessLevelDto,
} from './documents.dto';
import { LogAction } from 'src/logs/log-action.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard, AuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─── Groups ──────────────────────────────────────────────────────────────

  @Get('groups')
  @ApiOperation({ summary: 'Получить все группы документов' })
  findAllGroups() {
    return this.documentsService.findAllGroups();
  }

  @Post('groups')
  @ApiOperation({ summary: 'Создать группу документов' })
  @LogAction('document_group_create', 'document_groups')
  createGroup(@Body() dto: CreateDocumentGroupDto) {
    return this.documentsService.createGroup(dto);
  }

  @Put('groups/:id')
  @ApiOperation({ summary: 'Обновить группу документов' })
  @LogAction('document_group_update', 'document_groups')
  updateGroup(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentGroupDto) {
    return this.documentsService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Удалить группу документов' })
  @LogAction('document_group_delete', 'document_groups')
  async removeGroup(@Param('id', ParseIntPipe) id: number) {
    await this.documentsService.removeGroup(id);
    return { message: 'Группа удалена' };
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────

  @Get('tags')
  @ApiOperation({ summary: 'Получить все теги' })
  findAllTags() {
    return this.documentsService.findAllTags();
  }

  @Post('tags')
  @ApiOperation({ summary: 'Создать тег' })
  @LogAction('document_tag_create', 'document_tags')
  createTag(@Body() dto: CreateDocumentTagDto) {
    return this.documentsService.createTag(dto);
  }

  @Put('tags/:id')
  @ApiOperation({ summary: 'Обновить тег' })
  @LogAction('document_tag_update', 'document_tags')
  updateTag(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentTagDto) {
    return this.documentsService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: 'Удалить тег' })
  @LogAction('document_tag_delete', 'document_tags')
  async removeTag(@Param('id', ParseIntPipe) id: number) {
    await this.documentsService.removeTag(id);
    return { message: 'Тег удалён' };
  }

  // ─── Access Levels ────────────────────────────────────────────────────────

  @Get('access-levels')
  @ApiOperation({ summary: 'Получить уровни доступа (фильтрованные по роли)' })
  findAllAccessLevels(@Req() req: Request) {
    return this.documentsService.findAllAccessLevels(req['auth_user']);
  }

  @Post('access-levels')
  @ApiOperation({ summary: 'Создать уровень доступа' })
  @LogAction('document_access_level_create', 'document_access_levels')
  createAccessLevel(@Body() dto: CreateDocumentAccessLevelDto) {
    return this.documentsService.createAccessLevel(dto);
  }

  @Put('access-levels/:id')
  @ApiOperation({ summary: 'Обновить уровень доступа' })
  @LogAction('document_access_level_update', 'document_access_levels')
  updateAccessLevel(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentAccessLevelDto) {
    return this.documentsService.updateAccessLevel(id, dto);
  }

  @Delete('access-levels/:id')
  @ApiOperation({ summary: 'Удалить уровень доступа' })
  @LogAction('document_access_level_delete', 'document_access_levels')
  async removeAccessLevel(@Param('id', ParseIntPipe) id: number) {
    await this.documentsService.removeAccessLevel(id);
    return { message: 'Уровень доступа удалён' };
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Получить документы (с учётом доступа)' })
  findAll(@Req() req: Request, @Query() query: FindDocumentsQueryDto) {
    return this.documentsService.findAll(req['auth_user'], query);
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Скачать документ' })
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const doc = await this.documentsService.findOne(id);
    const filePath = join(process.cwd(), doc.filePath);
    const fileStream = createReadStream(filePath);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Post()
  @ApiOperation({ summary: 'Загрузить документ' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        group_id: { type: 'number' },
        access_level_id: { type: 'number' },
        tag_ids: { type: 'string', description: 'ID тегов через запятую' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @LogAction('document_create', 'documents')
  create(@Body() dto: CreateDocumentDto, @UploadedFile() file: Express.Multer.File) {
    return this.documentsService.create(dto, file);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить документ' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        group_id: { type: 'number' },
        access_level_id: { type: 'number' },
        tag_ids: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @LogAction('document_update', 'documents')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.update(id, dto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить документ' })
  @LogAction('document_delete', 'documents')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.documentsService.remove(id);
    return { message: 'Документ удалён' };
  }
}
