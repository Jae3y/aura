'use client';
import { WalletGuard } from '@/components/auth/WalletGuard';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <WalletGuard>{children}</WalletGuard>;
}
