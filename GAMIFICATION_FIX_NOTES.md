# Gamification Fix Notes

## Bug 1: Unscoped localStorage cache leak between accounts

### Resolution
- Namespaced the cache key using `gam_cache_${userId}`, derived from the logged-in user details.
- Added user ID verification to prevent fallback dispatching if the parsed cache ID does not match the active user ID.
- Implemented cache clearing loops in `login()` and `verifyRegistrationOtp()` within `AuthContext.jsx` and in the 401 response interceptors within `api.js`.

---

## Bug 2: Server-side trust of client-computed values

### Resolution
- Created a server-side progression level definition and `calculateLevel` algorithm (`server/utils/levelUtils.js`).
- Mirrored client-side `REWARD_ACTIONS` base XP/coins values and multiplier modifiers (`server/utils/rewardUtils.js`) on the server.
- Enforced that the active multiplier is computed strictly server-side using the server's own clock, ignoring any client multiplier parameters to prevent forge exploits.
- Modified `applyGamificationReward` to ignore client-provided `xp` and `coins` parameters entirely, instead computing reward metrics strictly server-side and recalculating level from the updated XP.
- Implemented **OPTION A (discrete action mapping)** for achievement validation:
  - Ported `actionId -> achievement IDs` mapping from the client (`rewardUtils.js`).
  - In `applyGamificationReward`, only achievement IDs mapped to the actual logged `actionId` are allowed to unlock.
  - In `syncAchievements` (progress sync), the server checks the user's `simulatedActions` or `xpHistory` logs to justify unlocking any achievement ID.
  - *Note*: Threshold-based achievements (such as `s10`'s ₹2,00,000 cumulative savings) are not verified against live aggregated database metrics (Option A constraint).

---

## Changed Files List

1. **[client/src/context/GamificationContext.jsx](file:///d:/Computer/PROGRAM/Expense%20Tracker/client/src/context/GamificationContext.jsx)**:
   Namespaced the cache keys per user (`gam_cache_${userId}`) and verified the cached payload's user ID match before dispatching state.
2. **[client/src/services/api.js](file:///d:/Computer/PROGRAM/Expense%20Tracker/client/src/services/api.js)**:
   Updated 401 unauthorized interceptors in both branches to clear any `gam_cache_*` keys from localStorage.
3. **[client/src/context/AuthContext.jsx](file:///d:/Computer/PROGRAM/Expense%20Tracker/client/src/context/AuthContext.jsx)**:
   Added loop to clear all `gam_cache_*` keys from localStorage inside `login()` and `verifyRegistrationOtp()`.
4. **[server/utils/levelUtils.js](file:///d:/Computer/PROGRAM/Expense%20Tracker/server/utils/levelUtils.js)**:
   Created utility for server-side level calculation based on progression levels.
5. **[server/utils/rewardUtils.js](file:///d:/Computer/PROGRAM/Expense%20Tracker/server/utils/rewardUtils.js)**:
   Created utility defining reward tables, multiplier calculations, and Option A achievement mapping validation.
6. **[server/controllers/gamificationController.js](file:///d:/Computer/PROGRAM/Expense%20Tracker/server/controllers/gamificationController.js)**:
   Updated reward and sync controller actions to ignore client-side XP/coins/levels, compute them server-side, and validate achievement unlock claims.
7. **[server/tests/gamification.test.js](file:///d:/Computer/PROGRAM/Expense%20Tracker/server/tests/gamification.test.js)**:
   Added automated regression test covering cache isolation and forged reward payloads.
8. **[server/package.json](file:///d:/Computer/PROGRAM/Expense%20Tracker/server/package.json)**:
   Wired `npm run test` script to run the new integration test file.

---

## Manual QA Verification Steps

### Verification 1: Prevent Cache Leak
1. Log in as **User A**, perform actions to gain XP, unlock a badge, and confirm the `gam_cache_${UserA_id}` key is written in the browser's local storage.
2. Trigger a simulated token expiration / `401 Unauthorized` from the server, or clear only the `accessToken` and `refreshToken` keys from local storage (to mimic a forced logout interceptor check).
3. Confirm that all keys matching `gam_cache*` have been deleted from localStorage.
4. Register or log in as **User B** on the same browser.
5. Verify that User B correctly starts at Level 1, 0 XP, with no badges unlocked.

### Verification 2: Server Rejection of Forged Requests
1. Log in as a user and capture the `Authorization: Bearer <token>` header.
2. Send a forged `POST /api/gamification/reward` request with the following payload:
   ```json
   {
     "actionId": "ADD_INCOME",
     "xp": 99999,
     "coins": 99999,
     "achievementsUnlocked": ["s10"],
     "levelUp": {
       "from": 1,
       "to": 15
     }
   }
   ```
3. Observe the response:
   - The server accepts the payload but validates `actionId: "ADD_INCOME"`.
   - The maximum reward allowed for `ADD_INCOME` is 50 XP and 5 Coins (modified by any active double multipliers).
   - The server clamps the applied XP and coins to the validated limits.
   - The level is recomputed server-side from the clamped XP, remaining at Level 1 (or 2).
   - The server checks eligibility for achievement `"s10"` (which requires a cumulative savings of ₹2,00,000 in goals). If this condition is not met, the server discards `"s10"` and does not unlock the badge.
4. Fetch `/api/gamification/profile` and confirm the user's level, XP, and badges remain intact, ignoring the forged payload.
