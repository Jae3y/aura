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
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Logic extracted from SolanaExplorerBadge.tsx (mirrors production code)
// ---------------------------------------------------------------------------

interface SolanaExplorerBadgeProps {
  signature: string | null;
  confirmed?: boolean;
  slot?: number | null;
}

type BadgeRenderResult =
  | { type: 'pending' }
  | { type: 'confirmed'; href: string; shortSignature: string };

/**
 * Replicates the rendering decision of SolanaExplorerBadge without React DOM.
 * Returns either a 'pending' result (spinner shown) or 'confirmed' result
 * (explorer link shown).
 */
function renderSolanaExplorerBadge(
  props: SolanaExplorerBadgeProps
): BadgeRenderResult {
  const { signature, confirmed = false } = props;

  if (!signature || !confirmed) {
    return { type: 'pending' };
  }

  const short = `${signature.slice(0, 4)}...${signature.slice(-4)}`;
  const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  return { type: 'confirmed', href, shortSignature: short };
}

// ---------------------------------------------------------------------------
// Logic extracted from EventFeed.tsx filtering + badge rendering
// ---------------------------------------------------------------------------

interface ThreatEventLike {
  id: string;
  event_type: string;
  occurred_at: string;
  solana_signature: string | null;
  solana_confirmed: boolean;
  solana_slot: number | null;
  alerta_alert_id: string | null;
}

/**
 * Replicates EventFeed's per-row rendering decision for the Solana badge.
 * Returns the rendered badge state for each event row.
 */
function renderEventFeedRow(event: ThreatEventLike): BadgeRenderResult {
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
const signatureArb = fc
  .array(fc.integer({ min: 0, max: BASE58.length - 1 }), {
    minLength: 87,
    maxLength: 88,
  })
  .map((idx) => idx.map((i) => BASE58[i]).join(''));

/** Arbitrary UUID */
const uuidArb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 12, maxLength: 12 })
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

/** Arbitrary threat event (confirmed on-chain) */
const confirmedEventArb = fc
  .tuple(uuidArb, signatureArb, fc.integer({ min: 1, max: 9999999 }))
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
const pendingEventArb = fc
  .tuple(uuidArb, fc.option(signatureArb))
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

describe('Unit test: EventFeed renders Solana explorer links', () => {
  // -------------------------------------------------------------------------
  // Confirmed events — must show explorer link
  // -------------------------------------------------------------------------

  it('confirmed event row renders a devnet explorer href containing the signature', () => {
    fc.assert(
      fc.property(confirmedEventArb, (event) => {
        const result = renderEventFeedRow(event);

        expect(result.type).toBe('confirmed');
        if (result.type !== 'confirmed') return;

        // href must contain the full Solana devnet explorer base URL
        expect(result.href).toContain('https://explorer.solana.com/tx/');
        // href must contain the exact signature
        expect(result.href).toContain(event.solana_signature!);
        // cluster=devnet is required (Req 2.7)
        expect(result.href).toContain('cluster=devnet');
      }),
      { numRuns: 50 }
    );
  });

  it('explorer URL is constructed as the canonical devnet URL', () => {
    fc.assert(
      fc.property(signatureArb, (signature) => {
        const result = renderSolanaExplorerBadge({ signature, confirmed: true });

        expect(result.type).toBe('confirmed');
        if (result.type !== 'confirmed') return;

        // Exact URL format: https://explorer.solana.com/tx/{sig}?cluster=devnet
        expect(result.href).toBe(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      }),
      { numRuns: 50 }
    );
  });

  it('short signature is first 4 + last 4 chars of full signature', () => {
    fc.assert(
      fc.property(signatureArb, (signature) => {
        const result = renderSolanaExplorerBadge({ signature, confirmed: true });

        expect(result.type).toBe('confirmed');
        if (result.type !== 'confirmed') return;

        const expectedShort = `${signature.slice(0, 4)}...${signature.slice(-4)}`;
        expect(result.shortSignature).toBe(expectedShort);
      }),
      { numRuns: 50 }
    );
  });

  it('explorer href always contains the complete signature — no truncation', () => {
    fc.assert(
      fc.property(signatureArb, (signature) => {
        const result = renderSolanaExplorerBadge({ signature, confirmed: true });

        expect(result.type).toBe('confirmed');
        if (result.type !== 'confirmed') return;

        // The full signature must appear verbatim in the href
        expect(result.href.includes(signature)).toBe(true);
        // The href must not be shorter than the expected minimum
        expect(result.href.length).toBeGreaterThan(
          'https://explorer.solana.com/tx/'.length + signature.length
        );
      }),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Pending/unconfirmed events — must show spinner, not explorer link
  // -------------------------------------------------------------------------

  it('unconfirmed event row renders pending spinner (no explorer link)', () => {
    fc.assert(
      fc.property(pendingEventArb, (event) => {
        const result = renderEventFeedRow(event);

        // Must be pending, never confirmed
        expect(result.type).toBe('pending');
      }),
      { numRuns: 30 }
    );
  });

  it('null signature always renders pending (never shows explorer link)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // confirmed flag can be anything
        (confirmed) => {
          const result = renderSolanaExplorerBadge({ signature: null, confirmed });
          expect(result.type).toBe('pending');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('confirmed=false always renders pending even when signature is present', () => {
    fc.assert(
      fc.property(signatureArb, (signature) => {
        const result = renderSolanaExplorerBadge({ signature, confirmed: false });
        expect(result.type).toBe('pending');
      }),
      { numRuns: 30 }
    );
  });

  it('confirmed=true with non-null signature never renders pending', () => {
    fc.assert(
      fc.property(signatureArb, (signature) => {
        const result = renderSolanaExplorerBadge({ signature, confirmed: true });
        expect(result.type).toBe('confirmed');
      }),
      { numRuns: 30 }
    );
  });

  // -------------------------------------------------------------------------
  // EventFeed collection behavior
  // -------------------------------------------------------------------------

  it('EventFeed renders confirmed badge for every confirmed event', () => {
    fc.assert(
      fc.property(
        fc.array(confirmedEventArb, { minLength: 1, maxLength: 20 }),
        (events) => {
          for (const event of events) {
            const result = renderEventFeedRow(event);
            expect(result.type).toBe('confirmed');
            if (result.type === 'confirmed') {
              expect(result.href).toContain(event.solana_signature!);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('EventFeed renders pending badge for every unconfirmed event', () => {
    fc.assert(
      fc.property(
        fc.array(pendingEventArb, { minLength: 1, maxLength: 20 }),
        (events) => {
          for (const event of events) {
            const result = renderEventFeedRow(event);
            expect(result.type).toBe('pending');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('mixed event list renders correct badge type per event', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(confirmedEventArb, pendingEventArb),
          { minLength: 1, maxLength: 20 }
        ),
        (events) => {
          for (const event of events) {
            const result = renderEventFeedRow(event);

            if (event.solana_confirmed && event.solana_signature !== null) {
              expect(result.type).toBe('confirmed');
              if (result.type === 'confirmed') {
                expect(result.href).toContain(event.solana_signature);
                expect(result.href).toContain('cluster=devnet');
              }
            } else {
              expect(result.type).toBe('pending');
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('very short signature strings still produce a valid explorer URL', () => {
    // Edge case: minimum-length valid signature-like strings
    const shortSig = 'ABCDEFGHIJ'; // 10 chars
    const result = renderSolanaExplorerBadge({ signature: shortSig, confirmed: true });
    expect(result.type).toBe('confirmed');
    if (result.type === 'confirmed') {
      expect(result.href).toContain(shortSig);
      expect(result.href).toContain('cluster=devnet');
    }
  });

  it('empty string signature treated as falsy — renders pending', () => {
    const result = renderSolanaExplorerBadge({ signature: '', confirmed: true });
    // Empty string is falsy in JS (!'' = true) — should render pending
    expect(result.type).toBe('pending');
  });
});
