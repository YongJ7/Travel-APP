import TripLayout from "@/components/TripLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowLeft,
  Edit2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

const CATEGORIES = ["식비", "교통", "숙소", "관광", "쇼핑", "기타"];

interface ExpenseForm {
  title: string;
  amount: string;
  category: string;
  expenseDate: string;
  memberId: string;
  placeName: string;
  note: string;
}

const defaultForm: ExpenseForm = {
  title: "",
  amount: "",
  category: "식비",
  expenseDate: new Date().toISOString().split("T")[0]!,
  memberId: "",
  placeName: "",
  note: "",
};

export default function ExpensesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>(defaultForm);
  const [filterDate, setFilterDate] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: trip } = trpc.trips.get.useQuery({ tripId: id });
  const { data: members } = trpc.members.list.useQuery({ tripId: id });
  const { data: expenses, isLoading } = trpc.expenses.list.useQuery({ tripId: id });

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ tripId: id });
      setShowForm(false);
      setForm(defaultForm);
      toast.success("지출이 추가되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ tripId: id });
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
      toast.success("수정되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ tripId: id });
      toast.success("삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("항목명을 입력하세요.");
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error("금액을 입력하세요.");
    if (!form.memberId) return toast.error("결제자를 선택하세요.");

    if (editId) {
      updateExpense.mutate({
        expenseId: editId,
        title: form.title,
        amount: form.amount,
        category: form.category,
        expenseDate: form.expenseDate,
        memberId: parseInt(form.memberId),
        placeName: form.placeName || undefined,
        note: form.note || undefined,
      });
    } else {
      createExpense.mutate({
        tripId: id,
        memberId: parseInt(form.memberId),
        title: form.title,
        amount: form.amount,
        category: form.category,
        expenseDate: form.expenseDate,
        placeName: form.placeName || undefined,
        note: form.note || undefined,
      });
    }
  };

  const openEdit = (e: typeof expenses extends (infer T)[] | undefined ? T : never) => {
    if (!e) return;
    setEditId(e.id);
    setForm({
      title: e.title,
      amount: String(e.amount),
      category: e.category,
      expenseDate: String(e.expenseDate).split("T")[0]!,
      memberId: String(e.memberId),
      placeName: e.placeName ?? "",
      note: e.note ?? "",
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...defaultForm,
      expenseDate: filterDate || defaultForm.expenseDate,
      memberId: members?.[0] ? String(members[0].id) : "",
    });
    setShowForm(true);
  };

  // Group by date
  const grouped: Record<string, typeof expenses> = {};
  const filtered = filterDate
    ? expenses?.filter((e) => String(e.expenseDate).startsWith(filterDate))
    : expenses;

  filtered?.forEach((e) => {
    const d = String(e.expenseDate).split("T")[0]!;
    if (!grouped[d]) grouped[d] = [];
    grouped[d]!.push(e);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalFiltered = filtered?.reduce((s, e) => s + parseFloat(String(e.amount)), 0) ?? 0;

  const getMemberName = (memberId: number) =>
    members?.find((m) => m.id === memberId)?.nickname ?? "?";

  const getMemberColor = (memberId: number) =>
    members?.find((m) => m.id === memberId)?.color ?? "#6366f1";

  return (
    <TripLayout tripId={id}>
      <div className="page-enter">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 pt-12 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80"
              onClick={() => navigate(`/trip/${id}`)}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">지출 기록</h1>
              <p className="text-xs text-muted-foreground">{trip?.title}</p>
            </div>
            <Button size="sm" className="rounded-xl gap-1 h-8 text-xs" onClick={openCreate}>
              <Plus size={13} /> 추가
            </Button>
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-secondary border-border/60 rounded-xl h-8 text-xs flex-1"
              placeholder="날짜 필터"
            />
            {filterDate && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground px-2"
                onClick={() => setFilterDate("")}
              >
                전체
              </button>
            )}
            <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-xl">
              {totalFiltered.toLocaleString()} {trip?.currency}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-4xl">💳</div>
              <p className="text-muted-foreground text-sm">아직 지출 내역이 없어요</p>
              <Button className="rounded-xl gap-2 text-sm" onClick={openCreate}>
                <Plus size={14} /> 첫 지출 추가
              </Button>
            </div>
          ) : (
            sortedDates.map((date) => {
              const dayExpenses = grouped[date] ?? [];
              const dayTotal = dayExpenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
              const dayLabel = format(parseISO(date), "M월 d일 (E)", { locale: ko });

              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-semibold text-muted-foreground">{dayLabel}</span>
                    <span className="text-xs font-medium text-primary">
                      {dayTotal.toLocaleString()} {trip?.currency}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="glass-card rounded-xl p-3.5 flex items-center gap-3"
                      >
                        <div
                          className={cn(
                            "px-2 py-1 rounded-lg text-xs font-medium border flex-shrink-0",
                            `cat-${expense.category}`
                          )}
                        >
                          {expense.category}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{expense.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: getMemberColor(expense.memberId) }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {getMemberName(expense.memberId)}
                            </span>
                            {expense.placeName && (
                              <>
                                <MapPin size={10} className="text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {expense.placeName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">
                            {parseFloat(String(expense.amount)).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{trip?.currency}</p>
                        </div>
                        <div className="flex flex-col gap-1 ml-1">
                          <button
                            className="text-muted-foreground hover:text-foreground p-1"
                            onClick={() => openEdit(expense)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-destructive p-1"
                            onClick={() => deleteExpense.mutate({ expenseId: expense.id })}
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
            <DialogTitle>{editId ? "지출 수정" : "지출 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">항목명 *</Label>
              <Input
                placeholder="예: 라멘 점심"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <Label className="text-xs text-muted-foreground mb-1.5 block">날짜 *</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">카테고리</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      form.category === cat
                        ? `cat-${cat} ring-1 ring-current`
                        : "bg-secondary border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Payer */}
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
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: m.color ?? "#6366f1" }}
                    />
                    {m.nickname}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">장소 (선택)</Label>
              <Input
                placeholder="예: 이치란 라멘 신주쿠점"
                value={form.placeName}
                onChange={(e) => setForm((f) => ({ ...f, placeName: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
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
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {createExpense.isPending || updateExpense.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  저장 중...
                </span>
              ) : editId ? "수정하기" : "추가하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TripLayout>
  );
}
