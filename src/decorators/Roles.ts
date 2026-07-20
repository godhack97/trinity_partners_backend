import { createAccessContractDecorator } from "./access-contract.decorator";

export const ACCEPTED_ROLES = "accepted_roles";
export const Roles = (roles: string[] = []) =>
  createAccessContractDecorator(
    ACCEPTED_ROLES,
    "x-required-roles",
    roles,
  );
