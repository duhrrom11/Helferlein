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
  return persons.slice(0, 500).filter((person) => person != null && validateIdentifier(person.userId) && (person.status === "active" || person.status === "revoked") && Number.isFinite(Date.parse(person.addedAt))).map((person) => ({
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
  if (typeof vaultId !== "string" || !validateIdentifier(vaultId)) return { ok: false, reason: "invalid_vault" };
  if (typeof intendedUserId !== "string" || typeof ownerUserId !== "string" || !validateIdentifier(intendedUserId) || !validateIdentifier(ownerUserId)) {
    return { ok: false, reason: "invalid_recipient" };
  }
  if (intendedUserId.toLowerCase() === ownerUserId.toLowerCase()) {
    return { ok: false, reason: "self_invitation" };
  }
  if (durationDays !== 1 && durationDays !== 3 && durationDays !== 7 && durationDays !== 14) {
    return { ok: false, reason: "invalid_duration" };
  }
  return { ok: true, draft: { vaultId: vaultId.toLowerCase(), intendedUserId: intendedUserId.toLowerCase(), durationDays } };
}

export function invitationDraftErrorMessage(
  reason: Extract<InvitationDraftValidation, { ok: false }>["reason"],
): string {
  switch (reason) {
    case "invalid_vault": return "Die Tresorkennung ist ungültig.";
    case "invalid_recipient": return "Die Benutzerkennung ist ungültig.";
    case "self_invitation": return "Du kannst dich nicht selbst einladen.";
    case "invalid_duration": return "Wähle eine erlaubte Gültigkeitsdauer.";
  }
}

export type InvitationCreationResult = Readonly<{
  invitationId: string;
  // Raw code may be returned once by a future secure gateway; never persist or log it.
  oneTimeCode: string;
  expiresAt: string;
}>;

export function validateInvitationCreationResult(value: unknown): value is InvitationCreationResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !["invitationId", "oneTimeCode", "expiresAt"].includes(key))) return false;
  const now = Date.now();
  return typeof result.invitationId === "string" &&
    validateIdentifier(result.invitationId) &&
    typeof result.oneTimeCode === "string" &&
    validateInvitationCode(result.oneTimeCode) &&
    typeof result.expiresAt === "string" &&
    Number.isFinite(Date.parse(result.expiresAt)) &&
    Date.parse(result.expiresAt) > now &&
    Date.parse(result.expiresAt) <= now + 14 * 86400000 + 60000;
}

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
  if (typeof code !== "string") return false;
  return /^[a-f0-9]{64}$/.test(code);
}

export function validateIdentifier(id: string): boolean {
  if (typeof id !== "string") return false;
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
  const nowMs = Number.isFinite(now.getTime()) ? now.getTime() : Date.now();
  return invitations.slice(0, 500).filter((invitation) => invitation != null && validateIdentifier(invitation.id) && validateIdentifier(invitation.intendedUserId) && Number.isFinite(Date.parse(invitation.expiresAt)) && ["pending", "accepted", "expired", "revoked"].includes(invitation.status)).map((invitation) => {
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
      canRevoke: status === "pending" && Number.isFinite(expiryMs) && expiryMs > nowMs,
    };
  }).sort((a, b) => {
    const aPending = a.status === "pending" ? 0 : 1;
    const bPending = b.status === "pending" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return (Date.parse(b.expiresAt) || 0) - (Date.parse(a.expiresAt) || 0);
  });
}

/** Validate external list data before exposing it to the UI. */
export function validateTrustedPersonOverview(value: unknown): value is TrustedPersonOverview {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const overview = value as Record<string, unknown>;
  if (Object.keys(overview).some((key) => !["invitations", "trustedPersons"].includes(key))) return false;
  return Array.isArray(overview.invitations) && overview.invitations.length <= 500 &&
    Array.isArray(overview.trustedPersons) && overview.trustedPersons.length <= 500 &&
    overview.invitations.every((item: unknown) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
      const entry = item as Record<string, unknown>;
      if (Object.keys(entry).some((key) => !["id", "intendedUserId", "expiresAt", "status"].includes(key))) return false;
      return typeof entry.id === "string" && validateIdentifier(entry.id) &&
        typeof entry.intendedUserId === "string" && validateIdentifier(entry.intendedUserId) &&
        typeof entry.expiresAt === "string" && Number.isFinite(Date.parse(entry.expiresAt)) &&
        (entry.status === "pending" || entry.status === "accepted" || entry.status === "expired" || entry.status === "revoked");
    }) &&
    overview.trustedPersons.every((item: unknown) => {
      if (typeof item !== "object" || item === null) return false;
      const entry = item as Record<string, unknown>;
      if (Object.keys(entry).some((key) => !["userId", "status", "addedAt"].includes(key))) return false;
      return typeof entry.userId === "string" && validateIdentifier(entry.userId) &&
        typeof entry.addedAt === "string" && Number.isFinite(Date.parse(entry.addedAt)) &&
        (entry.status === "active" || entry.status === "revoked");
    });
}

export class InvitationGatewayUnavailableError extends Error {
  constructor() {
    super("Die sichere Einladungsverwaltung ist noch nicht freigeschaltet.");
    this.name = "InvitationGatewayUnavailableError";
  }
}

/** Default adapter deliberately performs no network requests or writes.
 * Never replace this with a client-side service-role key or an unauthenticated endpoint.
 * A future server must derive identity from a verified session and authorize vault ownership.
 */
export function unavailableInvitationGateway(): InvitationGateway {
  const deny = async (): Promise<never> => {
    throw new InvitationGatewayUnavailableError();
  };
  return Object.freeze({
    list: deny,
    create: deny,
    accept: deny,
    revoke: deny,
  });
}
