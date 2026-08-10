# AI Assistant Debug Scripts

This directory contains scripts and tests for diagnosing issues in the FinMate AI Assistant pipeline.

## Contents
- `run_trace.mjs`: Script to trace the AI execution path.
- `test_intents.js`: Script to test the `IntentDetector` output for various user messages.
- `test_validator.js`: Script to test `ResponseValidator.js` hallucination checks and proximity.

## Tracked Follow-ups
### Retry Quota Tracking (Task 9)
Currently, AI Response Validation retries consume a daily quota slot. We need to monitor production logs for a week to determine if this policy should be changed.
- **Action:** If retries happen frequently and exhaust user quota too quickly, we will change `incrementDailyQuota(userId, 'validation-retry')` to not decrement the user's visible quota in `aiController.js`.
- **Status:** Monitoring logs.
