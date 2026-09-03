import type { JwtPayload } from '@supabase/supabase-js';
import type { UserRole } from '../generated/prisma/enums.js';

export interface AuthUser {
  id: string;
  email?: string;
  username: string;
  role: UserRole;
  claims: JwtPayload;
}
