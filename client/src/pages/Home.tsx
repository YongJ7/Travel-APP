import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarDays,
  ChevronRight,
  LogIn,
  MapPin,
  Plus,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TRIP_EMOJIS = ["✈️", "🏖️", "🏔️", "🌏", "🗺️", "🏕️", "🚢", "🚂", "🎡", "🌸"];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const { data: trips, isLoading: tripsLoading, refetch } = trpc.trips.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (data) => {
      refetch();
      setShowCreate(false);
      navigate(`/trip/${data.tripId}`);
      toast.success("여행이 생성되었습니다!");
    },
    onError: (e) => toast.error(e.message),
  });

  const joinTrip = trpc.trips.joinByCode.useMutation({
    onSuccess: (data) => {
      setShowJoin(false);
      navigate(`/trip/${data.tripId}`);
      toast.success(data.alreadyMember ? "이미 참여 중인 여행입니다." : "여행에 참여했습니다!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Create form state
  const [form, setForm] = useState({
    title: "",
    destination: "",
    emoji: "✈️",
    startDate: "",
    endDate: "",
    currency: "KRW",
    budget: "",
    memberNicknames: [""],
  });

  const handleCreate = () => {
    if (!form.title.trim()) return toast.error("여행명을 입력해주세요.");
    createTrip.mutate({
      ...form,
      memberNicknames: form.memberNicknames.filter((n) => n.trim()),
    });
  };

  const addMemberField = () =>
    setForm((f) => ({ ...f, memberNicknames: [...f.memberNicknames, ""] }));

  const updateMember = (i: number, val: string) =>
    setForm((f) => {
      const arr = [...f.memberNicknames];
      arr[i] = val;
      return { ...f, memberNicknames: arr };
    });

  const removeMember = (i: number) =>
    setForm((f) => ({
      ...f,
      memberNicknames: f.memberNicknames.filter((_, idx) => idx !== i),
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="text-6xl mb-2">✈️</div>
          <h1 className="text-3xl font-bold gradient-text">여행 가계부</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            여행의 모든 순간을 기록하세요.<br />
            지출, 동선, 정산까지 한 곳에서.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {["💰 지출 기록", "🗺️ 지도 동선", "🤝 더치페이", "🤖 AI 분석"].map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border"
            >
              {f}
            </span>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full max-w-xs gap-2 rounded-2xl h-12 text-base font-semibold"
          onClick={() => (window.location.href = getLoginUrl())}
        >
          <LogIn size={18} />
          로그인하여 시작하기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">안녕하세요,</p>
            <h1 className="text-xl font-bold text-foreground">{user?.name ?? "여행자"}님 👋</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border/60 text-xs h-8"
              onClick={() => setShowJoin(true)}
            >
              <Ticket size={13} className="mr-1" />
              코드 입력
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-xs h-8 gap-1"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={13} />
              새 여행
            </Button>
          </div>
        </div>
      </div>

      {/* Trip List */}
      <div className="px-4 py-4 space-y-3 page-enter">
        {tripsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : !trips || trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center text-4xl">
              🗺️
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">아직 여행이 없어요</p>
              <p className="text-sm text-muted-foreground mt-1">첫 번째 여행을 만들어보세요!</p>
            </div>
            <Button
              className="rounded-2xl gap-2 px-6"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} />
              여행 만들기
            </Button>
          </div>
        ) : (
          trips.map((trip) => (
            <button
              key={trip.id}
              className="w-full text-left glass-card rounded-2xl p-4 hover:border-primary/40 transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                  {trip.emoji ?? "✈️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{trip.title}</h3>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </div>
                  {trip.destination && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{trip.destination}</span>
                    </div>
                  )}
                  {(trip.startDate || trip.endDate) && (
                    <div className="flex items-center gap-1 mt-1">
                      <CalendarDays size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {trip.startDate
                          ? format(new Date(trip.startDate), "MM.dd", { locale: ko })
                          : "?"}
                        {" ~ "}
                        {trip.endDate
                          ? format(new Date(trip.endDate), "MM.dd", { locale: ko })
                          : "?"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">새 여행 만들기</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pb-2">
            {/* Emoji picker */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">여행 아이콘</Label>
              <div className="flex gap-2 flex-wrap">
                {TRIP_EMOJIS.map((e) => (
                  <button
                    key={e}
                    className={cn(
                      "w-10 h-10 rounded-xl text-xl transition-all",
                      form.emoji === e
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-secondary hover:bg-accent"
                    )}
                    onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">여행명 *</Label>
              <Input
                placeholder="예: 도쿄 가족여행"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">목적지</Label>
              <Input
                placeholder="예: 일본 도쿄"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">출발일</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">귀국일</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">통화</Label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full h-9 rounded-xl bg-secondary border border-border/60 text-sm px-3 text-foreground"
                >
                  {["KRW", "JPY", "USD", "EUR", "CNY", "THB", "SGD", "HKD"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">총 예산</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users size={12} /> 멤버 추가
                </Label>
                <button
                  className="text-xs text-primary hover:text-primary/80"
                  onClick={addMemberField}
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-2">
                {form.memberNicknames.map((nick, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`멤버 ${i + 1} 이름`}
                      value={nick}
                      onChange={(e) => updateMember(i, e.target.value)}
                      className="bg-secondary border-border/60 rounded-xl"
                    />
                    {form.memberNicknames.length > 1 && (
                      <button
                        className="text-muted-foreground hover:text-destructive p-2"
                        onClick={() => removeMember(i)}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full rounded-xl h-11 font-semibold"
              onClick={handleCreate}
              disabled={createTrip.isPending}
            >
              {createTrip.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  생성 중...
                </span>
              ) : (
                "여행 만들기"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Trip Dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">초대 코드로 참여</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              친구에게 받은 8자리 초대 코드를 입력하세요.
            </p>
            <Input
              placeholder="예: ABC12345"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="bg-secondary border-border/60 rounded-xl text-center text-lg font-mono tracking-widest"
              maxLength={8}
            />
            <Button
              className="w-full rounded-xl h-11 font-semibold"
              onClick={() => joinTrip.mutate({ code: joinCode })}
              disabled={joinCode.length < 6 || joinTrip.isPending}
            >
              참여하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
