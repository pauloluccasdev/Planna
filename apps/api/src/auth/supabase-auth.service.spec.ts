import { ConflictException, UnauthorizedException } from '@nestjs/common';
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

  it('creates the application account with normalized unique fields', async () => {
    const createdAt = new Date('2026-09-05T12:00:00Z');
    const account = {
      id: '9ecb881f-e831-43e8-8212-2d28545cbf45',
      username: 'Paulo.Lucas',
      email: 'Paulo@example.com',
      role: 'STUDENT',
      emailVerifiedAt: null,
      createdAt,
    };
    const transaction = {
      userAccount: { create: vi.fn().mockResolvedValue(account) },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-id' }) },
    };
    const prisma = {
      userAccount: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((callback) => callback(transaction)),
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    const client = service as unknown as {
      client: {
        auth: {
          signUp: ReturnType<typeof vi.fn>;
        };
      };
    };
    client.client.auth.signUp = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: account.id,
          identities: [{ id: 'identity-id' }],
          email_confirmed_at: null,
        },
      },
      error: null,
    });

    await expect(
      service.register({
        username: '  Paulo.Lucas ',
        email: ' Paulo@example.com ',
        password: 'senha-segura',
      }),
    ).resolves.toEqual({
      user: account,
      emailVerificationRequired: true,
    });
    expect(transaction.userAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'Paulo.Lucas',
          usernameNormalized: 'paulo.lucas',
          email: 'Paulo@example.com',
          emailNormalized: 'paulo@example.com',
        }),
      }),
    );
    expect(transaction.auditEvent.create).toHaveBeenCalled();
  });

  it('does not call Supabase when username or email is already registered', async () => {
    const prisma = {
      userAccount: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    const client = service as unknown as {
      client: { auth: { signUp: ReturnType<typeof vi.fn> } };
    };
    client.client.auth.signUp = vi.fn();

    await expect(
      service.register({
        username: 'paulo',
        email: 'paulo@example.com',
        password: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(client.client.auth.signUp).not.toHaveBeenCalled();
  });

  it('reports the Supabase email delivery rate limit accurately', async () => {
    const prisma = {
      userAccount: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    const client = service as unknown as {
      client: { auth: { signUp: ReturnType<typeof vi.fn> } };
    };
    client.client.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { code: 'over_email_send_rate_limit' },
    });

    await expect(
      service.register({
        username: 'paulo',
        email: 'paulo@example.com',
        password: 'senha-segura',
      }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
