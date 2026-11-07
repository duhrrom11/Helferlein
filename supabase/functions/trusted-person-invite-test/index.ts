/**
 * Staging invitation redemption entrypoint (NOT DEPLOYED).
 * Hard-disabled pending SQL role audit and staging database integration.
 * This file deliberately cannot construct an RPC client or perform writes.
 */
import { handleRedemptionRequest } from "../_shared/redemption-http-handler.ts";
import type { AuthUserLookup } from "../_shared/verified-user.ts";
import type { AtomicRedemptionStore } from "../_shared/atomic-invitation-redemption.ts";

// Deliberately no environment toggle: even a mistaken deployment stays inert.
// Both dependencies are deny-only; no credentials, database client or network.
const disabledAuth: AuthUserLookup = {
  auth: { async getUser() { return { data: { user: null }, error: "disabled" }; } },
};
const disabledStore: AtomicRedemptionStore = {
  async redeemAtomically() { return false; },
};

Deno.serve((request: Request) =>
  handleRedemptionRequest(request, {
    auth: disabledAuth,
    store: disabledStore,
    enabled: false,
  })
);
