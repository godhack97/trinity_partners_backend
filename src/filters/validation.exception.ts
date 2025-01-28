import {
  HttpException,
  HttpStatus
} from "@nestjs/common";

export class ValidationException extends HttpException {
  constructor(errors: any) {
    const messages = errors.reduce(
      (prev: [], curr: any) => ([...prev, ...Object.values(curr.constraints)]),
      []
    )
    super(messages, HttpStatus.BAD_REQUEST);
  }
}