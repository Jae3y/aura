"use client";

import { Shield, Bell, ArrowLeft, AlertTriangle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { clsx } from "clsx";
import Link from "next/link";
import { useThreats } from "@/lib/queries/useThreats";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack = false }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: threats = [] } = useThreats("1", 100, true);
  
  const openThreatCount = threats.filter((t: any) => t.status === "open").length;

  // Determine if we should show the back button based on path or explicit prop
  const isDeepRoute = pathname !== "/dashboard" && pathname !== "/monitor" && pathname !== "/control" && pathname !== "/log" && pathname !== "/settings" && pathname !== "/alerta" && pathname !== "/env-control";
  const shouldShowBack = showBack || isDeepRoute;

  return (
    <header className="sticky top-0 left-0 w-full bg-base/90 backdrop-blur-md z-40 border-b border-zinc-900">
      <div className="flex items-center justify-between h-14 max-w-md mx-auto px-4">
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
            <h1 className="font-heading font-bold text-lg tracking-widest text-text-primary uppercase">
              {title}
            </h1>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-text-secondary">
          <Link href="/alerta" className="hover:text-text-primary transition-colors relative">
            <AlertTriangle size={20} className={openThreatCount > 0 ? "text-red-400" : ""} />
            {openThreatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {openThreatCount}
              </span>
            )}
          </Link>
          <button aria-label="Notifications" className="hover:text-text-primary transition-colors">
            <Bell size={20} />
          </button>
          <div className="relative flex items-center justify-center">
            <Shield size={20} className="text-accent-teal" />
            {/* Tiny green dot for connection status */}
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-teal shadow-[0_0_5px_rgba(20,184,166,0.8)]" />
          </div>
        </div>
      </div>
    </header>
  );
}
