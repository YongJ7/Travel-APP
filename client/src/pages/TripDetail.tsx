import TripLayout from "@/components/TripLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Copy,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#f59e0b",
  교통: "#14b8a6",
  숙소: "#6366f1",
  관광: "#10b981",
  쇼핑: "#ec4899",
  기타: "#64748b",
  항공: "#14b8a6",
  비자: "#10b981",
  여행자보험: "#ec4899",
  eSIM: "#f59e0b",
  환전: "#6366f1",
};

const MEMBER_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");

  const { data: trip, isLoading: tripLoading } = trpc.trips.get.useQuery({ tripId: id });
  const { data: members } = trpc.members.list.useQuery({ tripId: id });
  const { data: expenses } = trpc.expenses.list.useQuery({ tripId: id });
  const { data: prepCosts } = trpc.prepCosts.list.useQuery({ tripId: id });

  const totalExpenses = expenses?.reduce((s, e) => s + parseFloat(String(e.amount)), 0) ?? 0;
  const totalPrep = prepCosts?.reduce((s, e) => s + parseFloat(String(e.amount)), 0) ?? 0;
  const grandTotal = totalExpenses + totalPrep;
  const memberCount = members?.length ?? 1;
  const perPerson = memberCount > 0 ? grandTotal / memberCount : grandTotal;
  const budget = trip?.budget ? parseFloat(String(trip.budget)) : null;
  const budgetUsed = budget ? (grandTotal / budget) * 100 : null;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  expenses?.forEach((e) => {
    const cat = e.category ?? "기타";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + parseFloat(String(e.amount));
  });
  prepCosts?.forEach((e) => {
    const cat = e.category ?? "기타";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + parseFloat(String(e.amount));
  });
  const chartData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Member spending
  const memberSpend: Record<number, number> = {};
  expenses?.forEach((e) => {
    memberSpend[e.memberId] = (memberSpend[e.memberId] ?? 0) + parseFloat(String(e.amount));
  });
  prepCosts?.forEach((e) => {
    memberSpend[e.memberId] = (memberSpend[e.memberId] ?? 0) + parseFloat(String(e.amount));
  });

  const formatAmount = (n: number) =>
    n.toLocaleString("ko-KR") + " " + (trip?.currency ?? "KRW");

  const copyInviteCode = () => {
    if (trip?.inviteCode) {
      navigator.clipboard.writeText(trip.inviteCode);
      toast.success("초대 코드가 복사되었습니다!");
    }
  };

  const tripDays = trip?.startDate && trip?.endDate
    ? differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1
    : null;

  if (tripLoading) {
    return (
      <TripLayout tripId={id}>
        <div className="px-4 pt-12 space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </TripLayout>
    );
  }

  if (!trip) {
    return (
      <TripLayout tripId={id}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">여행을 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => navigate("/")}>홈으로</Button>
        </div>
      </TripLayout>
    );
  }

  return (
    <TripLayout tripId={id}>
      <div className="page-enter">
        {/* Header */}
        <div className="relative px-4 pt-12 pb-6 bg-gradient-to-b from-primary/10 to-transparent">
          <button
            className="absolute top-12 left-4 w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={16} />
          </button>

          <div className="text-center mt-4">
            <div className="text-5xl mb-3">{trip.emoji ?? "✈️"}</div>
            <h1 className="text-2xl font-bold text-foreground">{trip.title}</h1>
            {trip.destination && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <MapPin size={13} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{trip.destination}</span>
              </div>
            )}
            {(trip.startDate || trip.endDate) && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <CalendarDays size={13} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {trip.startDate ? format(new Date(trip.startDate), "yyyy.MM.dd", { locale: ko }) : "?"}
                  {" ~ "}
                  {trip.endDate ? format(new Date(trip.endDate), "MM.dd", { locale: ko }) : "?"}
                  {tripDays && <span className="ml-1 text-primary font-medium">({tripDays}일)</span>}
                </span>
              </div>
            )}
          </div>

          {/* Invite code */}
          {trip.inviteCode && (
            <button
              className="mt-4 mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border/60 text-sm"
              onClick={copyInviteCode}
            >
              <span className="text-muted-foreground text-xs">초대코드</span>
              <span className="font-mono font-bold text-primary tracking-widest">{trip.inviteCode}</span>
              <Copy size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="px-4 space-y-4 pb-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">총 지출</p>
              <p className="text-lg font-bold text-foreground">{formatAmount(grandTotal)}</p>
              {budget && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>예산 사용</span>
                    <span className={cn(budgetUsed! > 100 ? "text-destructive" : "text-primary")}>
                      {budgetUsed!.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        budgetUsed! > 100 ? "bg-destructive" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(budgetUsed!, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">1인당</p>
              <p className="text-lg font-bold text-primary">{formatAmount(perPerson)}</p>
              <div className="flex items-center gap-1 mt-2">
                <Users size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{memberCount}명</span>
              </div>
            </div>
          </div>

          {/* Sub totals */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">준비 비용</span>
              <span className="text-sm font-medium">{formatAmount(totalPrep)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">현지 지출</span>
              <span className="text-sm font-medium">{formatAmount(totalExpenses)}</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold">합계</span>
              <span className="text-sm font-bold text-primary">{formatAmount(grandTotal)}</span>
            </div>
          </div>

          {/* Category Chart */}
          {chartData.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 size={15} className="text-primary" />
                카테고리별 지출
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={CATEGORY_COLORS[entry.name] ?? "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [v.toLocaleString() + " " + (trip?.currency ?? ""), ""]}
                      contentStyle={{
                        background: "oklch(0.20 0.025 260)",
                        border: "1px solid oklch(0.30 0.025 260)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {chartData.slice(0, 5).map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: CATEGORY_COLORS[d.name] ?? "#64748b" }}
                        />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="text-xs font-medium">
                        {((d.value / grandTotal) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          {members && members.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users size={15} className="text-primary" />
                멤버 지출 현황
              </h3>
              <div className="space-y-2">
                {members.map((m, i) => {
                  const spent = memberSpend[m.id] ?? 0;
                  const pct = grandTotal > 0 ? (spent / grandTotal) * 100 : 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: m.color ?? MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                      >
                        {m.nickname[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-medium truncate">{m.nickname}</span>
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {spent.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: m.color ?? MEMBER_COLORS[i % MEMBER_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              빠른 이동
            </h3>
            {[
              { icon: Wallet, label: "지출 기록", sub: `${expenses?.length ?? 0}건`, path: `/trip/${id}/expenses` },
              { icon: Wallet, label: "준비 비용", sub: `${prepCosts?.length ?? 0}건`, path: `/trip/${id}/prep` },
              { icon: Users, label: "더치페이 계산", sub: `${memberCount}명`, path: `/trip/${id}/dutch` },
              { icon: MapPin, label: "방문 장소", sub: "지도 보기", path: `/trip/${id}/map` },
              { icon: BrainCircuit, label: "AI 분석", sub: "지출 패턴 분석", path: `/trip/${id}/ai` },
            ].map((item) => (
              <button
                key={item.path}
                className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 hover:border-primary/30 transition-all active:scale-[0.98]"
                onClick={() => navigate(item.path)}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon size={16} className="text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronRight size={15} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </TripLayout>
  );
}
