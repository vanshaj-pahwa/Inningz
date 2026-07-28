# End-to-End Tests

Playwright-based E2E tests for verifying the Inningz app's mobile and desktop experiences.

## Running tests

Start the dev server first:
```bash
npm run dev
```

Then in another terminal, run tests:

```bash
# Run all tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Run a specific test file
npx playwright test article-listen-mobile.spec.ts

# Run on a specific browser
npx playwright test --project="Mobile Chrome"
```

## Test coverage

### ArticleListen Mobile Experience (`article-listen-mobile.spec.ts`)

Tests the audio player positioning and accessibility on real mobile viewports:
- iPhone 12 (390×844) — tests safe-area-inset-bottom handling
- Pixel 5 (393×727) — tests Android viewport handling
- iPhone 14 Pro (430×932) — tests large notched device handling

**Key checks:**
- Player renders at bottom without overlapping system UI
- Player remains accessible during page scroll
- All controls (play/pause, speed, voice, close) are reachable
- No horizontal overflow on narrow viewports
- Proper positioning during dynamic viewport changes

## Screenshots

Test screenshots are saved to `./e2e/screenshots/` for visual inspection.

## Configuration

See `playwright.config.ts` for browser profiles and test settings.
