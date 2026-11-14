// Dependency-free, pure request and quota guards. Shared with Node tests.
export const MAX_REQUEST_BYTES = 4096;
export const ALLOWED_ORIGINS = Object.freeze([
  'https://duhrrom11.github.io',
]);
export function corsOrigin(value) {
  return typeof value === 'string' && ALLOWED_ORIGINS.includes(value) ? value : null;
}
export function parseBodyText(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_REQUEST_BYTES) throw new GuardError('TOO_LARGE','Anfrage zu groß.',413);
  let body;
  try { body = JSON.parse(text); } catch { throw new GuardError('BAD_JSON','Ungültige JSON-Anfrage.',400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.url !== 'string') throw new GuardError('BAD_JSON','Nur eine Listenadresse ist erlaubt.',400);
  return body.url;
}
export class GuardError extends Error { constructor(code,message,status) { super(message);this.name='GuardError';this.code=code;this.status=status; } }
export function quotaDecision(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.allowed !== 'boolean') throw new GuardError('QUOTA_UNAVAILABLE','Abrufbegrenzung derzeit nicht verfügbar.',503);
  if (payload.allowed === true && payload.retry_after_seconds === 0) return {allowed:true,retryAfter:0};
  if (payload.allowed === false && Number.isInteger(payload.retry_after_seconds) && payload.retry_after_seconds>=1 && payload.retry_after_seconds<=86400) return {allowed:false,retryAfter:payload.retry_after_seconds};
  throw new GuardError('QUOTA_UNAVAILABLE','Abrufbegrenzung derzeit nicht verfügbar.',503);
}
export function validQuotaConfig(url,key) {
  return typeof url==='string' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && typeof key==='string' && key.length>30;
}
