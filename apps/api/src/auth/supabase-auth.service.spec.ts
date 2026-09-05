import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from './auth-user.js';
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

  it('returns the same neutral recovery result when the provider rejects the request', async () => {
    const prisma = {};
    const service = new SupabaseAuthService(prisma as PrismaService);
    const client = service as unknown as {
      client: { auth: { resetPasswordForEmail: ReturnType<typeof vi.fn> } };
    };
    client.client.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'over_email_send_rate_limit' },
    });

    await expect(
      service.requestPasswordRecovery({ email: ' aluno@example.com ' }),
    ).resolves.toEqual({ requested: true });
    expect(client.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'aluno@example.com',
      { redirectTo: expect.stringContaining('/reset-password') },
    );
  });

  it('changes the password, records the change and revokes active sessions', async () => {
    const transaction = {
      userAccount: { update: vi.fn().mockResolvedValue({ id: 'user-id' }) },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-id' }) },
    };
    const prisma = {
      userAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((callback) => callback(transaction)),
    };
    prisma.userAccount.findUnique.mockResolvedValue({
      passwordChangedAt: null,
    });
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    const internal = service as unknown as {
      adminClient: {
        auth: {
          admin: {
            updateUserById: ReturnType<typeof vi.fn>;
            signOut: ReturnType<typeof vi.fn>;
          };
        };
      };
    };
    internal.adminClient.auth.admin.updateUserById = vi
      .fn()
      .mockResolvedValue({ data: {}, error: null });
    internal.adminClient.auth.admin.signOut = vi
      .fn()
      .mockResolvedValue({ error: null });

    await expect(
      service.resetPassword(
        {
          id: '9ecb881f-e831-43e8-8212-2d28545cbf45',
          username: 'aluno',
          role: 'STUDENT',
          claims: { iat: 1_788_537_600 } as AuthUser['claims'],
        },
        'recovery-token',
        'nova-senha-segura',
      ),
    ).resolves.toEqual({ completed: true });
    expect(internal.adminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      '9ecb881f-e831-43e8-8212-2d28545cbf45',
      { password: 'nova-senha-segura' },
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PASSWORD_RESET_COMPLETED' }),
      }),
    );
    expect(internal.adminClient.auth.admin.signOut).toHaveBeenCalledWith(
      'recovery-token',
      'global',
    );
  });

  it('rejects a recovery token issued before the last password change', async () => {
    const prisma = {
      userAccount: {
        findUnique: vi.fn().mockResolvedValue({
          passwordChangedAt: new Date('2026-09-05T12:00:00.000Z'),
        }),
      },
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);

    await expect(
      service.resetPassword(
        {
          id: '9ecb881f-e831-43e8-8212-2d28545cbf45',
          username: 'aluno',
          role: 'STUDENT',
          claims: { iat: 1_788_537_600 } as AuthUser['claims'],
        },
        'used-token',
        'outra-senha-segura',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects application access tokens issued before a password change', async () => {
    const prisma = {
      userAccount: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'aluno@example.com',
          username: 'aluno',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordChangedAt: new Date('2026-09-05T12:00:00.000Z'),
        }),
      },
    };
    const service = new SupabaseAuthService(prisma as unknown as PrismaService);
    const internal = service as unknown as {
      client: { auth: { getClaims: ReturnType<typeof vi.fn> } };
    };
    internal.client.auth.getClaims = vi.fn().mockResolvedValue({
      data: {
        claims: {
          sub: '9ecb881f-e831-43e8-8212-2d28545cbf45',
          iat: 1_788_537_600,
        },
      },
      error: null,
    });

    await expect(service.verifyAccessToken('old-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
