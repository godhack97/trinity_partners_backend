import { Body, Controller, Delete, Req, Get, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";
import { CreateConfigurationComponentRequestDto } from "./dto/request/create-configurator-component.request.dto";
import { LogAction } from "src/logs/log-action.decorator";
import { XlsxService } from './xlsx.service';
import { multerStorage } from "@config/multer_storage";

@ApiTags("admin/configurator/component")
@ApiBearerAuth()
@Controller("admin/configurator/component")
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorComponentController {
  constructor(
    private readonly adminConfiguratorComponentService: AdminConfiguratorComponentService,
    private readonly xlsxService: XlsxService,
  ) {}
  
  @Get("/export")
  @LogAction("configurator_component_export", "cnf_components")
  async getComponents(@Res() res: any) {
    const components = await this.adminConfiguratorComponentService.exportExcel();
    const xlsxFile = await this.xlsxService.createXlsxFile(components);
    res.set("Content-Disposition", `attachment; filename="components.xlsx"`);
    res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(xlsxFile);
  }

  @Post("/import")
  @LogAction("configurator_component_import", "cnf_components")
  @UseInterceptors(FileInterceptor("file", { storage: multerStorage.files }))
  async importComponents(@UploadedFile() file: Express.Multer.File, @Res() res: any, @Req() req: any) {
    const userId = req.user?.id; // Передаем userId для автобекапа
    const components = await this.xlsxService.parseXlsxFile(file);
    await this.adminConfiguratorComponentService.importExcel(components, userId);
    res.status(201).send('Компоненты импортированы успешно!');
  }

  @Get("/backups")
  async getComponentBackups() {
    return await this.adminConfiguratorComponentService.getBackups();
  }

  @Post("/backup")
  @LogAction("configurator_component_backup", "cnf_component_backups")
  async createComponentBackup(
    @Body() body: { name: string },
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return await this.adminConfiguratorComponentService.createBackup(body.name, userId);
  }
  
  @Post("/restore/:backupId")
  @LogAction("configurator_component_restore_backup", "cnf_component_backups")
  async restoreComponentBackup(@Param('backupId') backupId: string) {
    return await this.adminConfiguratorComponentService.restoreFromBackup(backupId);
  }

  @Delete("/backup/:backupId")
  @LogAction("configurator_component_backup_delete", "cnf_component_backups")
  async deleteComponentBackup(@Param('backupId') backupId: string) {
    return await this.adminConfiguratorComponentService.deleteBackup(backupId);
  }
  
  @Post()
  @LogAction("configurator_component_add", "cnf_components")
  createComponent(@Body() data: CreateConfigurationComponentRequestDto) {
    return this.adminConfiguratorComponentService.createComponent(data);
  }

  @Post(":id/update")
  @LogAction("configurator_component_update", "cnf_components")
  update(@Param("id") id: string, @Body() data: any) {
    return this.adminConfiguratorComponentService.updateComponent(id, data);
  }

  @Post(":id/delete")
  @LogAction("configurator_component_delete", "cnf_components")
  deleteComponent(@Param("id") id: string) {
    return this.adminConfiguratorComponentService.deleteComponent(id);
  }
}
