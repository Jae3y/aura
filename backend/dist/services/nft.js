"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintDeviceNFT = mintDeviceNFT;
exports.getNFTMetadata = getNFTMetadata;
exports.getNFTExplorerUrl = getNFTExplorerUrl;
const umi_bundle_defaults_1 = require("@metaplex-foundation/umi-bundle-defaults");
const mpl_token_metadata_1 = require("@metaplex-foundation/mpl-token-metadata");
const umi_1 = require("@metaplex-foundation/umi");
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("../config");
let umi = null;
function loadSecret(secret) {
    const trimmed = secret.trim();
    if (trimmed.startsWith('['))
        return Uint8Array.from(JSON.parse(trimmed));
    return bs58_1.default.decode(trimmed);
}
function getUmi() {
    if (!umi) {
        umi = (0, umi_bundle_defaults_1.createUmi)(config_1.config.SOLANA_RPC_URL).use((0, mpl_token_metadata_1.mplTokenMetadata)());
        const kp = umi.eddsa.createKeypairFromSecretKey(loadSecret(config_1.config.SOLANA_KEYPAIR));
        umi.use((0, umi_1.keypairIdentity)(kp));
    }
    return umi;
}
// Mints a Solana devnet NFT as the device-identity certificate.
// `metadataUri` is an optional external URL for the JSON metadata.
// Using a URL (instead of an inline data URI) keeps the transaction
// within Solana's 1232-byte raw size limit.
async function mintDeviceNFT(device, ownerWallet, metadataUri) {
    const client = getUmi();
    const mint = (0, umi_1.generateSigner)(client);
    const { signature } = await (0, mpl_token_metadata_1.createNft)(client, {
        mint,
        name: `AURA-${device.name}`.slice(0, 32),
        symbol: 'AURA',
        uri: metadataUri ||
            `data:application/json,${encodeURIComponent(JSON.stringify({
                name: `AURA-${device.name}`.slice(0, 32),
                symbol: 'AURA',
                description: 'AURA device identity certificate',
                attributes: [
                    { trait_type: 'deviceId', value: device.id },
                    { trait_type: 'owner', value: ownerWallet },
                    { trait_type: 'environment_type', value: device.environment_type },
                    { trait_type: 'location_label', value: device.location_label ?? 'n/a' },
                    { trait_type: 'firmware_version', value: device.firmware_version },
                ],
            }))}`,
        sellerFeeBasisPoints: (0, umi_1.percentAmount)(0),
        isCollection: false,
    }).sendAndConfirm(client);
    return {
        mintAddress: mint.publicKey.toString(),
        signature,
    };
}
async function getNFTMetadata(mintAddress) {
    const client = getUmi();
    const asset = await (0, mpl_token_metadata_1.fetchDigitalAsset)(client, (0, umi_1.publicKey)(mintAddress));
    return {
        name: asset.metadata.name,
        symbol: asset.metadata.symbol,
        uri: asset.metadata.uri,
        mintAddress,
        explorerUrl: getNFTExplorerUrl(mintAddress),
    };
}
function getNFTExplorerUrl(mintAddress) {
    return `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`;
}
//# sourceMappingURL=nft.js.map