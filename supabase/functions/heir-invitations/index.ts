/** LOCAL ONLY: supabase/functions/heir-invitations/index.ts
 * Authenticated owner-only issuance and revocation. No data disclosure.
 * Requires reviewed SQL, service-role secret, explicit enable flag, JWT verification.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { createInvitationToken, hashInvitationToken } from "../_shared/invitation-token.ts";
const ORIGIN = "https://duhrrom11.github.io";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const enabled = Deno.env.get("HEIR_INVITATIONS_ENABLED") === "true";
const configured = !!(url && anonKey && serviceKey && enabled);
const auth = configured ? createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const admin = configured ? createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
function json(status: number, body: Record<string, unknown>, headers: Headers) {
 return new Response(JSON.stringify(body), { status, headers });
}
Deno.serve(async (request: Request) => {
 const origin = request.headers.get("Origin");
 const headers = new Headers({"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"});
 if (origin === ORIGIN) {
  headers.set("Access-Control-Allow-Origin",ORIGIN);
  headers.set("Access-Control-Allow-Headers","authorization, apikey, content-type");
  headers.set("Access-Control-Allow-Methods","POST, OPTIONS");
 }
 if (request.method === "OPTIONS") return new Response(null,{status:origin===ORIGIN?204:403,headers});
 if (origin && origin !== ORIGIN) return json(403,{error:"forbidden_origin"},headers);
 if (request.method !== "POST") return json(405,{error:"method_not_allowed"},headers);
 if (!configured || !auth || !admin) return json(503,{error:"not_configured"},headers);
 const bearer = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(request.headers.get("Authorization") ?? "");
 if (!bearer) return json(401,{error:"unauthorized"},headers);
 let ownerId: string;
 try {
  const {data,error} = await auth.auth.getUser(bearer[1]);
  if (error || !data.user || !UUID.test(data.user.id)) return json(401,{error:"unauthorized"},headers);
  ownerId = data.user.id;
 } catch { return json(401,{error:"unauthorized"},headers); }
 if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("Content-Type") ?? ""))
  return json(415,{error:"unsupported_media_type"},headers);
 let input: Record<string,unknown>;
 try {
  const reader = request.body?.getReader();
  if (!reader) return json(400,{error:"invalid_request"},headers);
  const parts: Uint8Array[] = []; let count = 0;
  try {
   while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    count += value.byteLength;
    if (count > 1024) { await reader.cancel(); return json(413,{error:"request_too_large"},headers); }
    parts.push(value);
   }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(count); let offset = 0;
  for (const part of parts) { bytes.set(part,offset); offset += part.length; }
  const raw = new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
  input = parsed as Record<string,unknown>;
 } catch { return json(400,{error:"invalid_request"},headers); }
 try {
  if (input.action === "issue" && Object.keys(input).sort().join(",") === "action,recipientUserId") {
   if (typeof input.recipientUserId !== "string" || !UUID.test(input.recipientUserId) || input.recipientUserId === ownerId)
    return json(400,{error:"invalid_request"},headers);
   const token = createInvitationToken();
   const tokenHash = await hashInvitationToken(token);
   // Keep below the SQL seven-day maximum despite clock skew between runtimes.
   const expiresAt = new Date(Date.now() + 6*24*60*60*1000).toISOString();
   const {data,error} = await admin.rpc("issue_heir_invitation_atomic",{
    p_owner_user_id:ownerId,p_recipient_user_id:input.recipientUserId,
    p_token_hash_hex:tokenHash,p_expires_at:expiresAt,
   });
   if (error || typeof data !== "string" || !UUID.test(data)) return json(409,{error:"not_available"},headers);
   // Token returned ONCE; never log, store in URL, or put into analytics.
   return json(201,{invitationId:data,token,expiresAt},headers);
  }
  if (input.action === "revoke" && Object.keys(input).sort().join(",") === "action,invitationId") {
   if (typeof input.invitationId !== "string" || !UUID.test(input.invitationId))
    return json(400,{error:"invalid_request"},headers);
   const {data,error} = await admin.rpc("revoke_heir_invitation_atomic",{
    p_owner_user_id:ownerId,p_invitation_id:input.invitationId,
   });
   return !error && data === true ? json(200,{status:"revoked"},headers) : json(404,{error:"not_found"},headers);
  }
  return json(400,{error:"invalid_request"},headers);
 } catch { return json(503,{error:"unavailable"},headers); }
});