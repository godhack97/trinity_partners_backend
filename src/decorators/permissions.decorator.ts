import { createAccessContractDecorator } from './access-contract.decorator';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  createAccessContractDecorator(
    PERMISSIONS_KEY,
    'x-required-permissions',
    permissions,
  );
