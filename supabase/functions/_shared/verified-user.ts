/**
 * Staging-only authentication helper; not connected to a deployed endpoint.
 * The caller must provide a Supabase client configured server-side for the
 * intended staging project. Do not pass service-role credentials to browsers.
 */
export type AuthUserLookup = {
  auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string } | null };
      error: unknown | null;
    }>;
  };
};

/** Fail closed: never trust user IDs or roles from request JSON or URL. */
export async function getVerifiedUserId(
  client: AuthUserLookup,
  authorizationHeader: string | null,
): Promise<string | null> {
  if (!authorizationHeader) return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorizationHeader);
  if (!match) return null;
  try {
    const { data, error } = await client.auth.getUser(match[1]);
    if (error || !data.user || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.user.id)) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}
