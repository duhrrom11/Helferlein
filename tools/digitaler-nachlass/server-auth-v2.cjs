'use strict';

// Offline identity boundary. The verifier is a trusted server dependency,
// never an input provided by an HTTP caller. This module has no network or DB access.
function unauthorized() {
  const error = new Error('unauthorized');
  error.code = 'unauthorized';
  return error;
}
function parseBearer(value) {
  if (typeof value !== 'string' || value.length > 8192) throw unauthorized();
  const match = /^Bearer ([A-Za-z0-9._~+\/-]+={0,2})$/i.exec(value);
  if (!match || match[1].length < 16) throw unauthorized();
  return match[1];
}
async function authenticate(request, verifyToken) {
  if (!(request instanceof Request) || typeof verifyToken !== 'function') throw unauthorized();
  const token = parseBearer(request.headers.get('authorization'));
  let principal;
  try { principal = await verifyToken(token); }
  catch { throw unauthorized(); }
  if (!principal || typeof principal !== 'object' ||
      typeof principal.userId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(principal.userId) ||
      principal.verified !== true) throw unauthorized();
  // Never return token or copy user-controlled role, owner or admin fields.
  return Object.freeze({ userId: principal.userId });
}
module.exports = { parseBearer, authenticate };
