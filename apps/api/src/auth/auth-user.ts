import type { JwtPayload } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email?: string;
  claims: JwtPayload;
}
