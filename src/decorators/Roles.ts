import { Reflector } from '@nestjs/core';
import { SetMetadata } from "@nestjs/common";

export const ACCEPTED_ROLES = 'accepted_roles';
export const Roles = (roles: string[] = []) => SetMetadata(ACCEPTED_ROLES, roles);