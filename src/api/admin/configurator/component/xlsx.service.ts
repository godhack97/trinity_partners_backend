import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { CONFIGURATOR_COMPONENT_SCHEMA_VERSION } from './configurator-component-schema';

@Injectable()
export class XlsxService {
  async createXlsxFile(components: any[], schema: any[] = []) {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(components);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Components');
    const schemaSheet = XLSX.utils.aoa_to_sheet([
      ['schema_version', CONFIGURATOR_COMPONENT_SCHEMA_VERSION],
      [],
      ['Колонка', 'Тип', 'Обязательно', 'Описание'],
      ...schema.map((item) => [
        item.column,
        item.type,
        item.required,
        item.description,
      ]),
    ]);
    XLSX.utils.book_append_sheet(workbook, schemaSheet, 'Schema');
    const xlsxFile = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return xlsxFile;
  }

  async parseXlsxFile(file: Express.Multer.File) {
    let fileBuffer: Buffer;

    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path) {
      fileBuffer = fs.readFileSync(file.path);
      // Удаляем временный файл после чтения
      fs.unlinkSync(file.path);
    } else {
      throw new Error('Не удалось прочитать файл');
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets.Components || workbook.Sheets[workbook.SheetNames[0]];
    const components = XLSX.utils.sheet_to_json(sheet);
    const schemaSheet = workbook.Sheets.Schema;
    const schemaVersion = schemaSheet?.B1?.v
      ? Number(schemaSheet.B1.v)
      : 1;
    return { components, schemaVersion };
  }
}
