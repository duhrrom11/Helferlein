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

export type TrustedPersonOverview = Readonly<{
  invitations: readonly InvitationSummary[];
  trustedPersons: readonly TrustedPersonSummary[];
}>;

export type InvitationCreationResult = Readonly<{
  invitationId: string;
  // Raw code may be returned once by a future secure gateway; never persist or log it.
  oneTimeCode: string;
  expiresAt: string;
}>;

export type InvitationGateway = Readonly<{
  list(vaultId: string): Promise<TrustedPersonOverview>;
  create(vaultId: string, intendedUserId: string): Promise<InvitationCreationResult>;
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
        Number.isFinite(expiryMs) && expiryMs <= nowMs
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
