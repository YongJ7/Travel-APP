import TripLayout from "@/components/TripLayout";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Circle, MapPin, Navigation, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

const PLACE_CATEGORIES = ["관광", "식당", "카페", "숙소", "쇼핑", "교통", "기타"];

interface PlaceForm {
  name: string;
  address: string;
  lat: string;
  lng: string;
  category: string;
  visitDate: string;
  status: "planned" | "visited";
  note: string;
}

const defaultForm: PlaceForm = {
  name: "",
  address: "",
  lat: "",
  lng: "",
  category: "관광",
  visitDate: "",
  status: "planned",
  note: "",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "#6366f1",
  visited: "#10b981",
};

export default function MapPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(tripId ?? "0");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlaceForm>(defaultForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "planned" | "visited">("all");
  const [showRoute, setShowRoute] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const utils = trpc.useUtils();
  const { data: trip } = trpc.trips.get.useQuery({ tripId: id });
  const { data: places, isLoading } = trpc.places.list.useQuery({ tripId: id });

  const createPlace = trpc.places.create.useMutation({
    onSuccess: () => {
      utils.places.list.invalidate({ tripId: id });
      setShowForm(false);
      setForm(defaultForm);
      toast.success("장소가 추가되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePlace = trpc.places.update.useMutation({
    onSuccess: () => {
      utils.places.list.invalidate({ tripId: id });
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
      toast.success("수정되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePlace = trpc.places.delete.useMutation({
    onSuccess: () => {
      utils.places.list.invalidate({ tripId: id });
      toast.success("삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Initialize Autocomplete when dialog search input mounts
  const initAutocomplete = useCallback((inputEl: HTMLInputElement | null) => {
    searchInputRef.current = inputEl;
    if (!inputEl || !mapRef.current) return;
    // Destroy previous instance
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
    if (typeof google === "undefined" || !google.maps?.places) return;
    autocompleteRef.current = new google.maps.places.Autocomplete(inputEl, {
      fields: ["name", "formatted_address", "geometry"],
    });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        setForm((f) => ({
          ...f,
          name: place.name ?? f.name,
          address: place.formatted_address ?? "",
          lat: String(place.geometry!.location!.lat()),
          lng: String(place.geometry!.location!.lng()),
        }));
      }
    });
  }, []);

  // Re-init autocomplete when dialog opens
  useEffect(() => {
    if (showForm && searchInputRef.current && mapRef.current) {
      initAutocomplete(searchInputRef.current);
    }
    if (!showForm && autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
  }, [showForm, initAutocomplete]);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      // Add click listener to map for manual pin drop when form is open
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          setForm((f) => ({
            ...f,
            lat: String(e.latLng!.lat()),
            lng: String(e.latLng!.lng()),
          }));
        }
      });
    },
    []
  );

  // Render markers when places change
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !places) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const filtered = filterStatus === "all" ? places : places.filter((p) => p.status === filterStatus);

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    filtered.forEach((place, idx) => {
      if (!place.lat || !place.lng) return;
      const lat = parseFloat(String(place.lat));
      const lng = parseFloat(String(place.lng));
      const pos = { lat, lng };
      bounds.extend(pos);
      hasCoords = true;

      const marker = new google.maps.Marker({
        position: pos,
        map: mapRef.current!,
        title: place.name,
        label: {
          text: String(idx + 1),
          color: "white",
          fontSize: "11px",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: STATUS_COLORS[place.status] ?? "#6366f1",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 8px;min-width:120px">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px">${place.name}</p>
          ${place.address ? `<p style="font-size:11px;color:#888;margin:0">${place.address}</p>` : ""}
          <p style="font-size:11px;color:${STATUS_COLORS[place.status]};margin:4px 0 0">${place.status === "visited" ? "✓ 방문 완료" : "📍 방문 예정"}</p>
        </div>`,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw route polyline for visited places
    if (showRoute) {
      const visitedCoords = filtered
        .filter((p) => p.status === "visited" && p.lat && p.lng)
        .map((p) => ({ lat: parseFloat(String(p.lat)), lng: parseFloat(String(p.lng)) }));

      if (visitedCoords.length > 1) {
        polylineRef.current = new google.maps.Polyline({
          path: visitedCoords,
          geodesic: true,
          strokeColor: "#10b981",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: mapRef.current!,
        });
      }
    }

    if (hasCoords) {
      mapRef.current!.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
    }
  }, [places, filterStatus, showRoute]);

  // Re-render markers when data changes
  const [mapReady, setMapReady] = useState(false);
  const handleMapReadyWithRender = useCallback(
    (map: google.maps.Map) => {
      handleMapReady(map);
      setMapReady(true);
    },
    [handleMapReady]
  );

  // Trigger marker render after map is ready
  if (mapReady && mapRef.current) {
    renderMarkers();
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("장소명을 입력하세요.");

    if (editId) {
      updatePlace.mutate({
        id: editId,
        name: form.name,
        address: form.address || undefined,
        lat: form.lat || undefined,
        lng: form.lng || undefined,
        category: form.category,
        visitDate: form.visitDate || undefined,
        status: form.status,
        note: form.note || undefined,
      });
    } else {
      createPlace.mutate({
        tripId: id,
        name: form.name,
        address: form.address || undefined,
        lat: form.lat || undefined,
        lng: form.lng || undefined,
        category: form.category,
        visitDate: form.visitDate || undefined,
        status: form.status,
        note: form.note || undefined,
      });
    }
  };

  const openEdit = (p: NonNullable<typeof places>[number]) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      address: p.address ?? "",
      lat: p.lat ? String(p.lat) : "",
      lng: p.lng ? String(p.lng) : "",
      category: p.category ?? "관광",
      visitDate: p.visitDate ? String(p.visitDate).split("T")[0]! : "",
      status: p.status,
      note: p.note ?? "",
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const filteredPlaces = filterStatus === "all"
    ? places
    : places?.filter((p) => p.status === filterStatus);

  return (
    <TripLayout tripId={id}>
      <div className="page-enter flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 pt-12 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80"
              onClick={() => navigate(`/trip/${id}`)}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">방문 장소</h1>
              <p className="text-xs text-muted-foreground">{trip?.title}</p>
            </div>
            <Button size="sm" className="rounded-xl gap-1 h-8 text-xs" onClick={openCreate}>
              <Plus size={13} /> 추가
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(["all", "planned", "visited"] as const).map((s) => (
              <button
                key={s}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                  filterStatus === s
                    ? s === "visited"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : s === "planned"
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-secondary border-border text-foreground"
                    : "bg-secondary/50 border-border/60 text-muted-foreground"
                )}
                onClick={() => setFilterStatus(s)}
              >
                {s === "all" ? "전체" : s === "planned" ? "📍 예정" : "✓ 방문"}
              </button>
            ))}
            <button
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ml-auto",
                showRoute
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-secondary/50 border-border/60 text-muted-foreground"
              )}
              onClick={() => setShowRoute((v) => !v)}
            >
              <Navigation size={12} className="inline mr-1" />
              동선
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-shrink-0" style={{ height: "280px" }}>
          <MapView
            onMapReady={handleMapReadyWithRender}
            className="w-full h-full"
            initialCenter={
              places?.find((p) => p.lat && p.lng)
                ? {
                    lat: parseFloat(String(places.find((p) => p.lat)!.lat)),
                    lng: parseFloat(String(places.find((p) => p.lng)!.lng)),
                  }
                : { lat: 35.6762, lng: 139.6503 }
            }
            initialZoom={12}
          />
        </div>

        {/* Place List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : !filteredPlaces || filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="text-4xl">🗺️</div>
              <p className="text-muted-foreground text-sm">아직 등록된 장소가 없어요</p>
              <Button className="rounded-xl gap-2 text-sm" onClick={openCreate}>
                <Plus size={14} /> 장소 추가
              </Button>
            </div>
          ) : (
            filteredPlaces.map((place, idx) => (
              <div
                key={place.id}
                className="glass-card rounded-xl p-3.5 flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: STATUS_COLORS[place.status] ?? "#6366f1" }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{place.name}</p>
                    {place.status === "visited" ? (
                      <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle size={13} className="text-primary flex-shrink-0" />
                    )}
                  </div>
                  {place.address && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{place.address}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {place.category && (
                      <span className="text-xs text-muted-foreground">{place.category}</span>
                    )}
                    {place.visitDate && (
                      <span className="text-xs text-muted-foreground">
                        · {String(place.visitDate).split("T")[0]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    className="text-muted-foreground hover:text-foreground p-1.5"
                    onClick={() => openEdit(place)}
                  >
                    <MapPin size={13} />
                  </button>
                  <button
                    className="text-muted-foreground hover:text-destructive p-1.5"
                    onClick={() => deletePlace.mutate({ id: place.id })}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
        <DialogContent className="bg-card border-border rounded-3xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "장소 수정" : "장소 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">장소 검색 (Google)</Label>
              <Input
                ref={initAutocomplete}
                placeholder="장소명 또는 주소 검색..."
                className="bg-secondary border-border/60 rounded-xl"
              />
              {form.lat && form.lng && (
                <p className="text-xs text-emerald-400 mt-1">
                  📍 좌표 선택됨: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">장소명 *</Label>
              <Input
                placeholder="예: 도쿄 타워"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">주소</Label>
              <Input
                placeholder="주소"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="bg-secondary border-border/60 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">위도</Label>
                <Input
                  placeholder="35.6762"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">경도</Label>
                <Input
                  placeholder="139.6503"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">카테고리</Label>
              <div className="flex flex-wrap gap-2">
                {PLACE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      form.category === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-secondary border-border/60 text-muted-foreground"
                    )}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">방문일</Label>
                <Input
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                  className="bg-secondary border-border/60 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">상태</Label>
                <div className="flex gap-2">
                  {(["planned", "visited"] as const).map((s) => (
                    <button
                      key={s}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                        form.status === s
                          ? s === "visited"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : "border-primary bg-primary/10 text-primary"
                          : "bg-secondary border-border/60 text-muted-foreground"
                      )}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                    >
                      {s === "planned" ? "예정" : "방문"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">메모</Label>
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
              disabled={createPlace.isPending || updatePlace.isPending}
            >
              {createPlace.isPending || updatePlace.isPending ? "저장 중..." : editId ? "수정하기" : "추가하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TripLayout>
  );
}
