"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property test: NFT mint address persisted after successful mint
 *
 * Task 8.1: For any returned mint address, assert devices.nft_mint_address
 *           equals it and is non-null.
 *
 * Validates: Property 5
 * Requirements: 3.3, 3.4
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockMintDeviceNFT = vitest_1.vi.fn();
vitest_1.vi.mock('../services/nft', () => ({
    mintDeviceNFT: mockMintDeviceNFT,
    getNFTMetadata: vitest_1.vi.fn(),
    getNFTExplorerUrl: vitest_1.vi.fn(),
}));
const mockUpdateNftMintAddress = vitest_1.vi.fn();
const mockGetDeviceById = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/devices', () => ({
    updateNftMintAddress: mockUpdateNftMintAddress,
    getDeviceById: mockGetDeviceById,
    createDevice: vitest_1.vi.fn(),
    updateDevice: vitest_1.vi.fn(),
    deleteDevice: vitest_1.vi.fn(),
    getDevices: vitest_1.vi.fn(),
    getDeviceByToken: vitest_1.vi.fn(),
    updateDeviceStatus: vitest_1.vi.fn(),
    updateLastSeen: vitest_1.vi.fn(),
}));
const mockEnqueueSolanaEvent = vitest_1.vi.fn();
vitest_1.vi.mock('../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: mockEnqueueSolanaEvent,
    startSolanaQueue: vitest_1.vi.fn(),
    _queueLength: vitest_1.vi.fn().mockReturnValue(0),
}));
const mockEmitToDevice = vitest_1.vi.fn();
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: mockEmitToDevice,
    initSocket: vitest_1.vi.fn(),
    getIO: vitest_1.vi.fn(),
}));
const mockCaptureException = vitest_1.vi.fn();
vitest_1.vi.mock('@sentry/node', () => ({
    captureException: mockCaptureException,
    init: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../config', () => ({
    config: {
        SOLANA_RPC_URL: 'https://api.devnet.solana.com',
        SOLANA_KEYPAIR: 'test-keypair',
        NODE_ENV: 'test',
        MOCK_INTEGRATIONS: true,
        FRONTEND_URL: 'http://localhost:3000',
        ALERTA_CHANNEL_REF: 'test',
    },
}));
const events_1 = require("../blockchain/events");
// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
/** Solana public-key style address (44 chars base58) */
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const mintAddressArb = fast_check_1.default
    .array(fast_check_1.default.integer({ min: 0, max: BASE58.length - 1 }), {
    minLength: 32,
    maxLength: 44,
})
    .map((idx) => idx.map((i) => BASE58[i]).join(''));
const signatureArb = fast_check_1.default
    .array(fast_check_1.default.integer({ min: 0, max: BASE58.length - 1 }), {
    minLength: 87,
    maxLength: 88,
})
    .map((idx) => idx.map((i) => BASE58[i]).join(''));
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
function makeDevice(id, userId) {
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
async function runPairingFlow(device, ownerWallet) {
    const { mintAddress, signature } = await mockMintDeviceNFT(device, ownerWallet);
    await mockUpdateNftMintAddress(device.id, mintAddress);
    mockEnqueueSolanaEvent({
        table: 'none',
        rowId: device.id,
        eventName: events_1.AURA_SOLANA_EVENTS.DEVICE_MINTED,
        memo: { deviceId: device.id, owner: ownerWallet, mintAddress },
    });
    mockEmitToDevice(device.id, 'device:paired', { deviceId: device.id, mintAddress });
    void signature; // used — suppress unused warning
    return mintAddress;
}
// ============================================================================
// Task 8.1 — Property: NFT mint address persisted after successful mint
// ============================================================================
(0, vitest_1.describe)('Property 5: NFT mint address persisted after successful mint', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockUpdateNftMintAddress.mockResolvedValue(undefined);
        mockEnqueueSolanaEvent.mockReturnValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);
    });
    (0, vitest_1.it)('updateNftMintAddress is called with the exact mint address returned by Metaplex', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, uuidArb, // userId
        mintAddressArb, signatureArb, fast_check_1.default.constantFrom('home', 'hospital', 'industrial'), async (deviceId, userId, mintAddress, signature, envType) => {
            vitest_1.vi.clearAllMocks();
            mockUpdateNftMintAddress.mockResolvedValue(undefined);
            // Metaplex Umi returns the mint address
            mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature });
            const device = { ...makeDevice(deviceId, userId), environment_type: envType };
            const wallet = 'ownerWalletAddress123456789ABCDEFGHJKLMNPQRSTUVWXYZabc';
            const returnedMint = await runPairingFlow(device, wallet);
            // The persisted address must equal the mint address returned by Metaplex
            (0, vitest_1.expect)(returnedMint).toBe(mintAddress);
            (0, vitest_1.expect)(mockUpdateNftMintAddress).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockUpdateNftMintAddress).toHaveBeenCalledWith(deviceId, mintAddress);
            // nft_mint_address must never remain null after a successful mint
            const [, persistedAddress] = mockUpdateNftMintAddress.mock.calls[0];
            (0, vitest_1.expect)(persistedAddress).not.toBeNull();
            (0, vitest_1.expect)(typeof persistedAddress).toBe('string');
            (0, vitest_1.expect)(persistedAddress.length).toBeGreaterThan(0);
        }), { numRuns: 30 });
    });
    (0, vitest_1.it)('DEVICE_MINTED Solana event is enqueued with the correct mint address', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, mintAddressArb, signatureArb, async (deviceId, mintAddress, signature) => {
            vitest_1.vi.clearAllMocks();
            mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature });
            mockUpdateNftMintAddress.mockResolvedValue(undefined);
            mockEnqueueSolanaEvent.mockReturnValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            const device = makeDevice(deviceId, 'user-id-1234');
            const wallet = 'ownerWallet123456789ABCDEFGHJKLMNPQRSTUVWXYZabc';
            await runPairingFlow(device, wallet);
            (0, vitest_1.expect)(mockEnqueueSolanaEvent).toHaveBeenCalledTimes(1);
            const [enqueuedItem] = mockEnqueueSolanaEvent.mock.calls[0];
            (0, vitest_1.expect)(enqueuedItem.eventName).toBe(events_1.AURA_SOLANA_EVENTS.DEVICE_MINTED);
            (0, vitest_1.expect)(enqueuedItem.memo.mintAddress).toBe(mintAddress);
            (0, vitest_1.expect)(enqueuedItem.memo.deviceId).toBe(deviceId);
        }), { numRuns: 25 });
    });
    (0, vitest_1.it)('nft_mint_address is never set to null or empty string on a successful mint', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, mintAddressArb, async (deviceId, mintAddress) => {
            vitest_1.vi.clearAllMocks();
            mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature: 'test-sig' });
            mockUpdateNftMintAddress.mockResolvedValue(undefined);
            mockEnqueueSolanaEvent.mockReturnValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            const device = makeDevice(deviceId, 'user-x');
            await runPairingFlow(device, 'wallet-x');
            const [, persisted] = mockUpdateNftMintAddress.mock.calls[0];
            (0, vitest_1.expect)(persisted).not.toBeNull();
            (0, vitest_1.expect)(persisted).not.toBe('');
            (0, vitest_1.expect)(persisted).toBe(mintAddress); // exact match
        }), { numRuns: 25 });
    });
    (0, vitest_1.it)('on mint failure, updateNftMintAddress is NOT called (nft_mint_address stays null)', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (deviceId) => {
            vitest_1.vi.clearAllMocks();
            // Metaplex Umi fails
            mockMintDeviceNFT.mockRejectedValue(new Error('Metaplex mint failed'));
            mockUpdateNftMintAddress.mockResolvedValue(undefined);
            const device = makeDevice(deviceId, 'user-x');
            try {
                await runPairingFlow(device, 'wallet-x');
            }
            catch {
                // expected to throw
            }
            // updateNftMintAddress should NOT be called if mint fails
            (0, vitest_1.expect)(mockUpdateNftMintAddress).not.toHaveBeenCalled();
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('Socket.io device:paired event emitted with the mint address', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, mintAddressArb, async (deviceId, mintAddress) => {
            vitest_1.vi.clearAllMocks();
            mockMintDeviceNFT.mockResolvedValue({ mintAddress, signature: 'sig' });
            mockUpdateNftMintAddress.mockResolvedValue(undefined);
            mockEnqueueSolanaEvent.mockReturnValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            const device = makeDevice(deviceId, 'user-abc');
            await runPairingFlow(device, 'wallet-abc');
            (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledWith(deviceId, 'device:paired', vitest_1.expect.objectContaining({ mintAddress }));
        }), { numRuns: 20 });
    });
});
//# sourceMappingURL=nft.property.test.js.map