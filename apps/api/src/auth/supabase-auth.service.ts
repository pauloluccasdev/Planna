import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRequiredEnvironment } from '../config/environment.js';
import type { AuthUser } from './auth-user.js';

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      getRequiredEnvironment('SUPABASE_URL'),
      getRequiredEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
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

    return {
      id: subject,
      email:
        typeof data.claims.email === 'string' ? data.claims.email : undefined,
      claims: data.claims,
    };
  }
}
