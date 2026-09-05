import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UserRole } from '../generated/prisma/enums.js';
import { AdminGuard } from './admin.guard.js';

function context(role?: UserRole) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ authUser: role ? { role } : undefined }),
    }),
  };
}

describe('AdminGuard', () => {
  it('allows administrators', () => {
    expect(new AdminGuard().canActivate(context(UserRole.ADMIN) as never)).toBe(
      true,
    );
  });

  it.each([UserRole.STUDENT, undefined])(
    'rejects a non-admin actor (%s)',
    (role) => {
      expect(() =>
        new AdminGuard().canActivate(context(role) as never),
      ).toThrow(ForbiddenException);
    },
  );
});
