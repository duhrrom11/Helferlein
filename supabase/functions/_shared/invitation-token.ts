/**
 * Staging-only invitation token primitives. NOT connected to an endpoint.
 * No database writes, messages, or invitation issuance.
 *
 * The raw token is a bearer secret: deliver only through a separately
 * reviewed secure channel, never log it, and store only its SHA-256 digest.
 * SHA-256 is suitable here because tokens have 256 bits of random entropy.
 */
const TOKEN_BYTES = 32;
const HEX_64 = /^[a-f0-9]{64}$/;

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns a 256-bit unpredictable one-time token; never use Math.random. */
export function createInvitationToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

/** Hash only a syntactically valid token; caller must never persist plaintext. */
export async function hashInvitationToken(token: string): Promise<string> {
  if (!HEX_64.test(token)) throw new Error("invalid_token");
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hex(new Uint8Array(digest));
}
