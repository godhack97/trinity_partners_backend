import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    BadRequestException,
} from '@nestjs/common';
import { ForbiddenInnService } from './forbidden-inns.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@decorators/Roles';
import { RoleTypes } from '@app/types/RoleTypes';

export class CreateForbiddenInnDto {
    inn: string;
    reason?: string;
}

export class UpdateForbiddenInnDto {
    reason?: string;
}

@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
@Controller('admin/forbidden-inns')
export class ForbiddenInnController {
    constructor(private readonly forbiddenInnService: ForbiddenInnService) { }

    @Get()
    async findAll() {
        return await this.forbiddenInnService.findAll();
    }

    @Post()
    async create(@Body() createDto: CreateForbiddenInnDto) {
        const { inn, reason } = createDto;

        if (!inn) {
            throw new BadRequestException('ИНН обязателен');
        }

        if (!/^\d{10}$|^\d{12}$/.test(inn)) {
            throw new BadRequestException('ИНН должен содержать 10 или 12 цифр');
        }

        const existing = await this.forbiddenInnService.findByInn(inn);
        if (existing) {
            throw new BadRequestException('Этот ИНН уже в списке запрещенных');
        }

        return await this.forbiddenInnService.create({ inn, reason });
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateForbiddenInnDto
    ) {
        return await this.forbiddenInnService.update(id, updateDto);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.forbiddenInnService.remove(id);
        return { message: 'ИНН удален из списка запрещенных' };
    }
}