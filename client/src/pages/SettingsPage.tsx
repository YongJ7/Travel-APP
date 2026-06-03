import TripLayout from "@/components/TripLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Copy,
  Edit2,
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const MEMBER_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export default function SettingsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");
  const { logout } = useAuth();

  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberColor, setNewMemberColor] = useState(MEMBER_COLORS[0]!);

  const utils = trpc.useUtils();
  const { data: trip, refetch: refetchTrip } = trpc.trips.get.useQuery({ tripId: id });
  const { data: members, refetch: refetchMembers } = trpc.members.list.useQuery({ tripId: id });

  const [tripForm, setTripForm] = useState({
    title: trip?.title ?? "",
    destination: trip?.destination ?? "",
    emoji: trip?.emoji ?? "✈️",
    startDate: trip?.startDate ? String(trip.startDate).split("T")[0]! : "",
    endDate: trip?.endDate ? String(trip.endDate).split("T")[0]! : "",
    currency: trip?.currency ?? "KRW",
    budget: trip?.budget ? String(trip.budget) : "",
  });

  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => {
      refetchTrip();
      setShowEditTrip(false);
      toast.success("여행 정보가 수정되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTrip = trpc.trips.delete.useMutation({
    onSuccess: () => {
      navigate("/");
      toast.success("여행이 삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const addMember = trpc.members.add.useMutation({
    onSuccess: () => {
      refetchMembers();
      utils.members.list.invalidate({ tripId: id });
      setShowAddMember(false);
      setNewMemberName("");
      toast.success("멤버가 추가되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMember = trpc.members.delete.useMutation({
    onSuccess: () => {
      refetchMembers();
      utils.members.list.invalidate({ tripId: id });
      toast.success("멤버가 삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyInviteCode = () => {
    if (trip?.inviteCode) {
      navigator.clipboard.writeText(trip.inviteCode);
      toast.success("초대 코드가 복사되었습니다!");
    }
  };

  const handleUpdateTrip = () => {
    if (!tripForm.title.trim()) return toast.error("여행명을 입력하세요.");
    updateTrip.mutate({
      tripId: id,
      title: tripForm.title,
      destination: tripForm.destination || undefined,
      emoji: tripForm.emoji,
      startDate: tripForm.startDate || undefined,
      endDate: tripForm.endDate || undefined,
      currency: tripForm.currency,
      budget: tripForm.budget || undefined,
    });
  };

  const openEditTrip = () => {
    setTripForm({
      title: trip?.title ?? "",
      destination: trip?.destination ?? "",
      emoji: trip?.emoji ?? "✈️",
      startDate: trip?.startDate ? String(trip.startDate).split("T")[0]! : "",
      endDate: trip?.endDate ? String(trip.endDate).split("T")[0]! : "",
      currency: trip?.currency ?? "KRW",
      budget: trip?.budget ? String(trip.budget) : "",
    });
    setShowEditTrip(true);
  };

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
              <h1 className="text-lg font-bold">설정</h1>
              <p className="text-xs text-muted-foreground">{trip?.title}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Trip Info */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                여행 정보
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl">
                  {trip?.emoji ?? "✈️"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{trip?.title}</p>
                  {trip?.destination && (
                    <p className="text-sm text-muted-foreground">{trip.destination}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border/60 h-8 text-xs"
                  onClick={openEditTrip}
                >
                  <Edit2 size={12} className="mr-1" />
                  수정
                </Button>
              </div>

              {(trip?.startDate || trip?.endDate) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">기간</span>
                  <span>
                    {trip.startDate ? String(trip.startDate).split("T")[0] : "?"}
                    {" ~ "}
                    {trip.endDate ? String(trip.endDate).split("T")[0] : "?"}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">통화</span>
                <span className="font-medium">{trip?.currency}</span>
              </div>
              {trip?.budget && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">예산</span>
                  <span className="font-medium">
                    {parseFloat(String(trip.budget)).toLocaleString()} {trip.currency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Invite Code */}
          {trip?.inviteCode && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                초대 코드
              </h3>
              <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">친구에게 공유하세요</p>
                  <p className="font-mono font-bold text-xl text-primary tracking-widest">
                    {trip.inviteCode}
                  </p>
                </div>
                <button
                  className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  onClick={copyInviteCode}
                >
                  <Copy size={16} className="text-primary" />
                </button>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} />
                멤버 ({members?.length ?? 0}명)
              </h3>
              <button
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                onClick={() => setShowAddMember(true)}
              >
                <UserPlus size={12} />
                추가
              </button>
            </div>
            <div className="divide-y divide-border/30">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: m.color ?? "#6366f1" }}
                  >
                    {m.nickname[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.isGuest ? "게스트" : "멤버"}
                    </p>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive p-1.5 transition-colors"
                    onClick={() => deleteMember.mutate({ memberId: m.id })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card rounded-2xl overflow-hidden border-destructive/20">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-xs font-semibold text-destructive/80 uppercase tracking-wider">
                위험 구역
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium">여행 삭제</span>
              </button>
            </div>
          </div>

          {/* Logout */}
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => logout()}
          >
            <LogOut size={16} />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </div>

      {/* Edit Trip Dialog */}
      <Dialog open={showEditTrip} onOpenChange={setShowEditTrip}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>여행 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">여행명</Label>
              <Input
                value={tripForm.title}
                onChange={(e) => setTripForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">목적지</Label>
              <Input
                value={tripForm.destination}
                onChange={(e) => setTripForm((f) => ({ ...f, destination: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">출발일</Label>
                <Input
                  type="date"
                  value={tripForm.startDate}
                  onChange={(e) => setTripForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">귀국일</Label>
                <Input
                  type="date"
                  value={tripForm.endDate}
                  onChange={(e) => setTripForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">통화</Label>
                <select
                  value={tripForm.currency}
                  onChange={(e) => setTripForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full h-9 rounded-xl bg-secondary border border-border/60 text-sm px-3 text-foreground"
                >
                  {["KRW", "JPY", "USD", "EUR", "CNY", "THB", "SGD", "HKD"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">예산</Label>
                <Input
                  type="number"
                  value={tripForm.budget}
                  onChange={(e) => setTripForm((f) => ({ ...f, budget: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
            </div>
            <Button
              className="w-full rounded-xl h-11 font-semibold"
              onClick={handleUpdateTrip}
              disabled={updateTrip.isPending}
            >
              {updateTrip.isPending ? "저장 중..." : "저장하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>멤버 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">이름</Label>
              <Input
                placeholder="멤버 이름"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">색상</Label>
              <div className="flex gap-2 flex-wrap">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      newMemberColor === c && "ring-2 ring-white ring-offset-2 ring-offset-card"
                    )}
                    style={{ background: c }}
                    onClick={() => setNewMemberColor(c)}
                  />
                ))}
              </div>
            </div>
            <Button
              className="w-full rounded-xl h-11 font-semibold"
              onClick={() => {
                if (!newMemberName.trim()) return toast.error("이름을 입력하세요.");
                addMember.mutate({
                  tripId: id,
                  nickname: newMemberName.trim(),
                  color: newMemberColor,
                });
              }}
              disabled={addMember.isPending}
            >
              {addMember.isPending ? "추가 중..." : "추가하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-destructive">여행 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{trip?.title}</span>을(를) 삭제하면 모든 지출, 장소, 멤버 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-border/60"
                onClick={() => setShowDeleteConfirm(false)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl"
                onClick={() => deleteTrip.mutate({ tripId: id })}
                disabled={deleteTrip.isPending}
              >
                {deleteTrip.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TripLayout>
  );
}
