import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@nurunode/database/pglite";
import type { Db } from "@nurunode/database";
import { isNuruError } from "@nurunode/shared";
import { LedgerService, createOrgWithWallet } from "./index";

let db: Db;
let ledger: LedgerService;
let counter = 0;

async function freshWallet() {
  counter += 1;
  const { walletId } = await createOrgWithWallet(db, {
    ownerEmail: `owner${counter}@example.com`,
    orgName: `Org ${counter}`,
  });
  return walletId;
}

beforeAll(async () => {
  db = await createTestDb();
  ledger = new LedgerService(db);
});

afterAll(async () => {
  await db.close();
});

describe("top-up", () => {
  it("credits the wallet and creates exactly one immutable entry", async () => {
    const walletId = await freshWallet();
    const entry = await ledger.topUp({ walletId, amountPesewas: 5000, idempotencyKey: "topup:1" });
    expect(entry.entryType).toBe("top_up");
    expect(entry.amountPesewas).toBe(5000);

    const bal = await ledger.balance(walletId);
    expect(bal.availablePesewas).toBe(5000);
    expect(bal.reservedPesewas).toBe(0);
    expect(bal.lifetimeTopUpsPesewas).toBe(5000);

    const entries = await ledger.entries(walletId);
    expect(entries).toHaveLength(1);
  });

  it("is idempotent on the same key (duplicate webhook cannot double-credit)", async () => {
    const walletId = await freshWallet();
    const a = await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "topup:evt-1" });
    const b = await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "topup:evt-1" });
    expect(b.id).toBe(a.id);
    expect((await ledger.balance(walletId)).availablePesewas).toBe(1000);
    expect(await ledger.entries(walletId)).toHaveLength(1);
  });

  it("rejects zero or negative amounts", async () => {
    const walletId = await freshWallet();
    await expect(
      ledger.topUp({ walletId, amountPesewas: 0, idempotencyKey: "x" }),
    ).rejects.toThrow();
  });
});

describe("reserve", () => {
  it("holds funds and reduces available balance", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "t" });
    const res = await ledger.reserve({ walletId, amountPesewas: 300 });
    expect(res.status).toBe("open");
    const bal = await ledger.balance(walletId);
    expect(bal.availablePesewas).toBe(700);
    expect(bal.reservedPesewas).toBe(300);
  });

  it("is idempotent with a key so retries do not double-hold", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "t" });
    const a = await ledger.reserve({ walletId, amountPesewas: 300, idempotencyKey: "req-1" });
    const b = await ledger.reserve({ walletId, amountPesewas: 300, idempotencyKey: "req-1" });
    expect(b.id).toBe(a.id);
    expect((await ledger.balance(walletId)).availablePesewas).toBe(700);
  });

  it("rejects when the wallet balance is zero", async () => {
    const walletId = await freshWallet();
    await expect(ledger.reserve({ walletId, amountPesewas: 1 })).rejects.toSatisfy((e) =>
      isNuruError(e, "INSUFFICIENT_FUNDS"),
    );
    expect(await ledger.entries(walletId)).toHaveLength(0);
  });

  it("rejects when the balance is insufficient for the maximum estimate", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 100, idempotencyKey: "t" });
    await expect(ledger.reserve({ walletId, amountPesewas: 101 })).rejects.toSatisfy((e) =>
      isNuruError(e, "INSUFFICIENT_FUNDS"),
    );
    expect((await ledger.balance(walletId)).availablePesewas).toBe(100);
  });
});

describe("settle", () => {
  it("records actual cost and releases the unused remainder in one step", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "t" });
    const res = await ledger.reserve({ walletId, amountPesewas: 400 });
    const out = await ledger.settle({ reservationId: res.id, actualPesewas: 150 });
    expect(out.releasedPesewas).toBe(250);
    expect(out.releaseEntryId).not.toBeNull();

    const bal = await ledger.balance(walletId);
    expect(bal.availablePesewas).toBe(850);
    expect(bal.reservedPesewas).toBe(0);
    expect(bal.lifetimeSpentPesewas).toBe(150);

    const types = (await ledger.entries(walletId)).map((e) => e.entryType).sort();
    expect(types).toEqual(["release", "reservation", "settlement", "top_up"]);
    expect((await ledger.reservation(res.id))?.status).toBe("settled");
  });

  it("does not create a release entry when actual equals reserved", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "t" });
    const res = await ledger.reserve({ walletId, amountPesewas: 400 });
    const out = await ledger.settle({ reservationId: res.id, actualPesewas: 400 });
    expect(out.releasedPesewas).toBe(0);
    expect(out.releaseEntryId).toBeNull();
    expect((await ledger.balance(walletId)).availablePesewas).toBe(600);
  });

  it("refuses to settle more than reserved and to settle twice", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "t" });
    const res = await ledger.reserve({ walletId, amountPesewas: 400 });
    await expect(ledger.settle({ reservationId: res.id, actualPesewas: 401 })).rejects.toSatisfy(
      (e) => isNuruError(e, "SETTLEMENT_EXCEEDS_RESERVATION"),
    );
    await ledger.settle({ reservationId: res.id, actualPesewas: 100 });
    await expect(ledger.settle({ reservationId: res.id, actualPesewas: 100 })).rejects.toSatisfy(
      (e) => isNuruError(e, "RESERVATION_NOT_OPEN"),
    );
    expect((await ledger.balance(walletId)).availablePesewas).toBe(900);
  });
});

describe("release", () => {
  it("returns the whole reservation on provider failure", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 500, idempotencyKey: "t" });
    const res = await ledger.reserve({ walletId, amountPesewas: 500 });
    expect((await ledger.balance(walletId)).availablePesewas).toBe(0);
    const entry = await ledger.release({ reservationId: res.id });
    expect(entry.entryType).toBe("release");
    expect((await ledger.balance(walletId)).availablePesewas).toBe(500);
    expect((await ledger.reservation(res.id))?.status).toBe("released");
  });
});

describe("refund", () => {
  it("debits available balance and is idempotent", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 1000, idempotencyKey: "t" });
    const a = await ledger.refund({ walletId, amountPesewas: 400, idempotencyKey: "refund:1" });
    const b = await ledger.refund({ walletId, amountPesewas: 400, idempotencyKey: "refund:1" });
    expect(a.entryType).toBe("refund");
    expect(b.id).toBe(a.id);
    expect((await ledger.balance(walletId)).availablePesewas).toBe(600);
  });

  it("cannot refund more than available", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 100, idempotencyKey: "t" });
    await expect(
      ledger.refund({ walletId, amountPesewas: 101, idempotencyKey: "r" }),
    ).rejects.toSatisfy((e) => isNuruError(e, "INSUFFICIENT_FUNDS"));
  });
});

describe("immutability", () => {
  it("rejects UPDATE and DELETE on ledger_entries", async () => {
    const walletId = await freshWallet();
    const entry = await ledger.topUp({ walletId, amountPesewas: 100, idempotencyKey: "t" });
    await expect(
      db.query("UPDATE ledger_entries SET amount_pesewas = 999999 WHERE id = $1", [entry.id]),
    ).rejects.toThrow(/LEDGER_IMMUTABLE/);
    await expect(db.query("DELETE FROM ledger_entries WHERE id = $1", [entry.id])).rejects.toThrow(
      /LEDGER_IMMUTABLE/,
    );
    expect((await ledger.balance(walletId)).availablePesewas).toBe(100);
  });

  it("never lets available balance go negative under concurrent reservations", async () => {
    const walletId = await freshWallet();
    await ledger.topUp({ walletId, amountPesewas: 300, idempotencyKey: "t" });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => ledger.reserve({ walletId, amountPesewas: 100 })),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(3);
    expect((await ledger.balance(walletId)).availablePesewas).toBe(0);
  });
});
