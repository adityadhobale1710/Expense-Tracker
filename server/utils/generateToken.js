import jwt from 'jsonwebtoken';

/**
 * Generate an access token embedding tokenVersion and sessionId.
 *
 * Backward-compatibility contract:
 *   - tokenVersion defaults to 0 if not supplied.
 *   - sessionId is optional; if absent, protect middleware skips per-session check.
 *   - All tokens generated after Phase 3 will contain both claims.
 *   - Tokens generated before Phase 3 (no tokenVersion/sessionId) are treated as
 *     tokenVersion=0 and sessionId=undefined; they remain valid until they expire
 *     naturally (15 min TTL), after which only new Phase 3 tokens are issued.
 */
export const generateAccessToken = (userId, { tokenVersion = 0, sessionId = null } = {}) => {
  const payload = { id: userId, tokenVersion };
  if (sessionId) payload.sessionId = sessionId.toString();
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};
