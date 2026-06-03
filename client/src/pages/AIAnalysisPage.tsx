import TripLayout from "@/components/TripLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BrainCircuit, RefreshCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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

export default function AIAnalysisPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: trip } = trpc.trips.get.useQuery({ tripId: id });
  const { data: members } = trpc.members.list.useQuery({ tripId: id });
  const { data: expenses, isLoading: expLoading } = trpc.expenses.list.useQuery({ tripId: id });
  const { data: prepCosts, isLoading: prepLoading } = trpc.prepCosts.list.useQuery({ tripId: id });

  const analyzeExpenses = trpc.ai.analyzeExpenses.useMutation({
    onSuccess: (data) => {
      setAnalysis(typeof data.analysis === 'string' ? data.analysis : String(data.analysis));
      setIsAnalyzing(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setIsAnalyzing(false);
    },
  });

  const totalExpenses = useMemo(
    () => expenses?.reduce((s, e) => s + parseFloat(String(e.amount)), 0) ?? 0,
    [expenses]
  );
  const totalPrepCosts = useMemo(
    () => prepCosts?.reduce((s, e) => s + parseFloat(String(e.amount)), 0) ?? 0,
    [prepCosts]
  );
  const grandTotal = totalExpenses + totalPrepCosts;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    [...(expenses ?? []), ...(prepCosts ?? [])].forEach((e) => {
      const cat = e.category ?? "기타";
      if (!map[cat]) map[cat] = { amount: 0, count: 0 };
      map[cat]!.amount += parseFloat(String(e.amount));
      map[cat]!.count += 1;
    });
    return Object.entries(map)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, prepCosts]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses?.forEach((e) => {
      const d = String(e.expenseDate).split("T")[0]!;
      map[d] = (map[d] ?? 0) + parseFloat(String(e.amount));
    });
    return Object.entries(map)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

  const topExpenses = useMemo(() => {
    return [...(expenses ?? [])]
      .sort((a, b) => parseFloat(String(b.amount)) - parseFloat(String(a.amount)))
      .slice(0, 5)
      .map((e) => ({
        title: e.title,
        amount: parseFloat(String(e.amount)),
        category: e.category,
      }));
  }, [expenses]);

  const handleAnalyze = () => {
    if (grandTotal === 0) {
      toast.error("지출 데이터가 없습니다. 먼저 지출을 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
    analyzeExpenses.mutate({
      tripId: id,
      tripTitle: trip?.title ?? "여행",
      currency: trip?.currency ?? "KRW",
      budget: trip?.budget ? String(trip.budget) : undefined,
      totalExpenses,
      totalPrepCosts,
      memberCount: members?.length ?? 1,
      categoryBreakdown,
      dailyTotals,
      topExpenses,
    });
  };

  const isLoading = expLoading || prepLoading;

  // Format analysis text into paragraphs
  const analysisParagraphs = analysis
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => p.trim());

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
            <div className="flex-1">
              <h1 className="text-lg font-bold">AI 지출 분석</h1>
              <p className="text-xs text-muted-foreground">{trip?.title}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-xs text-muted-foreground">총 지출</span>
                  </div>
                  <p className="text-xl font-bold">{grandTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{trip?.currency}</p>
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={14} className="text-primary" />
                    <span className="text-xs text-muted-foreground">1인당</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {members?.length
                      ? Math.round(grandTotal / members.length).toLocaleString()
                      : grandTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{trip?.currency}</p>
                </div>
              </div>

              {/* Category Chart */}
              {categoryBreakdown.length > 0 && (
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-3">카테고리별 지출</h3>
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={46}
                          paddingAngle={2}
                          dataKey="amount"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={CATEGORY_COLORS[entry.category] ?? "#64748b"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [v.toLocaleString(), ""]}
                          contentStyle={{
                            background: "oklch(0.20 0.025 260)",
                            border: "1px solid oklch(0.30 0.025 260)",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {categoryBreakdown.slice(0, 5).map((d) => (
                        <div key={d.category} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: CATEGORY_COLORS[d.category] ?? "#64748b" }}
                            />
                            <span className="text-xs text-muted-foreground">{d.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium">
                              {((d.amount / grandTotal) * 100).toFixed(0)}%
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({d.amount.toLocaleString()})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Trend Chart */}
              {dailyTotals.length > 1 && (
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-3">일별 지출 추이</h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={dailyTotals} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.025 260)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "oklch(0.60 0.02 260)" }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.02 260)" }} />
                      <Tooltip
                        formatter={(v: number) => [v.toLocaleString(), "지출"]}
                        contentStyle={{
                          background: "oklch(0.20 0.025 260)",
                          border: "1px solid oklch(0.30 0.025 260)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="amount" fill="oklch(0.65 0.22 280)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Expenses */}
              {topExpenses.length > 0 && (
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-3">주요 지출 TOP 5</h3>
                  <div className="space-y-2">
                    {topExpenses.map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground">{e.category}</p>
                        </div>
                        <p className="text-sm font-bold flex-shrink-0">
                          {e.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BrainCircuit size={15} className="text-primary" />
                    AI 분석 리포트
                  </h3>
                  {analysis && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={handleAnalyze}
                    >
                      <RefreshCw size={12} />
                      재분석
                    </button>
                  )}
                </div>

                {!analysis && !isAnalyzing ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles size={28} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">AI가 지출을 분석해드려요</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        카테고리 패턴, 절약 팁, 예산 분석을 제공합니다
                      </p>
                    </div>
                    <Button
                      className="rounded-xl gap-2 px-6"
                      onClick={handleAnalyze}
                      disabled={grandTotal === 0}
                    >
                      <BrainCircuit size={15} />
                      분석 시작
                    </Button>
                  </div>
                ) : isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">AI가 분석 중입니다...</p>
                    <p className="text-xs text-muted-foreground">잠시만 기다려주세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysisParagraphs.map((para, i) => (
                      <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </TripLayout>
  );
}
