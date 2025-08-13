import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  PipeTransform,
} from "@nestjs/common";

// Данная pipe - срабатывает поздно. Файл уже успевает записаться - нужно валидацию делать на уровне multer
export class ParseFilesPipe implements PipeTransform<Express.Multer.File[]> {
  constructor(private readonly pipe: ParseFilePipe) {}

  async transform(
    files: Express.Multer.File[] | { [key: string]: Express.Multer.File[] },
  ) {
    for (const file of Object.values(files).flat())
      await this.pipe.transform(file);

    return files;
  }
}

export const createFilePipe = (maxSize: number = 1024 * 1024 * 3) => {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({
        maxSize,
        message: (size) => `Файл превысил ${size} bytes`,
      }),
      new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif|mp4|mov)$/ }),
    ],
  });
};
export const createFilesPipe = (data?: { maxSize?: number }) => {
  const maxSize: number = data?.maxSize | (1024 * 1024 * 3);
  return new ParseFilesPipe(createFilePipe(maxSize));
};
