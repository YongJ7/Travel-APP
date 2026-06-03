import TripLayout from "@/components/TripLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

const PREP_CATEGORIES = ["항공", "숙소", "비자", "여행자보험", "eSIM", "환전", "기타"];

interface PrepForm {
  title: string;
  amount: string;
  category: string;
  memberId: string;
  note: string;
}

const defaultForm: PrepForm = {
  title: "",
  amount: "",
  category: "항공",
  memberId: "",
  note: "",
};

export default function PrepCostsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PrepForm>(defaultForm);

  const utils = trpc.useUtils();
  const { data: trip } = trpc.trips.get.useQuery({ tripId: id });
  const { data: members } = trpc.members.list.useQuery({ tripId: id });
  const { data: prepCosts, isLoading } = trpc.prepCosts.list.useQuery({ tripId: id });

  const createPrepCost = trpc.prepCosts.create.useMutation({
    onSuccess: () => {
      utils.prepCosts.list.invalidate({ tripId: id });
      setShowForm(false);
      setForm(defaultForm);
      toast.success("준비 비용이 추가되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePrepCost = trpc.prepCosts.update.useMutation({
    onSuccess: () => {
      utils.prepCosts.list.invalidate({ tripId: id });
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
      toast.success("수정되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePrepCost = trpc.prepCosts.delete.useMutation({
    onSuccess: () => {
      utils.prepCosts.list.invalidate({ tripId: id });
      toast.success("삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("항목명을 입력하세요.");
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error("금액을 입력하세요.");
    if (!form.memberId) return toast.error("결제자를 선택하세요.");

    if (editId) {
      updatePrepCost.mutate({
        id: editId,
        title: form.title,
        amount: form.amount,
        category: form.category,
        memberId: parseInt(form.memberId),
        note: form.note || undefined,
      });
    } else {
      createPrepCost.mutate({
        tripId: id,
        memberId: parseInt(form.memberId),
        title: form.title,
        amount: form.amount,
        category: form.category,
        note: form.note || undefined,
      });
    }
  };

  const openEdit = (e: NonNullable<typeof prepCosts>[number]) => {
    setEditId(e.id);
    setForm({
      title: e.title,
      amount: String(e.amount),
      category: e.category,
      memberId: String(e.memberId),
      note: e.note ?? "",
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, memberId: members?.[0] ? String(members[0].id) : "" });
    setShowForm(true);
  };

  // Group by category
  const grouped: Record<string, NonNullable<typeof prepCosts>> = {};
  prepCosts?.forEach((e) => {
    const cat = e.category ?? "기타";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(e);
  });

  const totalPrep = prepCosts?.reduce((s, e) => s + parseFloat(String(e.amount)), 0) ?? 0;

  const getMemberName = (memberId: number) =>
    members?.find((m) => m.id === memberId)?.nickname ?? "?";

  const getMemberColor = (memberId: number) =>
    members?.find((m) => m.id === memberId)?.color ?? "#6366f1";

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
              <h1 className="text-lg font-bold">준비 비용</h1>
              <p className="text-xs text-muted-foreground">{trip?.title}</p>
            </div>
            <div className="text-right mr-2">
              <p className="text-xs text-muted-foreground">합계</p>
              <p className="text-sm font-bold text-primary">
                {totalPrep.toLocaleString()} {trip?.currency}
              </p>
            </div>
            <Button size="sm" className="rounded-xl gap-1 h-8 text-xs" onClick={openCreate}>
              <Plus size={13} /> 추가
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : !prepCosts || prepCosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-4xl">🧳</div>
              <p className="text-muted-foreground text-sm">아직 준비 비용이 없어요</p>
              <p className="text-xs text-muted-foreground">항공, 숙소, 비자 등을 추가해보세요</p>
              <Button className="rounded-xl gap-2 text-sm" onClick={openCreate}>
                <Plus size={14} /> 항목 추가
              </Button>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => {
              const catTotal = items.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border",
                        `cat-${cat}`
                      )}
                    >
                      {cat}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {catTotal.toLocaleString()} {trip?.currency}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="glass-card rounded-xl p-3.5 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ background: getMemberColor(item.memberId) }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {getMemberName(item.memberId)}
                            </span>
                            {item.note && (
                              <span className="text-xs text-muted-foreground truncate">
                                · {item.note}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">
                            {parseFloat(String(item.amount)).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{trip?.currency}</p>
                        </div>
                        <div className="flex flex-col gap-1 ml-1">
                          <button
                            className="text-muted-foreground hover:text-foreground p-1"
                            onClick={() => openEdit(item)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-destructive p-1"
                            onClick={() => deletePrepCost.mutate({ id: item.id })}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "준비 비용 수정" : "준비 비용 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">항목명 *</Label>
              <Input
                placeholder="예: 대한항공 왕복 항공권"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">금액 *</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">카테고리</Label>
              <div className="flex flex-wrap gap-2">
                {PREP_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      form.category === cat
                        ? `cat-${cat} ring-1 ring-current`
                        : "bg-secondary border-border/60 text-muted-foreground"
                    )}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">결제자 *</Label>
              <div className="flex flex-wrap gap-2">
                {members?.map((m) => (
                  <button
                    key={m.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      form.memberId === String(m.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-secondary border-border/60 text-muted-foreground"
                    )}
                    onClick={() => setForm((f) => ({ ...f, memberId: String(m.id) }))}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: m.color ?? "#6366f1" }} />
                    {m.nickname}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">메모 (선택)</Label>
              <Input
                placeholder="메모"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <Button
              className="w-full rounded-xl h-11 font-semibold"
              onClick={handleSubmit}
              disabled={createPrepCost.isPending || updatePrepCost.isPending}
            >
              {createPrepCost.isPending || updatePrepCost.isPending ? "저장 중..." : editId ? "수정하기" : "추가하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TripLayout>
  );
}
