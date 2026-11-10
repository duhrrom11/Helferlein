'use strict';

// Offline-only authorization decision core for a future server endpoint.
// This module does NOT authenticate callers, read databases, release keys,
// or authorize the existing Firebase client. Server must validate identity,
// load authoritative state, use server time, and commit transitions atomically.
const STATES = Object.freeze({
  LOCKED: 'LOCKED',
  ALARM_PENDING: 'ALARM_PENDING',
  RELEASED: 'RELEASED',
  CANCELLED: 'CANCELLED',
  REVOKED: 'REVOKED'
});
const MIN_DELAY_MS = 24 * 60 * 60 * 1000;

function isValidTime(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function requireContext(input) {
  if (!input || typeof input !== 'object' ||
      !Object.values(STATES).includes(input.state) ||
      !isValidTime(input.serverNowMs) ||
      typeof input.ownerId !== 'string' || !input.ownerId ||
      typeof input.actorId !== 'string' || !input.actorId ||
      !Array.isArray(input.activeHeirIds) ||
      !input.activeHeirIds.every(id => typeof id === 'string' && id.length > 0) ||
      !Number.isSafeInteger(input.version) || input.version < 0) {
    throw new TypeError('invalid_release_context');
  }
  if (input.state === STATES.ALARM_PENDING &&
      (!isValidTime(input.alarmStartedAtMs) || input.alarmStartedAtMs > input.serverNowMs)) {
    throw new TypeError('invalid_alarm_timestamp');
  }
  return input;
}
// Timing predicate only. It is NOT an authorization to release a key.
function releaseDue(input) {
  const ctx = requireContext(input);
  return ctx.state === STATES.ALARM_PENDING &&
    ctx.serverNowMs - ctx.alarmStartedAtMs >= MIN_DELAY_MS;
}
function decide(input, action) {
  const ctx = requireContext(input);
  const owner = ctx.actorId === ctx.ownerId;
  const heir = ctx.activeHeirIds.includes(ctx.actorId) && !owner;
  const denied = reason => ({ allowed: false, reason, nextState: ctx.state, nextVersion: ctx.version });
  const granted = state => ({ allowed: true, reason: 'ok', nextState: state, nextVersion: ctx.version + 1 });

  switch (action) {
    case 'TRIGGER_ALARM':
      return heir && (ctx.state === STATES.LOCKED || ctx.state === STATES.CANCELLED)
        ? granted(STATES.ALARM_PENDING) : denied('not_authorized_or_wrong_state');
    case 'CANCEL_ALARM':
      return owner && ctx.state === STATES.ALARM_PENDING
        ? granted(STATES.CANCELLED) : denied('not_authorized_or_wrong_state');
    // No RELEASE action here: a caller-controlled actorId can never prove server identity.
    // A future trusted endpoint must enforce authentication and an atomic state transition.
    case 'READ_HEIR_ENVELOPE':
      return heir && ctx.state === STATES.RELEASED
        ? { allowed: true, reason: 'ok', nextState: ctx.state, nextVersion: ctx.version }
        : denied('not_released_or_not_authorized');
    case 'REVOKE':
      return owner && ctx.state !== STATES.REVOKED
        ? granted(STATES.REVOKED) : denied('not_authorized_or_wrong_state');
    default:
      return denied('unknown_action');
  }
}
module.exports = { STATES, MIN_DELAY_MS, decide, releaseDue };
