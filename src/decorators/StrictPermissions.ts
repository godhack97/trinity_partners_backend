import { applyDecorators, SetMetadata } from "@nestjs/common";
import { RequirePermissions } from "./permissions.decorator";

export const STRICT_PERMISSIONS = "strict_permissions";

export const StrictPermissions = (...permissions: string[]) =>
  applyDecorators(
    RequirePermissions(...permissions),
    SetMetadata(STRICT_PERMISSIONS, permissions),
  );
