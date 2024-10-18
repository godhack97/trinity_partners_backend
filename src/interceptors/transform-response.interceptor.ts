import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';
import { map } from 'rxjs/operators';
export interface ClassContrustor {
  new (...args: any[]): object;
}

const options: ClassTransformOptions = {
  strategy: 'excludeAll',
};

const transformer = (classConstructor) => (entity) => {
  return plainToInstance(classConstructor, entity, options);
};

export const commonFactory = (data, classConstructor) => {
  const fn = transformer(classConstructor);
  return data.map(fn);
};

@Injectable()
export class TransformResponse implements NestInterceptor {
  constructor(
    private classConstructor?: any,
    private factory: boolean = false,
    private readonly reflector?: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const classConstructor = this.classConstructor;
    const factory = this.factory;

    return next.handle().pipe(
      map((data) => {
        if (factory) return commonFactory(data, classConstructor);

        if (classConstructor) return transformer(classConstructor)(data);

        return data;
      }),
    );
  }
}
