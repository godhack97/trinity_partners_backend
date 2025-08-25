import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

@Injectable()
export class XlsxService {
  async createXlsxFile(components: any[]) {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(components);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Components');
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
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const components = XLSX.utils.sheet_to_json(sheet);
    return components;
  }
}