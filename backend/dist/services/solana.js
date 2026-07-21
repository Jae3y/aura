"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSolanaClient = initSolanaClient;
exports.writeEventToChain = writeEventToChain;
exports.confirmTransaction = confirmTransaction;
exports.verifyWalletSignature = verifyWalletSignature;
exports.getTransactionDetails = getTransactionDetails;
exports.getExplorerUrl = getExplorerUrl;
exports.getWalletPublicKey = getWalletPublicKey;
exports.tryAutoAirdrop = tryAutoAirdrop;
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("../config");
const MEMO_PROGRAM_ID = new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const MAX_MEMO_BYTES = 566;
let connection = null;
let keypair = null;
function loadKeypair(secret) {
    const trimmed = secret.trim();
    if (trimmed.startsWith('[')) {
        return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
    }
    return web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(trimmed));
}
function initSolanaClient() {
    if (!connection) {
        connection = new web3_js_1.Connection(config_1.config.SOLANA_RPC_URL, 'confirmed');
        keypair = loadKeypair(config_1.config.SOLANA_KEYPAIR);
    }
    return connection;
}
function getClient() {
    initSolanaClient();
    return { connection: connection, keypair: keypair };
}
// Builds a JSON memo (≤566 bytes) and submits it via the Memo Program.
async function writeEventToChain(event) {
    const { connection: conn, keypair: kp } = getClient();
    let payload = JSON.stringify({ e: event.eventName, ...event.memo });
    if (Buffer.byteLength(payload, 'utf8') > MAX_MEMO_BYTES) {
        payload = payload.slice(0, MAX_MEMO_BYTES);
    }
    const instruction = new web3_js_1.TransactionInstruction({
        keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(payload, 'utf8'),
    });
    const tx = new web3_js_1.Transaction().add(instruction);
    const signature = await (0, web3_js_1.sendAndConfirmTransaction)(conn, tx, [kp], {
        commitment: 'confirmed',
    });
    const status = await conn.getSignatureStatus(signature);
    const slot = status.value?.slot ?? 0;
    return { signature, slot };
}
async function confirmTransaction(sig) {
    const { connection: conn } = getClient();
    const status = await conn.getSignatureStatus(sig);
    return (status.value?.confirmationStatus === 'confirmed' ||
        status.value?.confirmationStatus === 'finalized');
}
function verifyWalletSignature(addr, sig, msg) {
    try {
        return tweetnacl_1.default.sign.detached.verify(new TextEncoder().encode(msg), bs58_1.default.decode(sig), new web3_js_1.PublicKey(addr).toBytes());
    }
    catch {
        return false;
    }
}
async function getTransactionDetails(sig) {
    const { connection: conn } = getClient();
    const tx = await conn.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
    });
    if (!tx)
        return null;
    return {
        confirmed: true,
        slot: tx.slot,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : null,
        explorerUrl: getExplorerUrl(sig),
    };
}
function getExplorerUrl(sig) {
    return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
function getWalletPublicKey() {
    const { keypair: kp } = getClient();
    return kp.publicKey.toBase58();
}
const AIRDROP_AMOUNT = 2 * 1_000_000_000;
const MIN_BALANCE = 0.1 * 1_000_000_000;
// Checks the wallet balance and requests a Devnet airdrop if below 0.1 SOL.
// Retries up to 3 times since the public faucet is sometimes rate-limited.
async function tryAutoAirdrop() {
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
        }
        catch (airdropErr) {
            // eslint-disable-next-line no-console
            console.warn(`Airdrop attempt ${attempt}/3 failed:`, airdropErr.message);
            if (attempt < 3)
                await new Promise((r) => setTimeout(r, 2000));
        }
    }
    // eslint-disable-next-line no-console
    console.warn(`\n⚠️  Airdrop failed after 3 attempts.\n` +
        `   Fund this wallet manually at https://faucet.solana.com/ or using:\n` +
        `   solana airdrop 2 ${pubkey} --url ${config_1.config.SOLANA_RPC_URL}\n`);
}
//# sourceMappingURL=solana.js.map