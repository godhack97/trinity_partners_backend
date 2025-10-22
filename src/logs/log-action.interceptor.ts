import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, from } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { UserActionsService } from "./user-actions.service";
import { LOG_ACTION_KEY, LogActionConfig } from "./log-action.decorator";
import { DataSource } from "typeorm";

@Injectable()
export class LogActionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly userActions: UserActionsService,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    function removePasswords(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(removePasswords);
      }
  
      if (obj && typeof obj === "object") {
        const result: any = {};
  
        for (const key of Object.keys(obj)) {
          if (
            !key.toLowerCase().includes("password") &&
            !key.toLowerCase().includes("repeat")
          ) {
            result[key] = removePasswords(obj[key]);
          }
        }
  
        return result;
      }
  
      return obj;
    }
  
    async function calculateChanges(oldEntity: any, newData: any, dataSource: DataSource): Promise<any> {
      if (!oldEntity || !newData) return {};
    
      // Если oldEntity - массив
      if (Array.isArray(oldEntity)) {
        // Проверяем, это связь многие-ко-многим или одиночная сущность
        const isSingleEntity = oldEntity.length === 1 && !newData.hasOwnProperty(Object.keys(oldEntity[0]).find(k => k.endsWith('_ids')) || '');
    
        if (isSingleEntity) {
          // Массив с одним элементом - распаковываем
          oldEntity = oldEntity[0];
        } else {
          // Массив связей - ищем поля типа *_ids в newData
          const changes: any = {};
    
          for (const key in newData) {
            if (key.endsWith('_ids') && Array.isArray(newData[key])) {
              const fieldName = key.replace('_ids', '_id');
              const oldValues = oldEntity.map(item => item[fieldName]).filter(v => v != null).sort((a, b) => a - b);
              const newValues = [...newData[key]].sort((a, b) => a - b);
    
              if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
                // Если это role_ids - получаем названия ролей
                if (key === 'role_ids') {
                  try {
                    const roleRepository = dataSource.getRepository('roles');
                    const allRoleIds = [...new Set([...oldValues, ...newValues])];
                    const roles = await roleRepository.findByIds(allRoleIds);
                    const roleMap = new Map(roles.map((r: any) => [r.id, r.name]));
    
                    changes[key] = {
                      old: oldValues.map(id => ({ id, name: roleMap.get(id) || 'Unknown' })),
                      new: newValues.map(id => ({ id, name: roleMap.get(id) || 'Unknown' }))
                    };
                  } catch (e) {
                    changes[key] = { old: oldValues, new: newValues };
                  }
                } else {
                  changes[key] = { old: oldValues, new: newValues };
                }
              }
            }
          }
    
          return changes;
        }
      }
    
      // Обработка обычной сущности (объекта)
      const changes: any = {};
      const excludeFields = ['created_at', 'updated_at', 'component_slots', 'slots', 'typeId'];
    
      for (const key in newData) {
        if (excludeFields.includes(key)) continue;
    
        if (oldEntity.hasOwnProperty(key)) {
          const oldVal = oldEntity[key];
          const newVal = newData[key];
    
          // Нормализация для сравнения
          const oldStr = oldVal instanceof Date ? oldVal.toISOString() : JSON.stringify(oldVal);
          const newStr = newVal instanceof Date ? newVal.toISOString() : JSON.stringify(newVal);
    
          if (oldStr !== newStr) {
            changes[key] = {
              old: oldVal,
              new: newVal
            };
          }
        } else {
          changes[key] = {
            old: null,
            new: newData[key]
          };
        }
      }
    
      return changes;
    }
  
    const logMeta = this.reflector.get<LogActionConfig>(
      LOG_ACTION_KEY,
      context.getHandler(),
    );
  
    if (!logMeta || !logMeta.action) return next.handle();
  
    const req = context.switchToHttp().getRequest();
    const userId = req.auth_user?.id;
    let snapshotPromise: Promise<any> = Promise.resolve(null);
  
    const entityId = req?.params?.backupId || req?.params?.id || req?.params?.slug;
  
    if (logMeta.entity && entityId && entityId.trim() !== "") {
      try {
        const repository = this.dataSource.getRepository(logMeta.entity);
        const primaryKey = logMeta.primaryKey || 'id';
    
        let whereCondition: any;
    
        if (Array.isArray(primaryKey)) {
          whereCondition = {};
          primaryKey.forEach(key => {
            if (key === 'user_id') {
              whereCondition[key] = +entityId;
            }
          });
        } else {
          // Определяем какое поле использовать для поиска
          let searchField = primaryKey;
          if (req?.params?.slug) {
            searchField = 'url'; // для news используется поле url
          }
    
          const idValue = isNaN(+entityId) ? entityId : +entityId;
          whereCondition = { [searchField]: idValue };
        }
    
        const qb = repository.createQueryBuilder('entity');
        if (Array.isArray(primaryKey)) {
          primaryKey.forEach(key => {
            if (key === 'user_id' && whereCondition[key]) {
              qb.andWhere(`entity.${key} = :${key}`, { [key]: whereCondition[key] });
            }
          });
          snapshotPromise = qb.getMany();
        } else {
          const searchField = whereCondition[primaryKey] !== undefined ? primaryKey : Object.keys(whereCondition)[0];
          qb.where(`entity.${searchField} = :value`, { value: whereCondition[searchField] });
          snapshotPromise = qb.getMany();
        }
      } catch (e) {
        snapshotPromise = Promise.resolve(null);
      }
    }
  
    return from(snapshotPromise).pipe(
      switchMap((entitySnapshot) =>
        next.handle().pipe(
          switchMap(async (result) => {
            const details: Record<string, any> = {
              entity: logMeta.entity,
              params: req.params,
              body: removePasswords(req.body),
              query: req.query,
            };
  
            if (entitySnapshot) {
              console.log('OLD SNAPSHOT:', entitySnapshot);
              console.log('NEW BODY:', req.body);
              const snapshot = Array.isArray(entitySnapshot) ? entitySnapshot : [entitySnapshot];
              details.deleted = snapshot.map(item => {
                const result: any = {};
                if ("id" in item) result.id = item.id;
                if ("user_id" in item) result.user_id = item.user_id;
                if ("role_id" in item) result.role_id = item.role_id;
                if ("name" in item) result.name = item.name;
                if ("email" in item) result.email = item.email;
                return result;
              });
  
              details.changes = await calculateChanges(entitySnapshot, req.body, this.dataSource);
            }
  
            this.userActions.log(userId, logMeta.action, details);
            return result;
          }),
        ),
      ),
    );
  }
}