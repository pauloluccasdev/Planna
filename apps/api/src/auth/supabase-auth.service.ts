import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRequiredEnvironment } from '../config/environment.js';
import { PrismaService } from '../database/prisma.service.js';
import { AccountStatus } from '../generated/prisma/enums.js';
import type { AuthUser } from './auth-user.js';
import type { LoginDto } from './dto/login.dto.js';
import type { PasswordRecoveryDto } from './dto/password-recovery.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient;
  private readonly adminClient: SupabaseClient;
  private readonly supabaseUrl = getRequiredEnvironment('SUPABASE_URL');
  private readonly publishableKey = getRequiredEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );

  constructor(private readonly prisma: PrismaService) {
    this.client = createClient(this.supabaseUrl, this.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    this.adminClient = createClient(
      this.supabaseUrl,
      getRequiredEnvironment('SUPABASE_SECRET_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  async register(input: RegisterDto) {
    const username = input.username.trim().normalize('NFKC');
    const usernameNormalized = this.normalize(username);
    const email = input.email.trim().normalize('NFKC');
    const emailNormalized = this.normalize(email);
    const existing = await this.prisma.userAccount.findFirst({
      where: { OR: [{ usernameNormalized }, { emailNormalized }] },
      select: { id: true },
    });
    if (existing) this.throwAccountConflict();

    const { data, error } = await this.client.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: getRequiredEnvironment(
          'EMAIL_CONFIRMATION_REDIRECT_URL',
        ),
      },
    });
    const authUser = data.user;
    if (error) {
      if (error.code === 'over_email_send_rate_limit') {
        throw new HttpException(
          {
            error: {
              code: 'EMAIL_RATE_LIMITED',
              message:
                'Muitas confirmações foram solicitadas. Aguarde e tente novamente.',
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (error.code === 'email_address_invalid') {
        throw new UnprocessableEntityException({
          error: {
            code: 'INVALID_EMAIL',
            message: 'O provedor não aceitou o endereço de e-mail informado.',
          },
        });
      }
      throw new InternalServerErrorException({
        error: {
          code: 'ACCOUNT_REGISTRATION_FAILED',
          message: 'Não foi possível criar a conta. Tente novamente.',
        },
      });
    }
    if (!authUser || authUser.identities?.length === 0) {
      this.throwAccountConflict();
    }

    try {
      const account = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.userAccount.create({
          data: {
            id: authUser.id,
            username,
            usernameNormalized,
            email,
            emailNormalized,
            emailVerifiedAt: authUser.email_confirmed_at
              ? new Date(authUser.email_confirmed_at)
              : null,
          },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        });
        await transaction.auditEvent.create({
          data: {
            actorUserId: created.id,
            studentScopeId: created.id,
            action: 'ACCOUNT_REGISTERED',
            entityType: 'USER_ACCOUNT',
            entityId: created.id,
          },
        });
        return created;
      });
      return {
        user: account,
        emailVerificationRequired: account.emailVerifiedAt === null,
      };
    } catch {
      await this.adminClient.auth.admin.deleteUser(authUser.id).catch(() => {});
      const collided = await this.prisma.userAccount.findFirst({
        where: { OR: [{ usernameNormalized }, { emailNormalized }] },
        select: { id: true },
      });
      if (collided) this.throwAccountConflict();
      throw new InternalServerErrorException({
        error: {
          code: 'ACCOUNT_REGISTRATION_FAILED',
          message: 'Não foi possível criar a conta. Tente novamente.',
        },
      });
    }
  }

  async login(input: LoginDto) {
    const usernameNormalized = this.normalize(input.username);
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

    const loginClient = this.createIsolatedClient();
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
      session: this.serializeSession(data.session),
    };
  }

  async requestPasswordRecovery(input: PasswordRecoveryDto) {
    const email = input.email.trim().normalize('NFKC');
    await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: getRequiredEnvironment('PASSWORD_RECOVERY_REDIRECT_URL'),
    });

    return { requested: true };
  }

  async resetPassword(user: AuthUser, accessToken: string, password: string) {
    const issuedAt =
      typeof user.claims.iat === 'number'
        ? new Date(user.claims.iat * 1_000)
        : null;
    const account = await this.prisma.userAccount.findUnique({
      where: { id: user.id },
      select: { passwordChangedAt: true },
    });
    if (
      !issuedAt ||
      !account ||
      (account.passwordChangedAt && issuedAt < account.passwordChangedAt)
    ) {
      this.throwExpiredPasswordReset();
    }

    const { error } = await this.adminClient.auth.admin.updateUserById(
      user.id,
      {
        password,
      },
    );
    if (error) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PASSWORD_RESET_REJECTED',
          message: 'Não foi possível usar esta senha. Escolha outra senha.',
        },
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.userAccount.update({
        where: { id: user.id },
        data: { passwordChangedAt: new Date() },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: user.id,
          studentScopeId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'USER_ACCOUNT',
          entityId: user.id,
        },
      });
    });
    await this.adminClient.auth.admin.signOut(accessToken, 'global');

    return { completed: true };
  }

  async logout(accessToken: string) {
    const { error } = await this.adminClient.auth.admin.signOut(
      accessToken,
      'global',
    );
    if (error) {
      throw new InternalServerErrorException({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Não foi possível encerrar a sessão no servidor.',
        },
      });
    }
    return { completed: true };
  }

  async refreshSession(refreshToken: string) {
    const refreshClient = this.createIsolatedClient();
    const { data, error } = await refreshClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.user || !data.session) this.throwInvalidRefreshToken();

    const account = await this.prisma.userAccount.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        passwordChangedAt: true,
      },
    });
    const issuedAt = data.session.expires_at
      ? new Date((data.session.expires_at - data.session.expires_in) * 1_000)
      : null;
    if (
      !account ||
      account.status !== AccountStatus.ACTIVE ||
      !issuedAt ||
      (account.passwordChangedAt && issuedAt < account.passwordChangedAt)
    ) {
      await this.adminClient.auth.admin.signOut(
        data.session.access_token,
        'global',
      );
      this.throwInvalidRefreshToken();
    }

    return {
      user: { id: account.id, username: account.username, role: account.role },
      session: this.serializeSession(data.session),
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
      select: {
        email: true,
        username: true,
        role: true,
        status: true,
        passwordChangedAt: true,
      },
    });
    const issuedAt =
      typeof data.claims.iat === 'number'
        ? new Date(data.claims.iat * 1_000)
        : null;
    if (
      !account ||
      account.status !== AccountStatus.ACTIVE ||
      !issuedAt ||
      (account.passwordChangedAt && issuedAt < account.passwordChangedAt)
    ) {
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

  private throwInvalidRefreshToken(): never {
    throw new UnauthorizedException({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Não foi possível renovar esta sessão.',
      },
    });
  }

  private serializeSession(session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in: number;
    token_type: string;
  }) {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      expiresIn: session.expires_in,
      tokenType: session.token_type,
    };
  }

  private normalize(value: string) {
    return value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
  }

  private createIsolatedClient() {
    return createClient(this.supabaseUrl, this.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private throwAccountConflict(): never {
    throw new ConflictException({
      error: {
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'O nome de usuário ou e-mail informado não está disponível.',
      },
    });
  }

  private throwExpiredPasswordReset(): never {
    throw new UnauthorizedException({
      error: {
        code: 'PASSWORD_RESET_EXPIRED',
        message: 'Este link de recuperação expirou ou já foi utilizado.',
      },
    });
  }
}
