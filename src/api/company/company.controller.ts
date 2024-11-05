import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { CompanyService } from './company.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AddEmployeeRequestDto } from './dto/request/add-employee.request.dto';

@ApiTags('company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('add-employee')
  addEmployee(@Req() request: Request, @Body() addEmployeeDto: AddEmployeeRequestDto) {
    return this.companyService.addEmplyee(request, addEmployeeDto);
  }

  @Get()
  findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: AddEmployeeRequestDto) {
    return this.companyService.update(+id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(+id);
  }
}
