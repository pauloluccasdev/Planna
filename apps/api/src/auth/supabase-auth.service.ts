import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRequiredEnvironment } from '../config/environment.js';
import { PrismaService } from '../database/prisma.service.js';
import { AccountStatus } from '../generated/prisma/enums.js';
import type { AuthUser } from './auth-user.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient;
  private readonly supabaseUrl = getRequiredEnvironment('SUPABASE_URL');
  private readonly publishableKey = getRequiredEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );

  constructor(private readonly prisma: PrismaService) {
    this.client = createClient(this.supabaseUrl, this.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async login(input: LoginDto) {
    const usernameNormalized = input.username
      .trim()
      .normalize('NFKC')
      .toLocaleLowerCase('pt-BR');
    const account = await this.prisma.userAccount.findUnique({
      where: { usernameNormalized },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    });
    if (!account || account.status !== AccountStatus.ACTIVE)
      this.throwInvalidCredentials();

    const loginClient = createClient(this.supabaseUrl, this.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await loginClient.auth.signInWithPassword({
      email: account.email,
      password: input.password,
    });
    if (error || !data.session) this.throwInvalidCredentials();

    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      user: { id: account.id, username: account.username, role: account.role },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        expiresIn: data.session.expires_in,
        tokenType: data.session.token_type,
      },
    };
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.getClaims(token);
    const subject = data?.claims.sub;

    if (error || !subject) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_ACCESS_TOKEN',
          message: 'Sessão inválida ou expirada.',
        },
      });
    }

    const account = await this.prisma.userAccount.findUnique({
      where: { id: subject },
      select: { email: true, username: true, role: true, status: true },
    });
    if (!account || account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException({
        error: {
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'Esta conta não está disponível para acesso.',
        },
      });
    }

    return {
      id: subject,
      email: account.email,
      username: account.username,
      role: account.role,
      claims: data.claims,
    };
  }

  private throwInvalidCredentials(): never {
    throw new UnauthorizedException({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Nome de usuário ou senha inválidos.',
      },
    });
  }
}
