import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { SupabaseAuthService } from './supabase-auth.service.js';

describe('SupabaseAuthService', () => {
  it('returns a neutral error when the username does not exist', async () => {
    const prisma = {
      userAccount: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    await expect(
      service.login({
        username: 'usuario_inexistente',
        password: 'senha-qualquer',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes the username before querying the account', async () => {
    const prisma = {
      userAccount: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    await expect(
      service.login({ username: '  Paulo.Lucas ', password: 'senha-qualquer' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.userAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usernameNormalized: 'paulo.lucas' } }),
    );
  });
});
