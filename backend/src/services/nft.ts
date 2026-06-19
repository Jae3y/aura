import {
  createUmi,
} from '@metaplex-foundation/umi-bundle-defaults';
import {
  createNft,
  mplTokenMetadata,
  fetchDigitalAsset,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as umiPublicKey,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import { config } from '../config';
import type { Device } from '../types/database';

let umi: ReturnType<typeof createUmi> | null = null;

function loadSecret(secret: string): Uint8Array {
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) return Uint8Array.from(JSON.parse(trimmed));
  return bs58.decode(trimmed);
}

function getUmi() {
  if (!umi) {
    umi = createUmi(config.SOLANA_RPC_URL).use(mplTokenMetadata());
    const kp = umi.eddsa.createKeypairFromSecretKey(
      loadSecret(config.SOLANA_KEYPAIR)
    );
    umi.use(keypairIdentity(kp));
  }
  return umi;
}

export interface MintResult {
  mintAddress: string;
  signature: string;
}

// Mints a Solana devnet NFT as the device-identity certificate.
export async function mintDeviceNFT(
  device: Device,
  ownerWallet: string
): Promise<MintResult> {
  const client = getUmi();
  const mint = generateSigner(client);

  const attributes = [
    { trait_type: 'deviceId', value: device.id },
    { trait_type: 'owner', value: ownerWallet },
    { trait_type: 'environment_type', value: device.environment_type },
    { trait_type: 'location_label', value: device.location_label ?? 'n/a' },
    { trait_type: 'deployDate', value: new Date().toISOString() },
    { trait_type: 'firmware_version', value: device.firmware_version },
  ];

  const metadata = {
    name: `AURA Unit - ${device.name}`,
    symbol: 'AURA',
    description: 'AURA device identity certificate',
    attributes,
  };

  const result = await createNft(client, {
    mint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: false,
  }).sendAndConfirm(client);

  return {
    mintAddress: mint.publicKey.toString(),
    signature: bs58.encode(result.signature),
  };
}

export async function getNFTMetadata(mintAddress: string) {
  const client = getUmi();
  const asset = await fetchDigitalAsset(
    client,
    umiPublicKey(mintAddress)
  );
  return {
    name: asset.metadata.name,
    symbol: asset.metadata.symbol,
    uri: asset.metadata.uri,
    mintAddress,
    explorerUrl: getNFTExplorerUrl(mintAddress),
  };
}

export function getNFTExplorerUrl(mintAddress: string): string {
  return `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`;
}
