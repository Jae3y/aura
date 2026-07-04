import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { config } from '../config';

const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);
const MAX_MEMO_BYTES = 566;

let connection: Connection | null = null;
let keypair: Keypair | null = null;

export interface ChainResult {
  signature: string;
  slot: number;
}

function loadKeypair(secret: string): Keypair {
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

export function initSolanaClient(): Connection {
  if (!connection) {
    connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');
    keypair = loadKeypair(config.SOLANA_KEYPAIR);
  }
  return connection;
}

function getClient(): { connection: Connection; keypair: Keypair } {
  initSolanaClient();
  return { connection: connection!, keypair: keypair! };
}

// Builds a JSON memo (≤566 bytes) and submits it via the Memo Program.
export async function writeEventToChain(event: {
  eventName: string;
  memo: Record<string, unknown>;
}): Promise<ChainResult> {
  const { connection: conn, keypair: kp } = getClient();

  let payload = JSON.stringify({ e: event.eventName, ...event.memo });
  if (Buffer.byteLength(payload, 'utf8') > MAX_MEMO_BYTES) {
    payload = payload.slice(0, MAX_MEMO_BYTES);
  }

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(payload, 'utf8'),
  });

  const tx = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(conn, tx, [kp], {
    commitment: 'confirmed',
  });

  const status = await conn.getSignatureStatus(signature);
  const slot = status.value?.slot ?? 0;
  return { signature, slot };
}

export async function confirmTransaction(sig: string): Promise<boolean> {
  const { connection: conn } = getClient();
  const status = await conn.getSignatureStatus(sig);
  return (
    status.value?.confirmationStatus === 'confirmed' ||
    status.value?.confirmationStatus === 'finalized'
  );
}

export function verifyWalletSignature(
  addr: string,
  sig: string,
  msg: string
): boolean {
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(msg),
      bs58.decode(sig),
      new PublicKey(addr).toBytes()
    );
  } catch {
    return false;
  }
}

export async function getTransactionDetails(sig: string) {
  const { connection: conn } = getClient();
  const tx = await conn.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return null;
  return {
    confirmed: true,
    slot: tx.slot,
    timestamp: tx.blockTime ? tx.blockTime * 1000 : null,
    explorerUrl: getExplorerUrl(sig),
  };
}

export function getExplorerUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function getWalletPublicKey(): string {
  const { keypair: kp } = getClient();
  return kp.publicKey.toBase58();
}

const AIRDROP_AMOUNT = 2 * 1_000_000_000;
const MIN_BALANCE = 0.1 * 1_000_000_000;

// Checks the wallet balance and requests a Devnet airdrop if below 0.1 SOL.
// Retries up to 3 times since the public faucet is sometimes rate-limited.
export async function tryAutoAirdrop(): Promise<void> {
  const { connection: conn, keypair: kp } = getClient();
  const pubkey = kp.publicKey.toBase58();
  let balance = await conn.getBalance(kp.publicKey);
  // eslint-disable-next-line no-console
  console.log(`Solana wallet ${pubkey} balance: ${(balance / 1_000_000_000).toFixed(4)} SOL`);

  if (balance >= MIN_BALANCE) {
    // eslint-disable-next-line no-console
    console.log('Balance sufficient — no airdrop needed');
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    // eslint-disable-next-line no-console
    console.log(`Attempting airdrop ${attempt}/3 — requesting ${AIRDROP_AMOUNT / 1_000_000_000} SOL...`);
    try {
      const sig = await conn.requestAirdrop(kp.publicKey, AIRDROP_AMOUNT);
      await conn.confirmTransaction(sig, 'confirmed');
      // eslint-disable-next-line no-console
      console.log(`Airdrop succeeded: ${sig}`);

      balance = await conn.getBalance(kp.publicKey);
      // eslint-disable-next-line no-console
      console.log(`New balance: ${(balance / 1_000_000_000).toFixed(4)} SOL`);
      return;
    } catch (airdropErr) {
      // eslint-disable-next-line no-console
      console.warn(`Airdrop attempt ${attempt}/3 failed:`, (airdropErr as Error).message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // eslint-disable-next-line no-console
  console.warn(
    `\n⚠️  Airdrop failed after 3 attempts.\n` +
    `   Fund this wallet manually at https://faucet.solana.com/ or using:\n` +
    `   solana airdrop 2 ${pubkey} --url ${config.SOLANA_RPC_URL}\n`
  );
}
