"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const web3_js_1 = require("@solana/web3.js");
const zod_1 = require("zod");
const config_1 = require("../config");
const supabase_1 = require("../lib/supabase");
const profiles_1 = require("../lib/db/profiles");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(rateLimit_1.authLimiter);
const loginSchema = zod_1.z.object({
    walletAddress: zod_1.z.string().min(32),
    signature: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
});
const emailRegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    fullName: zod_1.z.string().optional(),
    environmentType: zod_1.z.enum(['home', 'hospital', 'industrial']).optional(),
});
const emailLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
function verifyWalletSignature(addr, sig, msg) {
    try {
        const pubkey = new web3_js_1.PublicKey(addr);
        return tweetnacl_1.default.sign.detached.verify(new TextEncoder().encode(msg), bs58_1.default.decode(sig), pubkey.toBytes());
    }
    catch {
        return false;
    }
}
// Deterministic Supabase credentials derived from the wallet address so a
// wallet maps to exactly one Supabase auth user.
function walletEmail(addr) {
    return `${addr.toLowerCase()}@wallet.aura`;
}
function walletPassword(addr) {
    return crypto_1.default
        .createHmac('sha256', config_1.config.JWT_SECRET)
        .update(addr)
        .digest('hex');
}
async function ensureUser(addr) {
    const email = walletEmail(addr);
    const password = walletPassword(addr);
    const { data, error } = await supabase_1.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (error && !/already/i.test(error.message))
        throw error;
    return data?.user?.id ?? '';
}
async function sessionFor(addr) {
    const { data, error } = await supabase_1.supabaseAnon.auth.signInWithPassword({
        email: walletEmail(addr),
        password: walletPassword(addr),
    });
    if (error || !data.session)
        throw new errorHandler_1.HttpError(401, 'Authentication failed');
    return data;
}
async function authenticate(addr, sig, msg) {
    if (!verifyWalletSignature(addr, sig, msg)) {
        throw new errorHandler_1.HttpError(401, 'Invalid wallet signature');
    }
    await ensureUser(addr);
    const data = await sessionFor(addr);
    await (0, profiles_1.upsertProfile)({
        id: data.user.id,
        email: walletEmail(addr),
        wallet_address: addr,
    });
    return data;
}
router.post('/register', async (req, res, next) => {
    try {
        const { walletAddress, signature, message } = loginSchema.parse(req.body);
        const data = await authenticate(walletAddress, signature, message);
        res.status(201).json({ session: data.session, user: data.user });
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        const { walletAddress, signature, message } = loginSchema.parse(req.body);
        const data = await authenticate(walletAddress, signature, message);
        res.json({ session: data.session, user: data.user });
    }
    catch (err) {
        next(err);
    }
});
router.post('/refresh', async (req, res, next) => {
    try {
        const refreshToken = zod_1.z.string().parse(req.body?.refresh_token);
        const { data, error } = await supabase_1.supabaseAnon.auth.refreshSession({
            refresh_token: refreshToken,
        });
        if (error || !data.session)
            throw new errorHandler_1.HttpError(401, 'Invalid refresh token');
        res.json({ session: data.session });
    }
    catch (err) {
        next(err);
    }
});
router.post('/logout', auth_1.authMiddleware, async (req, res, next) => {
    try {
        await supabase_1.supabaseAdmin.auth.admin.signOut(req.headers.authorization.slice('Bearer '.length));
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/fcm-token', auth_1.authMiddleware, async (req, res, next) => {
    try {
        const token = zod_1.z.string().min(1).parse(req.body?.fcm_token);
        await (0, profiles_1.updateFcmToken)(req.user.id, token);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/profile', auth_1.authMiddleware, async (req, res, next) => {
    try {
        const { full_name, avatar_url, environment_type, wallet_address, lisk_wallet_address, notification_email, notification_push, } = req.body;
        const updates = {};
        if (full_name !== undefined)
            updates.full_name = full_name;
        if (avatar_url !== undefined)
            updates.avatar_url = avatar_url;
        if (environment_type !== undefined)
            updates.environment_type = environment_type;
        if (wallet_address !== undefined)
            updates.wallet_address = wallet_address;
        if (lisk_wallet_address !== undefined)
            updates.lisk_wallet_address = lisk_wallet_address;
        if (notification_email !== undefined)
            updates.notification_email = notification_email;
        if (notification_push !== undefined)
            updates.notification_push = notification_push;
        const profile = await (0, profiles_1.upsertProfile)({
            id: req.user.id,
            ...updates,
        });
        res.json({ profile });
    }
    catch (err) {
        next(err);
    }
});
router.post('/email-register', async (req, res, next) => {
    try {
        const { email, password, fullName, environmentType } = emailRegisterSchema.parse(req.body);
        // Create the user in Supabase auth
        const { data: userData, error: createError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (createError) {
            throw new errorHandler_1.HttpError(400, createError.message);
        }
        const user = userData.user;
        if (!user) {
            throw new errorHandler_1.HttpError(500, 'Failed to create user in identity provider');
        }
        // Create profile
        const profile = await (0, profiles_1.upsertProfile)({
            id: user.id,
            email: email.toLowerCase(),
            full_name: fullName || null,
            environment_type: environmentType || 'home',
            wallet_address: null,
        });
        // Sign in to get session tokens
        const { data: sessionData, error: loginError } = await supabase_1.supabaseAnon.auth.signInWithPassword({
            email,
            password,
        });
        if (loginError || !sessionData.session) {
            throw new errorHandler_1.HttpError(401, 'Authentication failed after registration');
        }
        res.status(201).json({ session: sessionData.session, user: sessionData.user, profile });
    }
    catch (err) {
        next(err);
    }
});
router.post('/email-login', async (req, res, next) => {
    try {
        const { email, password } = emailLoginSchema.parse(req.body);
        const { data: sessionData, error: loginError } = await supabase_1.supabaseAnon.auth.signInWithPassword({
            email,
            password,
        });
        if (loginError || !sessionData.session) {
            throw new errorHandler_1.HttpError(401, 'Invalid email or password');
        }
        const profile = await (0, profiles_1.getProfileById)(sessionData.user.id);
        if (!profile) {
            throw new errorHandler_1.HttpError(404, 'User profile not found');
        }
        res.json({ session: sessionData.session, user: sessionData.user, profile });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map