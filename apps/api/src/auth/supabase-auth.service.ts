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

  private normalize(value: string) {
    return value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
  }

  private throwAccountConflict(): never {
    throw new ConflictException({
      error: {
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'O nome de usuário ou e-mail informado não está disponível.',
      },
    });
  }
}
