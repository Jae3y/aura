"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const Sentry = __importStar(require("@sentry/node"));
const supabase_1 = require("../lib/supabase");
const profiles_1 = require("../lib/db/profiles");
function extractToken(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
        return null;
    return header.slice('Bearer '.length).trim() || null;
}
// Verifies the Supabase-issued JWT, loads the profile row, attaches req.user,
// and sets the Sentry user context. Any failure returns a structured 401 with
// no JWT internals leaked.
async function authMiddleware(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
            return;
        }
        const { data, error } = await supabase_1.supabaseAnon.auth.getUser(token);
        if (error || !data?.user) {
            res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
            return;
        }
        const profile = await (0, profiles_1.getProfileById)(data.user.id);
        if (!profile) {
            res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
            return;
        }
        req.user = {
            id: profile.id,
            walletAddress: profile.wallet_address,
            email: profile.email,
        };
        Sentry.setUser({
            id: profile.id,
            username: profile.wallet_address ?? undefined,
        });
        next();
    }
    catch {
        res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
    }
}
//# sourceMappingURL=auth.js.map