"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { AlertTriangle, BarChart3, Cpu, FileText, LayoutDashboard, LockKeyhole, RadioTower, Shield } from "lucide-react";

export const PRIMARY_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/control", label: "Operations", icon: RadioTower },
  { href: "/alerta", label: "Alerta", icon: AlertTriangle, emphasis: true },
  { href: "/threats", label: "Threats", icon: Shield },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/access", label: "Access", icon: LockKeyhole },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const SECONDARY_NAV: Record<string, Array<{ href: string; label: string }>> = {
  "/dashboard": [
    { href: "/analytics", label: "Analytics" },
    { href: "/blockchain", label: "Blockchain" },
    { href: "/alerta", label: "Alerta" },
  ],
  "/control": [
    { href: "/control", label: "Controls" },
    { href: "/env-control", label: "Env Control" },
    { href: "/voice", label: "Voice" },
    { href: "/detection", label: "Detection" },
  ],
  "/threats": [
    { href: "/threats", label: "Threat Center" },
    { href: "/monitor", label: "Monitor" },
    { href: "/log", label: "Event Log" },
    { href: "/alerta", label: "Alerta" },
  ],
  "/devices": [
    { href: "/devices", label: "Devices" },
    { href: "/control", label: "Relays" },
    { href: "/env-control", label: "Environment" },
  ],
  "/reports": [
    { href: "/reports", label: "Reports" },
    { href: "/analytics", label: "Analytics" },
    { href: "/blockchain", label: "Ledger" },
  ],
  "/access": [
    { href: "/access", label: "Access" },
    { href: "/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
  ],
  "/profile": [
    { href: "/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
    { href: "/connect", label: "Connect" },
  ],
};

const TITLES: Array<[string, string]> = [
  ["/dashboard", "Overview"],
  ["/monitor", "Threat Monitor"],
  ["/control", "Operations"],
  ["/env-control", "Environment Control"],
  ["/alerta", "Alerta"],
  ["/log", "Event Log"],
  ["/settings", "Settings"],
  ["/detection", "Spatial Detection"],
  ["/analytics", "Analytics"],
  ["/access", "Access Control"],
  ["/voice", "Voice Command"],
  ["/reports", "Reports"],
  ["/profile", "Profile"],
  ["/devices", "Devices"],
  ["/threats", "Threats"],
  ["/blockchain", "Blockchain"],
];

function getRouteTitle(pathname: string | null) {
  return TITLES.find(([href]) => pathname?.startsWith(href))?.[1] ?? "AURA";
}

function getSecondaryItems(pathname: string | null) {
  const activeRoot = Object.keys(SECONDARY_NAV).find((href) => pathname?.startsWith(href));
  return activeRoot ? SECONDARY_NAV[activeRoot] : [];
}

function DesktopPrimaryNav({ pathname }: { pathname: string | null }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-5">
      <Link href="/" className="mb-8 flex items-center gap-3 px-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          <Shield size={21} />
        </span>
        <span>
          <span className="block font-heading text-lg font-bold uppercase text-white">AURA</span>
          <span className="block text-[10px] uppercase tracking-[0.22em] text-text-muted">Command PWA</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors",
                isActive
                  ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                  : "text-text-secondary hover:bg-white/5 hover:text-white",
                item.emphasis && !isActive && "text-red-300"
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">PWA Ready</p>
        <p className="mt-2 text-xs leading-5 text-text-secondary">
          Installable mobile-first command center with offline fallback and shareable routes.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreenRoute = pathname?.startsWith("/onboarding");
  const title = getRouteTitle(pathname);
  const secondaryItems = getSecondaryItems(pathname);

  if (isFullScreenRoute) {
    return (
      <div className="relative flex min-h-dvh w-full flex-col bg-base text-text-primary">
        <main className="relative flex flex-1 flex-col pb-16">{children}</main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-base text-text-primary">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col lg:flex-row">
        <aside className="hidden border-r border-white/10 bg-black/20 lg:flex lg:w-72 lg:flex-col">
          <DesktopPrimaryNav pathname={pathname} />
        </aside>
        <div className="flex min-h-dvh flex-1 flex-col">
          <TopBar title={title} secondaryItems={secondaryItems} />
          <main className="relative flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
