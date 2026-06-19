import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format Solana signature for display (shorten)
export function shortenSignature(sig: string, chars = 4): string {
  return `${sig.slice(0, chars)}...${sig.slice(-chars)}`;
}

// Format wallet address for display
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Format date/time for display
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Format relative time (e.g., "2 minutes ago")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Get Solana explorer URL
export function getSolanaExplorerUrl(signature: string, cluster = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

// Get severity color class
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-500 bg-red-500/10 border-red-500';
    case 'high':
      return 'text-orange-500 bg-orange-500/10 border-orange-500';
    case 'medium':
      return 'text-amber-500 bg-amber-500/10 border-amber-500';
    case 'low':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500';
  }
}

// Get Alerta status color
export function getAlertaStatusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'text-red-500';
    case 'ack':
      return 'text-amber-500';
    case 'closed':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}
