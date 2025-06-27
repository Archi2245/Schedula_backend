import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
<<<<<<< HEAD
=======
import { Role } from '../../types/roles.enum'; // ✅ FIXED
import { JwtPayload } from '../../types/jwt-payload.interface'; // ✅ FIXED
>>>>>>> main

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
<<<<<<< HEAD
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true; // no role restriction

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Access denied: ${user.role} not allowed`);
=======
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied: role not allowed');
>>>>>>> main
    }

    return true;
  }
}
