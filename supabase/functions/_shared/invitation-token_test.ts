import { createInvitationToken, hashInvitationToken } from "./invitation-token.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("invitation token has 256 bits encoded as 64 lowercase hex chars", () => {
  const token = createInvitationToken();
  assert(/^[a-f0-9]{64}$/.test(token), "token format invalid");
});

Deno.test("invitation tokens differ across independent generations", () => {
  const tokens = Array.from({ length: 16 }, () => createInvitationToken());
  assert(new Set(tokens).size === tokens.length, "duplicate token generated");
});

Deno.test("token hashing is deterministic and does not return plaintext", async () => {
  const token = createInvitationToken();
  const first = await hashInvitationToken(token);
  const second = await hashInvitationToken(token);
  assert(/^[a-f0-9]{64}$/.test(first), "digest format invalid");
  assert(first === second, "same token must yield same digest");
  assert(first !== token, "digest must not equal token");
});

Deno.test("different tokens yield different hashes", async () => {
  const a = createInvitationToken();
  const b = createInvitationToken();
  assert(await hashInvitationToken(a) !== await hashInvitationToken(b), "hash collision");
});

Deno.test("reject malformed tokens before hashing", async () => {
  for (const token of ["", "1234", "g".repeat(64), "A".repeat(64), " ".repeat(64)]) {
    let rejected = false;
    try {
      await hashInvitationToken(token);
    } catch {
      rejected = true;
    }
    assert(rejected, "malformed token accepted");
  }
});
