"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLimiter = exports.readingsLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const common = {
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Too many requests', status: 429 } },
};
// Per-route-group limits as specified in the implementation plan.
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    ...common,
});
exports.readingsLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    ...common,
});
exports.defaultLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 60,
    ...common,
});
//# sourceMappingURL=rateLimit.js.map