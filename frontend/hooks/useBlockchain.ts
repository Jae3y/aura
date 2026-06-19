import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export interface ChainEvent {
  id: string;
  event_type: string;
  severity: string;
  occurred_at: string;
  solana_signature: string | null;
  solana_slot: number | null;
  solana_confirmed: boolean;
  explorer_url: string | null;
}

export function useSolanaEvents(deviceId: string | null) {
  return useQuery({
    queryKey: ['blockchain-events', deviceId],
    queryFn: async () => {
      const data = await apiClient.get<{ events: ChainEvent[] }>(
        `/blockchain/events?deviceId=${deviceId}&limit=100`
      );
      return data.events;
    },
    enabled: Boolean(deviceId),
  });
}

export function useVerifySignature(signature: string | null) {
  return useQuery({
    queryKey: ['verify-signature', signature],
    queryFn: () =>
      apiClient.get<{
        confirmed: boolean;
        slot: number | null;
        timestamp: string | null;
        explorerUrl: string | null;
      }>(`/blockchain/verify/${signature}`),
    enabled: Boolean(signature),
  });
}

export function useDeviceNFT(deviceId: string | null) {
  return useQuery({
    queryKey: ['device-nft', deviceId],
    queryFn: () =>
      apiClient.get<{
        mintAddress: string;
        explorerUrl: string;
        metadata: Record<string, unknown>;
      }>(`/blockchain/nft/${deviceId}`),
    enabled: Boolean(deviceId),
    retry: false,
  });
}

export function useWalletAccess(deviceId: string | null) {
  return useQuery({
    queryKey: ['wallet-access', deviceId],
    queryFn: () =>
      apiClient.get<{ grants: { grantee_wallet: string; granted_at: string }[] }>(
        `/blockchain/access/${deviceId}`
      ),
    enabled: Boolean(deviceId),
  });
}

export function useGrantAccess(deviceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (granteeWallet: string) =>
      apiClient.post('/blockchain/access/grant', { deviceId, granteeWallet }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-access', deviceId] });
      toast.success('Wallet access granted');
    },
    onError: (error) => {
      toast.error('Failed to grant wallet access');
      Sentry.captureException(error);
    },
  });
}

export function useRevokeAccess(deviceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (granteeWallet: string) =>
      apiClient.post('/blockchain/access/revoke', { deviceId, granteeWallet }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-access', deviceId] });
      toast.success('Wallet access revoked');
    },
    onError: (error) => {
      toast.error('Failed to revoke wallet access');
      Sentry.captureException(error);
    },
  });
}
