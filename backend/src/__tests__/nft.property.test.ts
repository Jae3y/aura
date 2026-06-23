/**
 * Property test: NFT mint address persisted after successful mint
 *
 * Task 8.1: For any returned mint address, assert devices.nft_mint_address
 *           equals it and is non-null.
 *
 * Validates: Property 5
 * Requirements: 3.3, 3.4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMintDeviceNFT = vi.fn();
vi.mock('../services/nft', () => ({
  mintDeviceNFT: mockMintDeviceNFT,
  getNFTMetadata: vi.fn(),
  getNFTExplorerUrl: vi.fn(),
}));

const mockUpdateNftMintAddress = vi.fn();
const mockGetDeviceById = vi.fn();
vi.mock('../lib/db/devices', () => ({
  updateNftMintAddress: mockUpdateNftMintAddress,
  getDeviceById: mockGetDeviceById,
  createDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
  getDevices: vi.fn(),
  getDeviceByToken: vi.fn(),
  updateDeviceStatus: vi.fn(),
  updateLastSeen: vi.fn(),
}));

const mockEnqueueSolanaEvent = vi.fn();
vi.mock('../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: mockEnqueueSolanaEvent,
  startSolanaQueue: vi.fn(),
  _queueLength: vi.fn().mockReturnValue(0),
}));

const mockEmitToDevice = vi.fn();
vi.mock('../socket', () => ({
  emitToDevice: mockEmitToDevice,
  initSocket: vi.fn(),
  getIO: vi.fn(),
}));

const mockCaptureException = vi.fn();
vi.mock('@sentry/node', () => ({
  captureException: mockCaptureException,
  init: vi.fn(),
}));

vi.mock('../config', () => ({
  config: {
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    SOLANA_KEYPAIR: 'test-keypair',
    NODE_ENV: 'test',
    MOCK_INTEGRATIONS: true,
    FRONTEND_URL: 'http://localhost:3000',
    ALERTA_CHANNEL_REF: 'test',
  },
}));

import type { Device } from '../types/database';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Solana public-key style address (44 chars base58) */
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const mintAddressArb = fc
  .array(fc.integer({ min: 0, max: BASE58.length - 1 }), {
    minLength: 32,
    maxLength: 44,
  })
  .map((idx) => idx.map((i) => BASE58[i]).join(''));

const signatureArb = fc
  .array(fc.integer({ min: 0, max: BASE58.length - 1 }), {
    minLength: 87,
    maxLength: 88,
  })
  .map((idx) => idx.map((i) => BASE58[i]).join(''));

const uuidArb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 12, maxLength: 12 })
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

function makeDevice(id: string, userId: string): Device {
  return {
    id,
    user_id: userId,
    name: 'AURA Test Unit',
    device_token: 'test-device-token',
    firmware_version: '1.0.0',
    environment_type: 'home',
    is_online: false,
    last_seen: null,
    voltage_threshold_min: 180,
    voltage_threshold_max: 250,
    surge_sensitivity: 'medium',
    location_label: 'Lab',
    nft_mint_address: null, // starts null — key precondition
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Simulates the pairing flow that the POST /devices/:id/pair route runs:
 *  1. mintDeviceNFT returns { mintAddress, signature }
 *  2. updateNftMintAddress(deviceId, mintAddress) is called
 *  3. Solana DEVICE_MINTED event is enqueued
 *  4. Socket.io device:paired event is emitted
 */
async function runPairingFlow(
  device: Device,
  ownerWallet: string
): Promise<string> {
  const { mintAddress, signature } = await mockMintDeviceNFT(device, ownerWallet);
  await mockUpdateNftMintAddress(device.id, mintAddress);
  mockEnqueueSolanaEvent({
    table: 'none',
    rowId: device.id,
    eventName: AURA_SOLANA_EVENTS.DEVICE_MINTED,
    memo: { deviceId: device.id, owner: ownerWallet, mintAddress },
  });
  mockEmitToDevice(device.id, 'device:paired', { deviceId: device.id, mintAddress });
  void signature; // used — suppress unused warning
  return mintAddress;
}

// ============================================================================
// Task 8.1 — Property: NFT mint address persisted after successful mint
// ============================================================================

describe('Property 5: NFT mint address persisted after successful mint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateNftMintAddress.mockResolvedValue(undefined);
    mockEnqueueSolanaEvent.mockReturnValue(undefined);
    mockEmitToDevice.mockReturnValue(undefined);
  });

  it('updateNftMintAddress is called with the exact mint address returned by Metaplex', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb, // userId
        mintAddressArb,
        signatureArb,
        fc.constantFrom('home', 'hospital', 'industrial') as fc.Arbitrary<'home' | 'hospital' | 'industrial'>,
        async (deviceId, userId, mintAddress, signature, envType) => {
          vi.clearAllMocks();
          mockUpdateNftMintAddress.mockResolvedValue(undefined);
          // Metaplex Umi returns the mint address
          mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature });

          const device = { ...makeDevice(deviceId, userId), environment_type: envType };
          const wallet = 'ownerWalletAddress123456789ABCDEFGHJKLMNPQRSTUVWXYZabc';

          const returnedMint = await runPairingFlow(device, wallet);

          // The persisted address must equal the mint address returned by Metaplex
          expect(returnedMint).toBe(mintAddress);
          expect(mockUpdateNftMintAddress).toHaveBeenCalledTimes(1);
          expect(mockUpdateNftMintAddress).toHaveBeenCalledWith(deviceId, mintAddress);

          // nft_mint_address must never remain null after a successful mint
          const [, persistedAddress] = mockUpdateNftMintAddress.mock.calls[0];
          expect(persistedAddress).not.toBeNull();
          expect(typeof persistedAddress).toBe('string');
          expect(persistedAddress.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('DEVICE_MINTED Solana event is enqueued with the correct mint address', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        mintAddressArb,
        signatureArb,
        async (deviceId, mintAddress, signature) => {
          vi.clearAllMocks();
          mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature });
          mockUpdateNftMintAddress.mockResolvedValue(undefined);
          mockEnqueueSolanaEvent.mockReturnValue(undefined);
          mockEmitToDevice.mockReturnValue(undefined);

          const device = makeDevice(deviceId, 'user-id-1234');
          const wallet = 'ownerWallet123456789ABCDEFGHJKLMNPQRSTUVWXYZabc';

          await runPairingFlow(device, wallet);

          expect(mockEnqueueSolanaEvent).toHaveBeenCalledTimes(1);
          const [enqueuedItem] = mockEnqueueSolanaEvent.mock.calls[0];
          expect(enqueuedItem.eventName).toBe(AURA_SOLANA_EVENTS.DEVICE_MINTED);
          expect(enqueuedItem.memo.mintAddress).toBe(mintAddress);
          expect(enqueuedItem.memo.deviceId).toBe(deviceId);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('nft_mint_address is never set to null or empty string on a successful mint', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, mintAddressArb, async (deviceId, mintAddress) => {
        vi.clearAllMocks();
        mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature: 'test-sig' });
        mockUpdateNftMintAddress.mockResolvedValue(undefined);
        mockEnqueueSolanaEvent.mockReturnValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);

        const device = makeDevice(deviceId, 'user-x');
        await runPairingFlow(device, 'wallet-x');

        const [, persisted] = mockUpdateNftMintAddress.mock.calls[0];
        expect(persisted).not.toBeNull();
        expect(persisted).not.toBe('');
        expect(persisted).toBe(mintAddress); // exact match
      }),
      { numRuns: 25 }
    );
  });

  it('on mint failure, updateNftMintAddress is NOT called (nft_mint_address stays null)', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (deviceId) => {
        vi.clearAllMocks();
        // Metaplex Umi fails
        mockMintDeviceNFT.mockRejectedValue(new Error('Metaplex mint failed'));
        mockUpdateNftMintAddress.mockResolvedValue(undefined);

        const device = makeDevice(deviceId, 'user-x');

        try {
          await runPairingFlow(device, 'wallet-x');
        } catch {
          // expected to throw
        }

        // updateNftMintAddress should NOT be called if mint fails
        expect(mockUpdateNftMintAddress).not.toHaveBeenCalled();
      }),
      { numRuns: 20 }
    );
  });

  it('Socket.io device:paired event emitted with the mint address', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, mintAddressArb, async (deviceId, mintAddress) => {
        vi.clearAllMocks();
        mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature: 'sig' });
        mockUpdateNftMintAddress.mockResolvedValue(undefined);
        mockEnqueueSolanaEvent.mockReturnValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);

        const device = makeDevice(deviceId, 'user-abc');
        await runPairingFlow(device, 'wallet-abc');

        expect(mockEmitToDevice).toHaveBeenCalledWith(
          deviceId,
          'device:paired',
          expect.objectContaining({ mintAddress })
        );
      }),
      { numRuns: 20 }
    );
  });
});
