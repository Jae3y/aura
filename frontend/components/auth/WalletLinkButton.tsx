"use client";

import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { authAPI } from "@/lib/api/auth";
import { toast } from "@/lib/toast";

export function WalletLinkButton() {
  const { accessToken, profile, setProfile } = useAuthStore();
  const { publicKey, connect, disconnect, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkWallet = async () => {
    if (!accessToken) return;
    if (!connected) {
      await connect();
      return;
    }
    if (!publicKey) return;
    setIsLoading(true);
    try {
      const walletAddress = publicKey.toBase58();
      const updatedProfile = await authAPI.updateProfile(accessToken, { wallet_address: walletAddress });
      setProfile(updatedProfile);
      toast.success("Wallet linked successfully!");
    } catch (error) {
      toast.error("Failed to link wallet");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkWallet = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const updatedProfile = await authAPI.updateProfile(accessToken, { wallet_address: null });
      setProfile(updatedProfile);
      await disconnect();
      toast.success("Wallet unlinked successfully!");
    } catch (error) {
      toast.error("Failed to unlink wallet");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Wallet size={18} className="text-text-secondary" />
        <div>
          <div className="text-sm font-bold text-white">Linked Wallet</div>
          <div className="text-[10px] text-text-muted">
            {profile?.wallet_address ? (
              <>
                {profile.wallet_address.slice(0, 4)}…{profile.wallet_address.slice(-4)}
              </>
            ) : (
              "Connect Phantom wallet to use blockchain features"
            )}
          </div>
        </div>
      </div>
      {profile?.wallet_address ? (
        <button
          onClick={handleUnlinkWallet}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlink"}
        </button>
      ) : (
        <button
          onClick={handleLinkWallet}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link Wallet"}
        </button>
      )}
    </div>
  );
}
