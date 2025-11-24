import { getEnv } from '../../lib/config.js';

const DEFAULT_CHECKOUT_BASE = 'https://billing.voxrip.test/checkout';
const SESSION_STORE = new Map();

function generateSessionId() {
  return `sess_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createMockCheckoutSession(options = {}) {
  const planKey = options.planKey || 'basic';
  const customerEmail = options.customerEmail || null;
  const mode = options.mode || 'subscription';
  const returnUrl = options.returnUrl || window?.location?.href || 'http://localhost:5173/';
  const checkoutBase = getEnv('VITE_BILLING_CHECKOUT_URL', DEFAULT_CHECKOUT_BASE).replace(/\/$/, '');

  const sessionId = generateSessionId();
  const checkoutUrl = `${checkoutBase}/${sessionId}?plan=${encodeURIComponent(planKey)}&mode=${mode}`;

  const session = {
    id: sessionId,
    planKey,
    customerEmail,
    mode,
    createdAt: new Date().toISOString(),
    returnUrl,
    status: 'open',
  };

  SESSION_STORE.set(sessionId, session);

  return {
    sessionId,
    planKey,
    checkoutUrl,
    mode,
  };
}

export function completeMockCheckout(sessionId, options = {}) {
  const session = SESSION_STORE.get(sessionId);

  if (!session) {
    throw new Error(`Unknown mock checkout session: ${sessionId}`);
  }

  session.status = options.status || 'succeeded';
  session.completedAt = new Date().toISOString();
  session.transactionId = options.transactionId || `txn_${sessionId.slice(-8)}`;

  SESSION_STORE.set(sessionId, session);

  return { ...session };
}

export function getMockCheckoutSession(sessionId) {
  return SESSION_STORE.get(sessionId) || null;
}

export function clearMockSessions() {
  SESSION_STORE.clear();
}
