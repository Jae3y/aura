"use client";

import { useState, useEffect } from "react";
import { Shield, Bell, ArrowLeft, AlertTriangle, Settings, User, Volume2, VolumeX } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { clsx } from "clsx";
import Link from "next/link";
import { useThreats } from "@/lib/queries/useThreats";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import { playRelayClick, toggleSound, isSoundEnabled } from "@/components/ui/TactileSound";

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
  const [soundActive, setSoundActive] = useState(true);

  useEffect(() => {
    setSoundActive(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundActive(next);
    if (next) playRelayClick();
  };
  
  const openThreatCount = threats.filter((threat) => threat.alerta_status === "open").length;

  const topLevelRoutes = ["/", "/dashboard", "/monitor", "/control", "/log", "/settings", "/alerta", "/env-control", "/devices", "/reports", "/access", "/profile", "/threats"];
  const isDeepRoute = !topLevelRoutes.includes(pathname ?? "");
  const shouldShowBack = showBack || isDeepRoute;

  return (
    <header className="sticky left-0 top-0 z-40 w-full border-b border-white/10 bg-black/90 backdrop-blur-md font-sans">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Left: Brand / Title */}
        <div className="flex items-center">
          {shouldShowBack ? (
            <button
              onClick={() => {
                playRelayClick();
                router.back();
              }}
              className="mr-3 flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-cyan/40 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <span className="mr-3 flex h-8 w-8 items-center justify-center border border-accent-cyan/40 bg-accent-cyan/10">
              <Shield className="text-accent-cyan" size={16} />
            </span>
          )}
          
          {title && (
            <div className="flex flex-col">
              <h1 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-white sm:text-base">
                {title}
              </h1>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-muted hidden sm:inline">
                AURA // COMMAND_PWA
              </span>
            </div>
          )}
        </div>
        
        {/* Right: Actions & Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-text-secondary">
          
          {/* Audio Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundActive ? "Mute Tactile Sound" : "Enable Tactile Sound"}
            className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors"
          >
            {soundActive ? <Volume2 size={15} /> : <VolumeX size={15} className="text-text-muted" />}
          </button>

          {/* Alerta Badge */}
          <Link
            href="/alerta"
            onClick={playRelayClick}
            className="relative flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-danger/40 hover:text-accent-danger transition-colors"
            aria-label="Open Alerta"
          >
            <AlertTriangle size={15} className={openThreatCount > 0 ? "text-accent-danger animate-pulse" : ""} />
            {openThreatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent-danger text-black font-mono text-[9px] font-bold w-4 h-4 flex items-center justify-center">
                {openThreatCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <button
            onClick={playRelayClick}
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-cyan/40 hover:text-white transition-colors"
          >
            <Bell size={15} />
          </button>

          {/* Profile */}
          <Link
            href="/profile"
            onClick={playRelayClick}
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-cyan/40 hover:text-white transition-colors"
          >
            <User size={15} />
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            onClick={playRelayClick}
            aria-label="Settings"
            className="hidden sm:flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-cyan/40 hover:text-white transition-colors"
          >
            <Settings size={15} />
          </Link>

          {/* Environment Switcher Badge */}
          <Link
            href="/env-control"
            onClick={playRelayClick}
            aria-label="Switch environment"
            className={`hidden sm:flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] transition-all hover:border-white/40 ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}
          >
            <span className="led-indicator led-green" />
            {config.shortName}
          </Link>
        </div>
      </div>

      {/* Secondary Nav Pills */}
      {secondaryItems.length > 0 && (
        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8 font-mono">
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={playRelayClick}
                className={clsx(
                  "shrink-0 border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-all",
                  isActive
                    ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan"
                    : "border-white/10 bg-white/[0.03] text-text-secondary hover:border-white/20 hover:text-white"
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
