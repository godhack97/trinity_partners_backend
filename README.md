Получить структуру проекта

```bash
tree -I "node_modules|dist|.git|.vscode|.idea|coverage|*.log|*.pdf|*.hbs|.env*|.cache|.nyc_output|.next|build|*.jpg|*.png|*.2|*.44|*.xlsx|*.docx" -L 5
```


# GUARDS

## Как это работает:

1. **AuthGuard**: Проверяет токен, загружает пользователя с ролью и разрешениями, кладёт в `request.user`
2. **PermissionsGuard**: Читает декоратор `@RequirePermissions('api.deals.read')` и проверяет есть ли у `request.user` это разрешение
3. **RequirePermissions**: Просто **метка** для PermissionsGuard'а, сам ничего не проверяет

```javascript
@UseGuards(AuthGuard, PermissionsGuard) // ← Обязательно оба!
@Controller("deal")
export class DealController {
  
  @Get()
  @RequirePermissions('api.deals.read') // ← Декоратор для PermissionsGuard
  findAll() {}
}
```

## Если убрать AuthGuard:

```typescript
@UseGuards(PermissionsGuard) // ❌ Не будет работать!
@Controller("deal") 
export class DealController {
  
  @Get()
  @RequirePermissions('api.deals.read')
  findAll() {} // ← Упадёт с ошибкой - нет request.user
}
```
