import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { UserActionsService } from './user-actions.service';
import { LOG_ACTION_KEY } from './log-action.decorator';
import { DataSource } from 'typeorm';

@Injectable()
export class LogActionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly userActions: UserActionsService,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logMeta = this.reflector.get<{ action: string; entity?: string }>(
      LOG_ACTION_KEY,
      context.getHandler(),
    );

    if (!logMeta || !logMeta.action) return next.handle();

    const req = context.switchToHttp().getRequest();
    const userId = req.auth_user?.id;
    let snapshotPromise: Promise<any> = Promise.resolve(null);

    if (logMeta.entity && req.params?.id && req.params.id.trim() !== '') {
      try {
        const repository = this.dataSource.getRepository(logMeta.entity);
        const idValue = isNaN(+req.params.id) ? req.params.id : +req.params.id;
        snapshotPromise = repository.findOne({ where: { id: idValue } });
      } catch (e) {
        snapshotPromise = Promise.resolve(null);
      }
    }

    return from(snapshotPromise).pipe(
      switchMap((entitySnapshot) =>
        next.handle().pipe(
          tap(() => {
            const details: Record<string, any> = {
              entity: logMeta.entity,
              params: req.params,
              body: req.body,
              query: req.query,
            };
            if (entitySnapshot) {
              details.deleted = {};
              if ('id' in entitySnapshot) details.deleted.id = entitySnapshot.id;
              if ('name' in entitySnapshot) details.deleted.name = entitySnapshot.name;
              if ('email' in entitySnapshot) details.deleted.email = entitySnapshot.email;
            }
            this.userActions.log(userId, logMeta.action, details);
          }),
        ),
      ),
    );
  }
}
