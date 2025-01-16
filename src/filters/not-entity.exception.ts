import {
  HttpException,
  HttpStatus
} from "@nestjs/common";

export class NotEntityException extends HttpException {
  constructor() {
    super('Объект не удалось найти', HttpStatus.NOT_FOUND);
  }
}