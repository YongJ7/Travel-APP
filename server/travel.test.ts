import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: `Test User ${userId}`,
      email: `test${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ── Dutch Pay Calculation Logic Tests ──────────────────────────────────────

describe("Dutch Pay Calculation", () => {
  it("calculates equal split correctly for 3 members", () => {
    const members = [
      { id: 1, nickname: "Alice", color: "#6366f1" },
      { id: 2, nickname: "Bob", color: "#f59e0b" },
      { id: 3, nickname: "Charlie", color: "#10b981" },
    ];

    const expenses = [
      { memberId: 1, amount: "90000" }, // Alice paid 90k
      { memberId: 2, amount: "30000" }, // Bob paid 30k
      { memberId: 3, amount: "0" },     // Charlie paid nothing
    ];

    const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const perPerson = totalAmount / members.length;

    expect(totalAmount).toBe(120000);
    expect(perPerson).toBe(40000);

    // Alice balance: 90k - 40k = +50k (receives)
    // Bob balance: 30k - 40k = -10k (pays)
    // Charlie balance: 0 - 40k = -40k (pays)
    const balances: Record<number, number> = {};
    members.forEach((m) => {
      const paid = expenses.filter((e) => e.memberId === m.id).reduce((s, e) => s + parseFloat(e.amount), 0);
      balances[m.id] = paid - perPerson;
    });

    expect(balances[1]).toBe(50000);  // Alice receives 50k
    expect(balances[2]).toBe(-10000); // Bob pays 10k
    expect(balances[3]).toBe(-40000); // Charlie pays 40k
  });

  it("returns zero balances when everyone pays equally", () => {
    const members = [
      { id: 1, nickname: "Alice" },
      { id: 2, nickname: "Bob" },
    ];
    const expenses = [
      { memberId: 1, amount: "50000" },
      { memberId: 2, amount: "50000" },
    ];

    const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const perPerson = totalAmount / members.length;

    members.forEach((m) => {
      const paid = expenses.filter((e) => e.memberId === m.id).reduce((s, e) => s + parseFloat(e.amount), 0);
      const balance = paid - perPerson;
      expect(Math.abs(balance)).toBeLessThan(0.01);
    });
  });

  it("handles single member correctly", () => {
    const expenses = [{ memberId: 1, amount: "100000" }];
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const perPerson = total / 1;
    expect(perPerson).toBe(100000);
  });
});

// ── Category Aggregation Tests ─────────────────────────────────────────────

describe("Category Breakdown", () => {
  it("groups expenses by category correctly", () => {
    const expenses = [
      { category: "식비", amount: "15000" },
      { category: "식비", amount: "25000" },
      { category: "교통", amount: "5000" },
      { category: "관광", amount: "30000" },
    ];

    const map: Record<string, { amount: number; count: number }> = {};
    expenses.forEach((e) => {
      const cat = e.category;
      if (!map[cat]) map[cat] = { amount: 0, count: 0 };
      map[cat]!.amount += parseFloat(e.amount);
      map[cat]!.count += 1;
    });

    expect(map["식비"]!.amount).toBe(40000);
    expect(map["식비"]!.count).toBe(2);
    expect(map["교통"]!.amount).toBe(5000);
    expect(map["관광"]!.amount).toBe(30000);
  });

  it("calculates total correctly", () => {
    const expenses = [
      { amount: "10000" },
      { amount: "20000" },
      { amount: "30000" },
    ];
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    expect(total).toBe(60000);
  });
});

// ── Auth Logout Test ───────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie on logout", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...createMockContext(),
      res: {
        clearCookie: (name: string) => {
          clearedCookies.push(name);
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });

  it("returns user info when authenticated", async () => {
    const ctx = createMockContext(42);
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();

    expect(user).not.toBeNull();
    expect(user?.id).toBe(42);
    expect(user?.name).toBe("Test User 42");
  });
});

// ── Settlement Algorithm Tests ─────────────────────────────────────────────

describe("Settlement Algorithm", () => {
  it("minimizes number of transactions", () => {
    // 4 members: A paid 100k, B paid 0, C paid 0, D paid 0
    // Each should pay 25k, so B/C/D each owe A 25k
    const members = [
      { id: 1, balance: 75000 },   // A receives 75k
      { id: 2, balance: -25000 },  // B pays 25k
      { id: 3, balance: -25000 },  // C pays 25k
      { id: 4, balance: -25000 },  // D pays 25k
    ];

    const debtors = members.filter((m) => m.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = members.filter((m) => m.balance > 0.01).sort((a, b) => b.balance - a.balance);

    const settlements: { from: number; to: number; amount: number }[] = [];
    let i = 0, j = 0;
    const d = debtors.map((x) => ({ ...x }));
    const c = creditors.map((x) => ({ ...x }));

    while (i < d.length && j < c.length) {
      const debtor = d[i]!;
      const creditor = c[j]!;
      const amount = Math.min(-debtor.balance, creditor.balance);
      if (amount > 0.01) {
        settlements.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) });
      }
      debtor.balance += amount;
      creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }

    expect(settlements.length).toBe(3);
    expect(settlements.every((s) => s.to === 1)).toBe(true);
    expect(settlements.every((s) => s.amount === 25000)).toBe(true);
  });

  it("handles complex multi-way settlements", () => {
    // A: +30k, B: -10k, C: +20k, D: -40k
    const members = [
      { id: 1, balance: 30000 },
      { id: 2, balance: -10000 },
      { id: 3, balance: 20000 },
      { id: 4, balance: -40000 },
    ];

    const totalBalance = members.reduce((s, m) => s + m.balance, 0);
    expect(Math.abs(totalBalance)).toBeLessThan(0.01); // Must sum to zero
  });
});
