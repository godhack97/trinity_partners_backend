// database-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';

@Catch(QueryFailedError, EntityNotFoundError, TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError | TypeORMError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    this.logger.error(`Database error: ${exception.message}`, exception.stack);

    let message = 'Ошибка базы данных';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let details = null;

    if (exception instanceof QueryFailedError) {
      const result = this.handleQueryFailedError(exception);
      message = result.message;
      status = result.status;
      details = result.details;
    } else if (exception instanceof EntityNotFoundError) {
      message = 'Запись не найдена';
      status = HttpStatus.NOT_FOUND;
    }

    response.status(status).json({
      statusCode: status,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handleQueryFailedError(exception: QueryFailedError): { message: string; status: HttpStatus; details?: any } {
    const errorMessage = exception.message.toLowerCase();
    const sqlMessage = exception.message;

    // Foreign Key Constraints
    if (errorMessage.includes('foreign key constraint fails')) {
      const match = sqlMessage.match(/CONSTRAINT `([^`]+)`.*?REFERENCES `([^`]+)`/);
      return {
        message: 'Невозможно выполнить операцию: запись используется в других таблицах',
        status: HttpStatus.BAD_REQUEST,
        details: match ? `Связь с таблицей ${match[2]}` : null
      };
    }

    // Data too long
    if (errorMessage.includes('data too long for column')) {
      const match = sqlMessage.match(/column '([^']+)'/);
      return {
        message: `Данные слишком длинные для поля${match ? ` "${match[1]}"` : ''}`,
        status: HttpStatus.BAD_REQUEST,
        details: match ? { field: match[1] } : null
      };
    }

    // Duplicate entry
    if (errorMessage.includes('duplicate entry')) {
      const keyMatch = sqlMessage.match(/for key '([^']+)'/);
      const valueMatch = sqlMessage.match(/duplicate entry '([^']+)'/);
      return {
        message: 'Запись с такими данными уже существует',
        status: HttpStatus.CONFLICT,
        details: {
          duplicateValue: valueMatch ? valueMatch[1] : null,
          constraintName: keyMatch ? keyMatch[1] : null
        }
      };
    }

    // Cannot be null
    if (errorMessage.includes('cannot be null') || errorMessage.includes('column') && errorMessage.includes('cannot be null')) {
      const match = sqlMessage.match(/column '([^']+)'/);
      return {
        message: `Обязательное поле не заполнено${match ? `: "${match[1]}"` : ''}`,
        status: HttpStatus.BAD_REQUEST,
        details: match ? { field: match[1] } : null
      };
    }

    // Out of range
    if (errorMessage.includes('out of range')) {
      const match = sqlMessage.match(/column '([^']+)'/);
      return {
        message: `Значение выходит за допустимые пределы${match ? ` для поля "${match[1]}"` : ''}`,
        status: HttpStatus.BAD_REQUEST,
        details: match ? { field: match[1] } : null
      };
    }

    // Incorrect value
    if (errorMessage.includes('incorrect') && (errorMessage.includes('integer') || errorMessage.includes('decimal') || errorMessage.includes('datetime'))) {
      const match = sqlMessage.match(/column '([^']+)'/);
      return {
        message: `Некорректный формат данных${match ? ` для поля "${match[1]}"` : ''}`,
        status: HttpStatus.BAD_REQUEST,
        details: match ? { field: match[1] } : null
      };
    }

    // Connection errors
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return {
        message: 'Проблема с подключением к базе данных',
        status: HttpStatus.SERVICE_UNAVAILABLE
      };
    }

    // Table doesn't exist
    if (errorMessage.includes('table') && errorMessage.includes('doesn\'t exist')) {
      return {
        message: 'Ошибка структуры базы данных',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }

    // Unknown column
    if (errorMessage.includes('unknown column')) {
      const match = sqlMessage.match(/unknown column '([^']+)'/);
      return {
        message: 'Ошибка структуры базы данных',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        details: match ? { column: match[1] } : null
      };
    }

    // Check constraint
    if (errorMessage.includes('check constraint')) {
      return {
        message: 'Данные не соответствуют требованиям валидации',
        status: HttpStatus.BAD_REQUEST
      };
    }

    // Deadlock
    if (errorMessage.includes('deadlock')) {
      return {
        message: 'Временная блокировка базы данных, попробуйте позже',
        status: HttpStatus.CONFLICT
      };
    }

    // Lock wait timeout
    if (errorMessage.includes('lock wait timeout')) {
      return {
        message: 'Превышено время ожидания операции с базой данных',
        status: HttpStatus.REQUEST_TIMEOUT
      };
    }

    // Default case
    return {
      message: 'Неизвестная ошибка базы данных',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      details: process.env.NODE_ENV === 'development' ? { originalError: exception.message } : null
    };
  }
}