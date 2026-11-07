/**
 * Typed transport contracts for a future trusted-person invitation gateway.
 * No endpoint, credentials, or network calls are configured by this module.
 * Do not enable until a reviewed server-side identity-bound gateway exists.
 */
export type InvitationSummary = Readonly<{
  id: string;
  intendedUserId: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "revoked";
}>;

export type TrustedPersonSummary = Readonly<{
  userId: string;
  status: "active" | "revoked";
  addedAt: string;
}>;

export type TrustedPersonView = Readonly<{
  userId: string;
  status: TrustedPersonSummary["status"];
  addedAt: string;
  canRemove: boolean;
}>;

/** Active people first, then newest. No access is granted by this view model. */
export function trustedPersonViews(
  persons: readonly TrustedPersonSummary[],
): readonly TrustedPersonView[] {
  return persons.map((person) => ({
    userId: person.userId,
    status: person.status,
    addedAt: person.addedAt,
    canRemove: person.status === "active",
  })).sort((a, b) => {
    if (a.canRemove !== b.canRemove) return a.canRemove ? -1 : 1;
    const aTime = Date.parse(a.addedAt);
    const bTime = Date.parse(b.addedAt);
    return (Number.isFinite(bTime) ? bTime : 0) -
      (Number.isFinite(aTime) ? aTime : 0);
  });
}

export type TrustedPersonOverview = Readonly<{
  invitations: readonly InvitationSummary[];
  trustedPersons: readonly TrustedPersonSummary[];
}>;

export type InvitationDraft = Readonly<{
  vaultId: string;
  intendedUserId: string;
  durationDays: 1 | 3 | 7 | 14;
}>;

export type InvitationDraftValidation =
  | Readonly<{ ok: true; draft: InvitationDraft }>
  | Readonly<{ ok: false; reason: "invalid_vault" | "invalid_recipient" | "self_invitation" | "invalid_duration" }>;

/**
 * Validate a draft before handing it to a future authenticated server.
 * A valid draft is NOT an authorization decision: the server must verify
 * ownership, the recipient, and all constraints independently.
 */
export function validateInvitationDraft(
  vaultId: string,
  intendedUserId: string,
  ownerUserId: string,
  durationDays: number,
): InvitationDraftValidation {
  if (!validateIdentifier(vaultId)) return { ok: false, reason: "invalid_vault" };
  if (!validateIdentifier(intendedUserId) || !validateIdentifier(ownerUserId)) {
    return { ok: false, reason: "invalid_recipient" };
  }
  if (intendedUserId.toLowerCase() === ownerUserId.toLowerCase()) {
    return { ok: false, reason: "self_invitation" };
  }
  if (durationDays !== 1 && durationDays !== 3 && durationDays !== 7 && durationDays !== 14) {
    return { ok: false, reason: "invalid_duration" };
  }
  return { ok: true, draft: { vaultId, intendedUserId, durationDays } };
}

export type InvitationCreationResult = Readonly<{
  invitationId: string;
  // Raw code may be returned once by a future secure gateway; never persist or log it.
  oneTimeCode: string;
  expiresAt: string;
}>;

export type InvitationGateway = Readonly<{
  list(vaultId: string): Promise<TrustedPersonOverview>;
  create(draft: InvitationDraft): Promise<InvitationCreationResult>;
  accept(code: string): Promise<boolean>;
  revoke(invitationId: string): Promise<boolean>;
}>;

/**
 * Reject malformed input before a future gateway sends it to the server.
 * Validation never establishes ownership or authorization.
 */
export function validateInvitationCode(code: string): boolean {
  return /^[a-f0-9]{64}$/.test(code);
}

export function validateIdentifier(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function invitationStatusLabel(status: InvitationSummary["status"]): string {
  switch (status) {
    case "pending": return "Offen";
    case "accepted": return "Angenommen";
    case "expired": return "Abgelaufen";
    case "revoked": return "Widerrufen";
  }
}

/** Safe view model: does not expose invitation bearer codes. */
export type InvitationView = Readonly<{
  id: string;
  recipient: string;
  expiresAt: string;
  status: InvitationSummary["status"];
  canRevoke: boolean;
}>;

/** Convert authenticated server data into a sorted, display-only list. */
export function invitationViews(
  invitations: readonly InvitationSummary[],
  now: Date = new Date(),
): readonly InvitationView[] {
  const nowMs = now.getTime();
  return invitations.map((invitation) => {
    const expiryMs = Date.parse(invitation.expiresAt);
    const status = invitation.status === "pending" &&
        (!Number.isFinite(expiryMs) || expiryMs <= nowMs)
      ? "expired"
      : invitation.status;
    return {
      id: invitation.id,
      recipient: invitation.intendedUserId,
      expiresAt: invitation.expiresAt,
      status,
      canRevoke: status === "pending",
    };
  }).sort((a, b) => {
    const aPending = a.status === "pending" ? 0 : 1;
    const bPending = b.status === "pending" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return (Date.parse(b.expiresAt) || 0) - (Date.parse(a.expiresAt) || 0);
  });
}

export class InvitationGatewayUnavailableError extends Error {
  constructor() {
    super("Die sichere Einladungsverwaltung ist noch nicht freigeschaltet.");
    this.name = "InvitationGatewayUnavailableError";
  }
}

/** Default adapter deliberately performs no network requests or writes. */
export function unavailableInvitationGateway(): InvitationGateway {
  const deny = async (): Promise<never> => {
    throw new InvitationGatewayUnavailableError();
  };
  return {
    list: deny,
    create: deny,
    accept: deny,
    revoke: deny,
  };
}
