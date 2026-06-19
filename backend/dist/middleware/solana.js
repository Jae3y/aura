"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSolanaAuth = requireSolanaAuth;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const web3_js_1 = require("@solana/web3.js");
// Verifies an Ed25519 wallet signature supplied via headers. Used to gate
// on-chain access grant/revoke endpoints with proof of wallet ownership.
//   X-Wallet-Address   — base58 Solana public key
//   X-Wallet-Signature — base58 signature of X-Wallet-Message
//   X-Wallet-Message   — the signed challenge string
function requireSolanaAuth(req, res, next) {
    try {
        const address = req.header('X-Wallet-Address');
        const signature = req.header('X-Wallet-Signature');
        const message = req.header('X-Wallet-Message');
        if (!address || !signature || !message) {
            res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
            return;
        }
        const pubkey = new web3_js_1.PublicKey(address);
        const ok = tweetnacl_1.default.sign.detached.verify(new TextEncoder().encode(message), bs58_1.default.decode(signature), pubkey.toBytes());
        if (!ok) {
            res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
            return;
        }
        req.wallet = { address };
        next();
    }
    catch {
        res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
    }
}
//# sourceMappingURL=solana.js.map