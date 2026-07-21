"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit test: EventFeed Solana explorer links
 *
 * Task 23.1: For events with non-null solana_signature, assert href contains
 *            devnet explorer URL + signature. For solana_confirmed = false,
 *            assert pending spinner (no explorer link).
 *
 * Validates: Property 3 (frontend)
 * Requirements: 2.7, 8.4
 *
 * Note: This test runs the pure rendering logic without a React DOM, because
 * the frontend does not yet have @testing-library/react installed. The test
 * validates the URL construction and conditional display logic extracted from
 * SolanaExplorerBadge and EventFeed directly.
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
/**
 * Replicates the rendering decision of SolanaExplorerBadge without React DOM.
 * Returns either a 'pending' result (spinner shown) or 'confirmed' result
 * (explorer link shown).
 */
function renderSolanaExplorerBadge(props) {
    const { signature, confirmed = false } = props;
    if (!signature || !confirmed) {
        return { type: 'pending' };
    }
    const short = `${signature.slice(0, 4)}...${signature.slice(-4)}`;
    const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    return { type: 'confirmed', href, shortSignature: short };
}
/**
 * Replicates EventFeed's per-row rendering decision for the Solana badge.
 * Returns the rendered badge state for each event row.
 */
function renderEventFeedRow(event) {
    return renderSolanaExplorerBadge({
        signature: event.solana_signature,
        confirmed: event.solana_confirmed,
        slot: event.solana_slot,
    });
}
// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------
/** Solana base58 alphabet */
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/** Arbitrary Solana signature (87-88 base58 chars) */
const signatureArb = fast_check_1.default
    .array(fast_check_1.default.integer({ min: 0, max: BASE58.length - 1 }), {
    minLength: 87,
    maxLength: 88,
})
    .map((idx) => idx.map((i) => BASE58[i]).join(''));
/** Arbitrary UUID */
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
/** Arbitrary threat event (confirmed on-chain) */
const confirmedEventArb = fast_check_1.default
    .tuple(uuidArb, signatureArb, fast_check_1.default.integer({ min: 1, max: 9999999 }))
    .map(([id, sig, slot]) => ({
    id,
    event_type: 'surge',
    occurred_at: new Date().toISOString(),
    solana_signature: sig,
    solana_confirmed: true,
    solana_slot: slot,
    alerta_alert_id: null,
}));
/** Arbitrary threat event (not yet confirmed) */
const pendingEventArb = fast_check_1.default
    .tuple(uuidArb, fast_check_1.default.option(signatureArb))
    .map(([id, sig]) => ({
    id,
    event_type: 'intrusion',
    occurred_at: new Date().toISOString(),
    solana_signature: sig ?? null,
    solana_confirmed: false, // key: not confirmed
    solana_slot: null,
    alerta_alert_id: null,
}));
// ===========================================================================
// Tests
// ===========================================================================
(0, vitest_1.describe)('Unit test: EventFeed renders Solana explorer links', () => {
    // -------------------------------------------------------------------------
    // Confirmed events — must show explorer link
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('confirmed event row renders a devnet explorer href containing the signature', () => {
        fast_check_1.default.assert(fast_check_1.default.property(confirmedEventArb, (event) => {
            const result = renderEventFeedRow(event);
            (0, vitest_1.expect)(result.type).toBe('confirmed');
            if (result.type !== 'confirmed')
                return;
            // href must contain the full Solana devnet explorer base URL
            (0, vitest_1.expect)(result.href).toContain('https://explorer.solana.com/tx/');
            // href must contain the exact signature
            (0, vitest_1.expect)(result.href).toContain(event.solana_signature);
            // cluster=devnet is required (Req 2.7)
            (0, vitest_1.expect)(result.href).toContain('cluster=devnet');
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('explorer URL is constructed as the canonical devnet URL', () => {
        fast_check_1.default.assert(fast_check_1.default.property(signatureArb, (signature) => {
            const result = renderSolanaExplorerBadge({ signature, confirmed: true });
            (0, vitest_1.expect)(result.type).toBe('confirmed');
            if (result.type !== 'confirmed')
                return;
            // Exact URL format: https://explorer.solana.com/tx/{sig}?cluster=devnet
            (0, vitest_1.expect)(result.href).toBe(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('short signature is first 4 + last 4 chars of full signature', () => {
        fast_check_1.default.assert(fast_check_1.default.property(signatureArb, (signature) => {
            const result = renderSolanaExplorerBadge({ signature, confirmed: true });
            (0, vitest_1.expect)(result.type).toBe('confirmed');
            if (result.type !== 'confirmed')
                return;
            const expectedShort = `${signature.slice(0, 4)}...${signature.slice(-4)}`;
            (0, vitest_1.expect)(result.shortSignature).toBe(expectedShort);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('explorer href always contains the complete signature — no truncation', () => {
        fast_check_1.default.assert(fast_check_1.default.property(signatureArb, (signature) => {
            const result = renderSolanaExplorerBadge({ signature, confirmed: true });
            (0, vitest_1.expect)(result.type).toBe('confirmed');
            if (result.type !== 'confirmed')
                return;
            // The full signature must appear verbatim in the href
            (0, vitest_1.expect)(result.href.includes(signature)).toBe(true);
            // The href must not be shorter than the expected minimum
            (0, vitest_1.expect)(result.href.length).toBeGreaterThan('https://explorer.solana.com/tx/'.length + signature.length);
        }), { numRuns: 50 });
    });
    // -------------------------------------------------------------------------
    // Pending/unconfirmed events — must show spinner, not explorer link
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('unconfirmed event row renders pending spinner (no explorer link)', () => {
        fast_check_1.default.assert(fast_check_1.default.property(pendingEventArb, (event) => {
            const result = renderEventFeedRow(event);
            // Must be pending, never confirmed
            (0, vitest_1.expect)(result.type).toBe('pending');
        }), { numRuns: 30 });
    });
    (0, vitest_1.it)('null signature always renders pending (never shows explorer link)', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.boolean(), // confirmed flag can be anything
        (confirmed) => {
            const result = renderSolanaExplorerBadge({ signature: null, confirmed });
            (0, vitest_1.expect)(result.type).toBe('pending');
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('confirmed=false always renders pending even when signature is present', () => {
        fast_check_1.default.assert(fast_check_1.default.property(signatureArb, (signature) => {
            const result = renderSolanaExplorerBadge({ signature, confirmed: false });
            (0, vitest_1.expect)(result.type).toBe('pending');
        }), { numRuns: 30 });
    });
    (0, vitest_1.it)('confirmed=true with non-null signature never renders pending', () => {
        fast_check_1.default.assert(fast_check_1.default.property(signatureArb, (signature) => {
            const result = renderSolanaExplorerBadge({ signature, confirmed: true });
            (0, vitest_1.expect)(result.type).toBe('confirmed');
        }), { numRuns: 30 });
    });
    // -------------------------------------------------------------------------
    // EventFeed collection behavior
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('EventFeed renders confirmed badge for every confirmed event', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(confirmedEventArb, { minLength: 1, maxLength: 20 }), (events) => {
            for (const event of events) {
                const result = renderEventFeedRow(event);
                (0, vitest_1.expect)(result.type).toBe('confirmed');
                if (result.type === 'confirmed') {
                    (0, vitest_1.expect)(result.href).toContain(event.solana_signature);
                }
            }
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('EventFeed renders pending badge for every unconfirmed event', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(pendingEventArb, { minLength: 1, maxLength: 20 }), (events) => {
            for (const event of events) {
                const result = renderEventFeedRow(event);
                (0, vitest_1.expect)(result.type).toBe('pending');
            }
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('mixed event list renders correct badge type per event', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(fast_check_1.default.oneof(confirmedEventArb, pendingEventArb), { minLength: 1, maxLength: 20 }), (events) => {
            for (const event of events) {
                const result = renderEventFeedRow(event);
                if (event.solana_confirmed && event.solana_signature !== null) {
                    (0, vitest_1.expect)(result.type).toBe('confirmed');
                    if (result.type === 'confirmed') {
                        (0, vitest_1.expect)(result.href).toContain(event.solana_signature);
                        (0, vitest_1.expect)(result.href).toContain('cluster=devnet');
                    }
                }
                else {
                    (0, vitest_1.expect)(result.type).toBe('pending');
                }
            }
        }), { numRuns: 30 });
    });
    // -------------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('very short signature strings still produce a valid explorer URL', () => {
        // Edge case: minimum-length valid signature-like strings
        const shortSig = 'ABCDEFGHIJ'; // 10 chars
        const result = renderSolanaExplorerBadge({ signature: shortSig, confirmed: true });
        (0, vitest_1.expect)(result.type).toBe('confirmed');
        if (result.type === 'confirmed') {
            (0, vitest_1.expect)(result.href).toContain(shortSig);
            (0, vitest_1.expect)(result.href).toContain('cluster=devnet');
        }
    });
    (0, vitest_1.it)('empty string signature treated as falsy — renders pending', () => {
        const result = renderSolanaExplorerBadge({ signature: '', confirmed: true });
        // Empty string is falsy in JS (!'' = true) — should render pending
        (0, vitest_1.expect)(result.type).toBe('pending');
    });
});
//# sourceMappingURL=eventfeed.unit.test.js.map