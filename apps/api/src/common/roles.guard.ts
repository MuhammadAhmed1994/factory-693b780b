import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './session-auth.guard';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    const hasRequiredRole = role !== undefined && requiredRoles.some(
      (requiredRole) =>
        role === requiredRole || (requiredRole === UserRole.MEMBER && role === UserRole.LEAD),
    );
    if (!hasRequiredRole) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    return true;
  }
}
