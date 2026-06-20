"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes that shouldn't have TopBar (but still have BottomNav for navigation)
  const isFullScreenRoute = pathname?.startsWith("/onboarding");

  // Derive title based on simple path logic if not explicitly provided
  const getRouteTitle = () => {
    if (pathname?.startsWith("/dashboard")) return "";
    if (pathname?.startsWith("/monitor")) return "Threat Monitor";
    if (pathname?.startsWith("/control")) return "Device Control";
    if (pathname?.startsWith("/env-control")) return "Env Control";
    if (pathname?.startsWith("/alerta")) return "Alerta";
    if (pathname?.startsWith("/log")) return "Event Log";
    if (pathname?.startsWith("/settings")) return "Settings";
    if (pathname?.startsWith("/detection")) return "Spatial View";
    if (pathname?.startsWith("/analytics")) return "Analytics";
    if (pathname?.startsWith("/access")) return "Access Control";
    if (pathname?.startsWith("/voice")) return "Voice Command";
    if (pathname?.startsWith("/reports")) return "Reports";
    return "";
  };

  if (isFullScreenRoute) {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto relative bg-base">
        <main className="flex-1 flex flex-col pb-16 relative">{children}</main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto relative bg-base">
      <TopBar title={getRouteTitle()} />
      <main className="flex-1 flex flex-col pb-16 relative">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
