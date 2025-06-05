// src/logs/log-action.interceptor.ts
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
import { DataSource } from 'typeorm'; // TypeORM >= 0.3

@Injectable()
export class LogActionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly userActions: UserActionsService,
    private readonly dataSource: DataSource, // В AppModule зарегистрируй DataSource как провайдер
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

    // Если в декораторе указан entity и есть req.params.id — делаем select до основного handler'а
    if (logMeta.entity && req.params?.id) {
      try {
        const repository = this.dataSource.getRepository(logMeta.entity);
        snapshotPromise = repository.findOne({ where: { id: req.params.id } });
      } catch (e) {
        snapshotPromise = Promise.resolve(null); // entity не найдена или не зарегистрирована
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
            // Вставляем ключевые поля удалённой сущности (если есть)
            if (entitySnapshot) {
              details.deleted = {};
              // Сохраняем только нужные поля, например:
              if ('id' in entitySnapshot) details.deleted.id = entitySnapshot.id;
              if ('name' in entitySnapshot) details.deleted.name = entitySnapshot.name;
              if ('email' in entitySnapshot) details.deleted.email = entitySnapshot.email;
              // ...добавь другие поля, которые важны для твоей сущности
            }
            this.userActions.log(userId, logMeta.action, details);
          }),
        ),
      ),
    );
  }
}
