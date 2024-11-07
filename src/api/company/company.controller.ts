import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseInterceptors } from '@nestjs/common';
import { CompanyService } from './company.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddEmployeeRequestDto } from './dto/request/add-employee.request.dto';
import { AddEmployeeAdminRequestDto } from './dto/request/add-employee-admin-request.dto';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { CompanyEmployeesWithEmpoloyeeResponseDto } from './dto/response/company-employees-response.dto';

@ApiTags('company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('add-employee')
  addEmployee(@Req() request: Request, @Body() addEmployeeDto: AddEmployeeRequestDto) {
    return this.companyService.addEmplyee(request, addEmployeeDto);
  }

  @Get('get-employees')
  @UseInterceptors(new TransformResponse(CompanyEmployeesWithEmpoloyeeResponseDto, true))
  @ApiResponse({ type: [CompanyEmployeesWithEmpoloyeeResponseDto] })
  getCompanyEmployees(@Req() request: Request,) {
    return this.companyService.getCompanyEmployees(request);
  }

  @Patch('change-admin-status/:id')
  changeStatusEmployeeAdmin(@Req() request: Request, @Param('id') id: string, @Body() changeStatasEmployeeAdminDto: AddEmployeeAdminRequestDto) {
    return this.companyService.changeStatusEmployeeAdmin(request, +id, changeStatasEmployeeAdminDto);
  }

  @Patch('remove-employee/:id')
  removeEmployee(@Req() request: Request, @Param('id') id: string) {
    return this.companyService.removeEmployee(request, +id, );
  }
}
