"use client";

import { Shield, Bell, ArrowLeft, AlertTriangle, Settings, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { clsx } from "clsx";
import Link from "next/link";
import { useThreats } from "@/lib/queries/useThreats";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  secondaryItems?: Array<{ href: string; label: string }>;
}

export function TopBar({ title, showBack = false, secondaryItems = [] }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: threats = [] } = useThreats("1", 100);
  const { config } = useEnvironmentStore();
  
  const openThreatCount = threats.filter((threat) => threat.alerta_status === "open").length;

  const topLevelRoutes = ["/", "/dashboard", "/monitor", "/control", "/log", "/settings", "/alerta", "/env-control", "/devices", "/reports", "/access", "/profile", "/threats"];
  const isDeepRoute = !topLevelRoutes.includes(pathname ?? "");
  const shouldShowBack = showBack || isDeepRoute;

  return (
    <header className="sticky left-0 top-0 z-40 w-full border-b border-white/10 bg-base/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center">
          {shouldShowBack ? (
            <button
              onClick={() => router.back()}
              className="mr-3 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Shield className="mr-3 text-accent-cyan" size={20} />
          )}
          {title && (
            <h1 className="font-heading text-base font-bold uppercase text-text-primary sm:text-lg">
              {title}
            </h1>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-text-secondary">
          <Link href="/alerta" className="relative rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-200" aria-label="Open Alerta">
            <AlertTriangle size={20} className={openThreatCount > 0 ? "text-red-400" : ""} />
            {openThreatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {openThreatCount}
              </span>
            )}
          </Link>
          <button aria-label="Notifications" className="rounded-lg p-2 transition-colors hover:bg-white/5 hover:text-text-primary">
            <Bell size={20} />
          </button>
          <Link href="/profile" aria-label="Profile" className="rounded-lg p-2 transition-colors hover:bg-white/5 hover:text-text-primary">
            <User size={20} />
          </Link>
          <Link href="/settings" aria-label="Settings" className="hidden rounded-lg p-2 transition-colors hover:bg-white/5 hover:text-text-primary sm:block">
            <Settings size={20} />
          </Link>

          {/* Environment Badge — clickable, links to /env-control */}
          <Link
            href="/env-control"
            aria-label="Switch environment"
            className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest border transition-opacity hover:opacity-80 ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
            </span>
            {config.shortName}
          </Link>
        </div>
      </div>
      {secondaryItems.length > 0 && (
        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors",
                  isActive
                    ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                    : "border-white/10 bg-white/[0.03] text-text-secondary hover:bg-white/10 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
