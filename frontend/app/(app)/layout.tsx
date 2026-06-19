// Route group layout for (app) - no extra wrapper needed
// AppShell in root layout already handles TopBar + BottomNav
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
