/** NON-DEPLOYED: bind heir services to Supabase's verified auth.getUser(token).
 * This is NOT a JWT decoder, local signature check, or authorization by user JSON.
 * A server must supply a trusted, separately configured Supabase client.
 */
import type { VerifyUser } from './heir-staging-backend.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER = /^Bearer ([A-Za-z0-9._~-]{8,4096})$/;
export interface SupabaseAuthProvider {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: { id: string } | null } | null;
      error: unknown | null;
    }>;
  };
}
export function createHeirSupabaseVerifier(client: SupabaseAuthProvider): VerifyUser {
  return async (header: string | null): Promise<string | null> => {
    if (typeof header !== 'string' || header.length > 4200) return null;
    const match = BEARER.exec(header);
    if (!match) return null;
    try {
      const result = await client.auth.getUser(match[1]);
      if (result.error || !result.data?.user || !UUID.test(result.data.user.id)) return null;
      return result.data.user.id.toLowerCase();
    } catch { return null; }
  };
}
