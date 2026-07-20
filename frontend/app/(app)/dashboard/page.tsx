"use client";

import dynamic from "next/dynamic";

const DashboardContent = dynamic(() => import("./_content"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-text-muted tracking-widest uppercase">
          Initializing command center...
        </span>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardContent />;
}
