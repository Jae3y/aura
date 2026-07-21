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
exports.HttpError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const Sentry = __importStar(require("@sentry/node"));
class HttpError extends Error {
    status;
    code;
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
// Structured JSON error responses. Any 5xx is captured by Sentry with the
// request context already attached by the auth middleware (Sentry.setUser).
function errorHandler(err, req, res, _next) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    const code = err instanceof HttpError && err.code ? err.code : undefined;
    if (status >= 500) {
        Sentry.captureException(err, {
            extra: { path: req.path, method: req.method },
        });
        // eslint-disable-next-line no-console
        console.error(`[${req.method} ${req.path}]`, err);
    }
    res.status(status).json({
        error: {
            message,
            code,
            status,
        },
    });
}
function notFoundHandler(req, res) {
    res.status(404).json({
        error: { message: 'Not Found', status: 404 },
    });
}
//# sourceMappingURL=errorHandler.js.map