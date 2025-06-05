import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Inject,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Observable, tap } from 'rxjs';
  import { UserActionsService } from './user-actions.service';
  import { LOG_ACTION_KEY } from './log-action.decorator';

  @Injectable()
  export class LogActionInterceptor implements NestInterceptor {
    constructor(
      private readonly reflector: Reflector,
      private readonly userActions: UserActionsService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const logMeta = this.reflector.get<{ action: string, entity?: string }>(
        LOG_ACTION_KEY,
        context.getHandler(),
      );
 
      if (!logMeta || !logMeta.action) return next.handle();

      const req = context.switchToHttp().getRequest();
      const userId = req.auth_user?.id;

      return next.handle().pipe(
        tap(() => {
          const details = {
            entity: logMeta.entity,
            params: req.params,
            body: req.body,
            query: req.query,
          };
          this.userActions.log(userId, logMeta.action, details);
        }),
      );
    }
  }
  