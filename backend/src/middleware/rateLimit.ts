import rateLimit from 'express-rate-limit';

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests', status: 429 } },
};

// Per-route-group limits as specified in the implementation plan.
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  ...common,
});

export const readingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  ...common,
});

export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  ...common,
});
