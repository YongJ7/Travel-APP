import { cn } from "@/lib/utils";
import {
  BarChart3,
  BrainCircuit,
  Map,
  Settings,
  Wallet,
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface TripLayoutProps {
  tripId: number;
  children: React.ReactNode;
  title?: string;
}

const tabs = [
  { key: "dashboard", label: "홈", icon: BarChart3, path: "" },
  { key: "expenses", label: "지출", icon: Wallet, path: "/expenses" },
  { key: "map", label: "지도", icon: Map, path: "/map" },
  { key: "ai", label: "AI 분석", icon: BrainCircuit, path: "/ai" },
  { key: "settings", label: "설정", icon: Settings, path: "/settings" },
];

export default function TripLayout({ tripId, children }: TripLayoutProps) {
  const [location] = useLocation();

  const getActiveTab = () => {
    const path = location.replace(`/trip/${tripId}`, "");
    if (path === "" || path === "/") return "dashboard";
    if (path.startsWith("/expenses")) return "expenses";
    if (path.startsWith("/map")) return "map";
    if (path.startsWith("/ai")) return "ai";
    if (path.startsWith("/settings")) return "settings";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-lg mx-auto relative">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="bottom-tab-bar fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const href = `/trip/${tripId}${tab.path}`;
            return (
              <Link key={tab.key} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200",
                      isActive && "bg-primary/15"
                    )}
                  >
                    <Icon
                      size={isActive ? 20 : 18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className="transition-all duration-200"
                    />
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-all duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
