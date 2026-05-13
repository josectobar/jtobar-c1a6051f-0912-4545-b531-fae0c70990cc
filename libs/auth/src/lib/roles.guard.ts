import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction, ROLE_PERMISSIONS } from './permissions.config';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from './user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredActions = this.reflector.getAllAndOverride<PermissionAction[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredActions || requiredActions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: { role?: UserRole } }>();

    if (!user || !user.role) {
      throw new ForbiddenException();
    }

    const permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions) {
      throw new ForbiddenException();
    }

    const allowed = requiredActions.every((action) => permissions[action]);
    if (!allowed) {
      throw new ForbiddenException();
    }

    return true;
  }
}
