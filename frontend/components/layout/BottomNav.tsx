"use client";

import { Home, Radar, SlidersHorizontal, Cpu, Wallet, User, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/stores/authStore";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/control", label: "Ops", icon: SlidersHorizontal },
  { href: "/alerta", label: "Alerta", icon: AlertTriangle },
  { href: "/threats", label: "Threats", icon: Radar },
  { href: "/devices", label: "Devices", icon: Cpu },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, walletAddress } = useAuthStore();

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-zinc-800 bg-card lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {/* Connect wallet item — shown when not authenticated */}
        {!isAuthenticated && (
          <Link
            href="/connect"
            className={clsx(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              pathname === "/connect"
                ? "text-accent-cyan"
                : "text-emerald-400 hover:text-emerald-300 transition-colors"
            )}
          >
            <Wallet
              size={20}
              className={clsx(
                pathname === "/connect"
                  ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  : "drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
              )}
            />
            <span className="text-[10px] uppercase font-bold tracking-wider">Connect</span>
          </Link>
        )}

        {/* Wallet address pill — shown when authenticated */}
        {isAuthenticated && walletAddress && (
          <Link
            href="/profile"
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-accent-cyan"
          >
            <Wallet size={20} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <span className="text-[10px] font-mono tracking-tight">
              {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}
            </span>
          </Link>
        )}

        {/* Profile indicator — shown when authenticated via email without wallet */}
        {isAuthenticated && !walletAddress && (
          <Link
            href="/profile"
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-accent-cyan"
          >
            <User size={20} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Profile</span>
          </Link>
        )}

        {/* Main nav items */}
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive
                  ? "text-accent-cyan"
                  : "text-text-muted hover:text-text-secondary transition-colors"
              )}
            >
              <Icon size={20} className={clsx(isActive && "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]")} />
              <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}
