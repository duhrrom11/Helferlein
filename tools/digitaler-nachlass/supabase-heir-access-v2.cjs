'use strict';

// Offline Supabase authorization boundary. The server must verify the JWT,
// load membership from protected tables, and supply trusted server time.
// No database calls, key material, client roles, or release side effects.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VAULT_ID = /^v_[A-Za-z0-9_-]{8,128}$/;
const STATES = new Set(['LOCKED', 'ALARM_PENDING', 'RELEASED', 'CANCELLED', 'REVOKED']);
const ACTIONS = new Set(['READ_OWNER', 'READ_HEIR_ENVELOPE', 'TRIGGER_ALARM', 'CANCEL_ALARM', 'REVOKE']);
const deny = () => Object.freeze({ allowed: false, reason: 'forbidden' });

function authorize({ principal, vault, membership, action } = {}) {
  if (!principal || principal.verified !== true || !UUID.test(principal.userId || '') ||
      !vault || !VAULT_ID.test(vault.id || '') || !UUID.test(vault.ownerUserId || '') || !STATES.has(vault.state) ||
      !ACTIONS.has(action)) return deny();
  const owner = principal.userId === vault.ownerUserId;
  if (action === 'READ_OWNER') return owner ? Object.freeze({ allowed: true, reason: 'owner' }) : deny();
  if (action === 'CANCEL_ALARM') return owner && vault.state === 'ALARM_PENDING'
    ? Object.freeze({ allowed: true, reason: 'owner' }) : deny();
  if (action === 'REVOKE') return owner && vault.state !== 'REVOKED'
    ? Object.freeze({ allowed: true, reason: 'owner' }) : deny();
  // Membership is an authoritative server-side row, never a client claim.
  const heir = !owner && membership && membership.vaultId === vault.id &&
    membership.userId === principal.userId && membership.status === 'ACTIVE' &&
    membership.identityVerified === true;
  if (!heir) return deny();
  if (action === 'TRIGGER_ALARM') return ['LOCKED', 'CANCELLED'].includes(vault.state)
    ? Object.freeze({ allowed: true, reason: 'invited_heir' }) : deny();
  if (action === 'READ_HEIR_ENVELOPE') return vault.state === 'RELEASED'
    ? Object.freeze({ allowed: true, reason: 'released_heir' }) : deny();
  return deny();
}

module.exports = { authorize };
