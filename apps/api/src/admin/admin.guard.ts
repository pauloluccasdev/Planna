import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '../generated/prisma/enums.js';
import type { AuthUser } from '../auth/auth-user.js';

type AuthenticatedRequest = Request & { authUser?: AuthUser };

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().authUser;
    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        error: {
          code: 'ADMIN_ACCESS_REQUIRED',
          message: 'Esta ação exige acesso administrativo.',
        },
      });
    }
    return true;
  }
}
