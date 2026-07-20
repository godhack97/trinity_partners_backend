import 'reflect-metadata';
import { ACCEPTED_ROLES } from '@decorators/Roles';
import { RoleTypes } from '@app/types/RoleTypes';
import { DocumentsController } from '@api/documents/documents.controller';
import { DownloadCentrController } from '@api/download-centr/download-centr.controller';
import { RecommendedConfigsController } from '@api/recommended-configs/recommended-configs.controller';
import { ConfiguratorController } from '@api/configurator/configurator.controller';
import { AdminImageController } from './image/admin-image.controller';
import { AdminCountsController } from './counts/admin-counts.controller';
import { UserController } from '@api/user/user.controller';
import { UsersController } from '@api/users/users.controller';
import { DealController } from '@api/deal/deal.controller';
import { AdminPermissionsController } from './permissions/admin-permissions.controller';
import { Bitrix24AdminController } from '@integrations/bitrix24/bitrix24-admin.controller';

const OPENAPI_EXTENSION_METADATA = 'swagger/apiExtension';

const handlerRoles = (controller: any, method: string): RoleTypes[] | undefined =>
  Reflect.getMetadata(ACCEPTED_ROLES, controller.prototype[method]);

const controllerRoles = (controller: any): RoleTypes[] | undefined =>
  Reflect.getMetadata(ACCEPTED_ROLES, controller);

const handlerOpenApiAccess = (controller: any, method: string) =>
  Reflect.getMetadata(
    OPENAPI_EXTENSION_METADATA,
    controller.prototype[method],
  );

describe('administrative access metadata', () => {
  const documentEditors = [
    RoleTypes.SuperAdmin,
    RoleTypes.EmployeeAdmin,
    RoleTypes.ContentManager,
  ];
  const employeeEditors = [
    RoleTypes.SuperAdmin,
    RoleTypes.EmployeeAdmin,
  ];

  test('keeps document reads available while protecting document mutations', () => {
    expect(handlerRoles(DocumentsController, 'findAll')).toBeUndefined();
    expect(handlerRoles(DocumentsController, 'create')).toEqual(documentEditors);
    expect(handlerRoles(DocumentsController, 'update')).toEqual(documentEditors);
    expect(handlerRoles(DocumentsController, 'remove')).toEqual(documentEditors);
    expect(handlerRoles(DocumentsController, 'createGroup')).toEqual(documentEditors);
    expect(handlerRoles(DocumentsController, 'createAccessLevel')).toEqual(employeeEditors);
  });

  test('keeps download reads available while protecting mutations', () => {
    expect(handlerRoles(DownloadCentrController, 'findAll')).toBeUndefined();
    expect(handlerRoles(DownloadCentrController, 'create')).toEqual(employeeEditors);
    expect(handlerRoles(DownloadCentrController, 'update')).toEqual(employeeEditors);
    expect(handlerRoles(DownloadCentrController, 'remove')).toEqual(employeeEditors);
  });

  test('restricts recommended configs and component type writes to super admin', () => {
    expect(handlerRoles(RecommendedConfigsController, 'findAll')).toBeUndefined();
    expect(handlerRoles(RecommendedConfigsController, 'findAllAdmin')).toEqual([
      RoleTypes.SuperAdmin,
    ]);
    expect(handlerRoles(RecommendedConfigsController, 'create')).toEqual([
      RoleTypes.SuperAdmin,
    ]);
    expect(handlerRoles(RecommendedConfigsController, 'update')).toEqual([
      RoleTypes.SuperAdmin,
    ]);
    expect(handlerRoles(RecommendedConfigsController, 'remove')).toEqual([
      RoleTypes.SuperAdmin,
    ]);
    expect(handlerRoles(ConfiguratorController, 'getComponentTypes')).toBeUndefined();
    expect(handlerRoles(ConfiguratorController, 'createComponentType')).toEqual([
      RoleTypes.SuperAdmin,
    ]);
  });

  test('protects admin image uploads and lets partner managers load counts', () => {
    expect(controllerRoles(AdminImageController)).toEqual([RoleTypes.SuperAdmin]);
    expect(controllerRoles(AdminCountsController)).toEqual(
      expect.arrayContaining([
        RoleTypes.SuperAdmin,
        RoleTypes.EmployeeAdmin,
        RoleTypes.ContentManager,
        RoleTypes.PartnerManager,
      ]),
    );
  });

  test('protects user directories and limits partner manager updates', () => {
    expect(controllerRoles(UsersController)).toEqual([RoleTypes.SuperAdmin]);
    expect(handlerRoles(UserController, 'findAll')).toEqual([RoleTypes.SuperAdmin]);
    expect(handlerRoles(UserController, 'update')).toEqual([RoleTypes.SuperAdmin]);
    expect(handlerRoles(UserController, 'remove')).toEqual([RoleTypes.SuperAdmin]);
    expect(handlerRoles(UserController, 'updatePartner')).toEqual([
      RoleTypes.SuperAdmin,
      RoleTypes.PartnerManager,
    ]);
  });

  test('keeps direct deal deletion as an explicit super-admin bypass', () => {
    expect(handlerRoles(DealController, 'remove')).toEqual([
      RoleTypes.SuperAdmin,
    ]);
  });

  test('publishes class and handler access rules as OpenAPI extensions', () => {
    expect(handlerOpenApiAccess(AdminCountsController, 'getAllCounts')).toEqual({
      'x-required-roles': expect.arrayContaining([
        RoleTypes.SuperAdmin,
        RoleTypes.ContentManager,
        RoleTypes.EmployeeAdmin,
        RoleTypes.PartnerManager,
      ]),
    });
    expect(handlerOpenApiAccess(DealController, 'remove')).toEqual({
      'x-required-permissions': ['api.deals.remove'],
      'x-required-roles': [RoleTypes.SuperAdmin],
    });
    expect(
      handlerOpenApiAccess(AdminPermissionsController, 'findAllPermissions'),
    ).toEqual({
      'x-required-permissions': ['system.permissions.manage'],
    });
    expect(handlerOpenApiAccess(Bitrix24AdminController, 'forceResyncAll')).toEqual({
      'x-required-roles': [RoleTypes.SuperAdmin],
    });
  });
});
