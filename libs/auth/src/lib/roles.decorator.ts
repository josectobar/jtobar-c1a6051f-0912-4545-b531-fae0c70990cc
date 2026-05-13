import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from './permissions.config';

export const ROLES_KEY = 'roles';
export const Roles = (...actions: PermissionAction[]) =>
  SetMetadata(ROLES_KEY, actions);
