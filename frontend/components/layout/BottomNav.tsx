"use client";

import { Home, Radar, SlidersHorizontal, Cpu, Wallet, User, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/stores/authStore";
import { playRelayClick } from "@/components/ui/TactileSound";

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
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-white/10 bg-black/95 backdrop-blur-md lg:hidden font-mono">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {/* Connect wallet item — shown when not authenticated */}
        {!isAuthenticated && (
          <Link
            href="/connect"
            onClick={playRelayClick}
            className={clsx(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              pathname === "/connect"
                ? "text-accent-cyan font-bold"
                : "text-accent-teal hover:text-white"
            )}
          >
            <Wallet size={18} />
            <span className="text-[9.5px] uppercase font-bold tracking-wider">Connect</span>
          </Link>
        )}

        {/* Wallet address pill — shown when authenticated */}
        {isAuthenticated && walletAddress && (
          <Link
            href="/profile"
            onClick={playRelayClick}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-accent-cyan"
          >
            <Wallet size={18} />
            <span className="text-[9.5px] font-mono tracking-tight font-bold">
              {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}
            </span>
          </Link>
        )}

        {/* Profile indicator — shown when authenticated via email without wallet */}
        {isAuthenticated && !walletAddress && (
          <Link
            href="/profile"
            onClick={playRelayClick}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-accent-cyan"
          >
            <User size={18} />
            <span className="text-[9.5px] uppercase font-bold tracking-wider">Profile</span>
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
              onClick={playRelayClick}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all relative",
                isActive
                  ? "text-accent-cyan font-bold"
                  : "text-text-muted hover:text-white"
              )}
            >
              {isActive && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-accent-cyan shadow-[0_0_6px_rgba(6,182,212,1)]" />
              )}
              <Icon size={18} />
              <span className="text-[9.5px] uppercase font-bold tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
