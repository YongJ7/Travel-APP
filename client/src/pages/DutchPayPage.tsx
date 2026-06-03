import TripLayout from "@/components/TripLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle2, Users } from "lucide-react";
import { useMemo } from "react";
import { useParams, useLocation } from "wouter";

interface Settlement {
  from: string;
  fromColor: string;
  to: string;
  toColor: string;
  amount: number;
}

function calculateSettlements(
  members: { id: number; nickname: string; color: string | null }[],
  expenses: { memberId: number; amount: string | number }[],
  prepCosts: { memberId: number; amount: string | number }[]
): { balances: Record<number, number>; settlements: Settlement[] } {
  const totalAll = [...expenses, ...prepCosts];
  const totalAmount = totalAll.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
  const perPerson = members.length > 0 ? totalAmount / members.length : 0;

  // How much each person paid
  const paid: Record<number, number> = {};
  members.forEach((m) => (paid[m.id] = 0));
  totalAll.forEach((e) => {
    paid[e.memberId] = (paid[e.memberId] ?? 0) + parseFloat(String(e.amount));
  });

  // Balance = paid - should_pay
  const balances: Record<number, number> = {};
  members.forEach((m) => {
    balances[m.id] = (paid[m.id] ?? 0) - perPerson;
  });

  // Greedy settlement algorithm
  const debtors = members
    .filter((m) => balances[m.id]! < -0.01)
    .map((m) => ({ ...m, balance: balances[m.id]! }))
    .sort((a, b) => a.balance - b.balance);

  const creditors = members
    .filter((m) => balances[m.id]! > 0.01)
    .map((m) => ({ ...m, balance: balances[m.id]! }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  const d = debtors.map((x) => ({ ...x }));
  const c = creditors.map((x) => ({ ...x }));

  while (i < d.length && j < c.length) {
    const debtor = d[i]!;
    const creditor = c[j]!;
    const amount = Math.min(-debtor.balance, creditor.balance);
    if (amount > 0.01) {
      settlements.push({
        from: debtor.nickname,
        fromColor: debtor.color ?? "#6366f1",
        to: creditor.nickname,
        toColor: creditor.color ?? "#10b981",
        amount: Math.round(amount),
      });
    }
    debtor.balance += amount;
    creditor.balance -= amount;
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return { balances, settlements };
}

export default function DutchPayPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");

  const { data: trip } = trpc.trips.get.useQuery({ tripId: id });
  const { data: members, isLoading: membersLoading } = trpc.members.list.useQuery({ tripId: id });
  const { data: expenses, isLoading: expLoading } = trpc.expenses.list.useQuery({ tripId: id });
  const { data: prepCosts, isLoading: prepLoading } = trpc.prepCosts.list.useQuery({ tripId: id });

  const isLoading = membersLoading || expLoading || prepLoading;

  const { balances, settlements } = useMemo(() => {
    if (!members || !expenses || !prepCosts) return { balances: {}, settlements: [] };
    return calculateSettlements(members, expenses, prepCosts);
  }, [members, expenses, prepCosts]);

  const totalAll = useMemo(() => {
    const e = expenses?.reduce((s, x) => s + parseFloat(String(x.amount)), 0) ?? 0;
    const p = prepCosts?.reduce((s, x) => s + parseFloat(String(x.amount)), 0) ?? 0;
    return e + p;
  }, [expenses, prepCosts]);

  const perPerson = members?.length ? totalAll / members.length : 0;

  const paid: Record<number, number> = {};
  members?.forEach((m) => (paid[m.id] = 0));
  [...(expenses ?? []), ...(prepCosts ?? [])].forEach((e) => {
    paid[e.memberId] = (paid[e.memberId] ?? 0) + parseFloat(String(e.amount));
  });

  return (
    <TripLayout tripId={id}>
      <div className="page-enter">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 pt-12 pb-3">
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80"
              onClick={() => navigate(`/trip/${id}`)}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold">더치페이 계산</h1>
              <p className="text-xs text-muted-foreground">{trip?.title}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : (
            <>
              {/* Summary */}
              <div className="glass-card rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">총 지출</p>
                    <p className="text-base font-bold">{totalAll.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{trip?.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">인원</p>
                    <p className="text-base font-bold">{members?.length ?? 0}명</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">1인당</p>
                    <p className="text-base font-bold text-primary">{Math.round(perPerson).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{trip?.currency}</p>
                  </div>
                </div>
              </div>

              {/* Member Balances */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users size={15} className="text-primary" />
                  멤버별 정산 현황
                </h3>
                <div className="space-y-3">
                  {members?.map((m) => {
                    const paidAmt = paid[m.id] ?? 0;
                    const balance = balances[m.id] ?? 0;
                    const isPositive = balance >= 0;
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: m.color ?? "#6366f1" }}
                        >
                          {m.nickname[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{m.nickname}</span>
                            <span
                              className={cn(
                                "text-sm font-bold",
                                isPositive ? "text-emerald-400" : "text-red-400"
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {Math.round(balance).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              지출: {paidAmt.toLocaleString()} · 기준: {Math.round(perPerson).toLocaleString()}
                            </span>
                            <span className={cn("text-xs", isPositive ? "text-emerald-400/70" : "text-red-400/70")}>
                              {isPositive ? "받을 돈" : "보낼 돈"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Settlement Instructions */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">정산 방법</h3>
                {settlements.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-400">모든 정산이 완료되었어요!</p>
                    <p className="text-xs text-muted-foreground">모든 멤버가 균등하게 지출했습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlements.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: s.fromColor }}
                        >
                          {s.from[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{s.from}</span>
                            <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium">{s.to}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.amount.toLocaleString()} {trip?.currency} 송금
                          </p>
                        </div>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: s.toColor }}
                        >
                          {s.to[0]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense breakdown per member */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">멤버별 지출 상세</h3>
                <div className="space-y-2">
                  {members?.map((m) => {
                    const memberExpenses = expenses?.filter((e) => e.memberId === m.id) ?? [];
                    const memberPrep = prepCosts?.filter((e) => e.memberId === m.id) ?? [];
                    const expTotal = memberExpenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
                    const prepTotal = memberPrep.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
                    const total = expTotal + prepTotal;
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: m.color ?? "#6366f1" }}
                        >
                          {m.nickname[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{m.nickname}</p>
                          <p className="text-xs text-muted-foreground">
                            현지 {expTotal.toLocaleString()} + 준비 {prepTotal.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm font-bold">{total.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TripLayout>
  );
}
