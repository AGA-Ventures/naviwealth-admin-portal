# Stock Instrument Popup — Design QA

## Comparison target

- Source visual truth: `design-qa-stock-popup-source.png` (the accepted Event Record popup pattern at the same viewport).
- Implementation: `design-qa-stock-popup.png` (Ethereum details opened from Stock Set 4).
- Viewport: 1954 × 1273 CSS pixels.
- Source and implementation screenshots: 1954 × 1273 pixels.
- Device scale factor: 2; both in-app browser captures were normalized to the same CSS-sized PNG.
- State: first membership record opened in a modal over its corresponding detail page.

## Full-view comparison evidence

- Evidence: `design-qa-stock-popup-comparison.png`.
- The popup preserves the accepted centered modal, dimmed backdrop, header, four-cell metadata band, two-column headline metrics, behavior/instructions section, and footer.
- The surrounding Stock Set page remains visible and correctly blurred without shifting or overflowing.
- The stock-specific cyan treatment replaces the event popup’s purple accent while retaining green/red semantic movement colors.

## Focused comparison evidence

- Evidence: `design-qa-stock-popup-focused-comparison.png`.
- Header alignment, title scale, close control, metadata padding, metric hierarchy, two-column content split, divider treatment, and footer alignment match the established popup pattern.
- Longer stock-specific values fit without clipping, including the simulated range and 360-tick coverage.

## Findings

- No actionable P0, P1, or P2 differences remain.

## Required fidelity surfaces

- Fonts and typography: Geist Sans and Geist Mono, weights, numeric emphasis, tracking, line height, and hierarchy match the existing admin portal.
- Spacing and layout rhythm: 730px modal width, section padding, grid gaps, radii, dividers, and centered viewport placement match the accepted component.
- Colors and visual tokens: navy surfaces and border tokens are preserved; cyan identifies stock context, green/red communicate positive/negative movement, and risk badges use semantic volatility colors.
- Image quality and asset fidelity: no new raster imagery was required; existing brand and interface assets remain unchanged with no placeholders.
- Copy and content: every field is stock-specific and useful—symbol, asset class, reference, coverage, price movement, range, gameplay profile, volatility, rules, package, and source ID.

## Interaction checks

- Clicking the ETH row opens the Ethereum record.
- Pressing Enter on the AAPL row opens Apple Inc. with its distinct negative sequence.
- Escape closes the popup and restores focus to the originating row.
- The header close control and footer Close details button both dismiss the popup.
- The dialog traps keyboard focus between its controls and prevents background scrolling.
- The browser console reported no errors.
- The production build completed successfully.
- All 13 automated tests pass.

## Comparison history

- Initial comparison: the stock popup matched the accepted layout with no P0/P1/P2 issues. A minor inherited purple instruction-step accent was changed to cyan before the final capture for stock-context consistency.

## Implementation checklist

- [x] Every instrument membership row opens a stock record.
- [x] Eight authored instrument profiles with realistic fixed-sequence data.
- [x] Mouse, Enter, Space, Escape, backdrop, and close-button support.
- [x] Focus return, focus containment, and body scroll lock.
- [x] Desktop and responsive reuse of the established modal component.
- [x] Browser, build, and automated-test verification.

## Follow-up polish

- No blocking or recommended P3 polish remains for this scope.

final result: passed

---

# Event output preview design QA

## Evidence

- Source visual truth: `/var/folders/d8/t1mw66t10m5b3j173p40kqzc0000gn/T/TemporaryItems/NSIRD_screencaptureui_4oKfYU/Screenshot 2026-07-30 at 2.38.36 PM.png`
- Source pixels: `3314 × 1866`
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-output-design-qa/event-output-final.jpg`
- Implementation screenshot pixels: `1087 × 964`
- Compared implementation region: `.event-output-stage`, `1041 × 586` CSS pixels
- Browser viewport: `1087 × 964` CSS pixels
- Device scale factor: `1`
- Normalized comparison: both source and implementation stage were scaled to `1200 × 675`; no browser chrome was included.
- Side-by-side evidence: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-output-design-qa/event-output-comparison-final.jpg`
- State: China event-set row 06, “Real Estate Investment - 1-Bedroom SOHO Apartment,” read-only sample screen.

## Full-view comparison

The implementation preserves the source composition: a 43/57 split, uppercase event story and access code on the left, bilingual event identity and timer on the right, a three-column financial snapshot, and a lower portfolio-impact group. The implementation uses the row’s actual data, so the China variant correctly displays `RMB`, access code `0277`, and `PROPERTY EVENT`; these differ intentionally from the static Malaysia reference.

The admin-only action bar is outside the compared 16:9 game stage. It provides the required Close and Edit event controls without changing the player-facing sample screen.

## Required fidelity surfaces

- Fonts and typography: Existing NaviWealth sans and mono families reproduce the bold display title, compact bilingual labels, numeric timer, financial values, and access code. Title wrapping matches the reference’s two-line real-estate example.
- Spacing and layout rhythm: The final game stage is exactly 16:9 at `1041 × 586`. Major section starts, split ratio, card grid, bottom impact grouping, radii, and padding match the reference proportions.
- Colors and visual tokens: Deep navy surfaces, cyan information accents, purple impact accents, green assets, and red liabilities match the source. Contrast remains strong.
- Image quality and asset fidelity: The subtle left-side grid uses a clean texture extracted from the supplied source visual at `/public/event-output-grid-texture.png`; it is not recreated as CSS art. There are no missing product images or icons.
- Copy and content: Every visible value is derived from the selected event row. The English description remains unchanged, including embedded `RM` text that still requires China localization; monetary output cards correctly use the selected dataset’s `RMB` display.

## Focused-region comparison

A separate crop was not required: the normalized `2400 × 675` side-by-side comparison keeps the title, description, timer, all nine metric values, impact labels, and access code legible at once. The financial snapshot and impact groups were also checked interactively in the browser.

## Interaction and responsive checks

- Clicking an imported event row opens the sample game screen first.
- Edit event reveals all 40 imported fields.
- Back to preview hides the form and restores the sample.
- The 520 × 900 responsive view stacks the story and financial panels, keeps the action buttons visible, and remains vertically scrollable.
- Browser logs contained no errors or warnings.

## Comparison history

1. Initial P2: the preview stage measured `1041 × 670`, making the design too tall and causing the real-estate title to wrap across four lines.
   - Fix: tightened metric spacing, enforced the 16:9 stage, and adjusted display-title sizing.
   - Post-fix evidence: stage measured `1041 × 586`; title wraps across two lines.
2. Second P2: the impact group began too high and reduced the distinctive empty space between the financial and impact sections.
   - Fix: compacted the happiness and asset/liability cards so the impact group can sit lower through flexible spacing.
   - Post-fix evidence: the normalized comparison aligns the impact heading and bottom-card baseline with the source.
3. Responsive P2: the mobile action buttons initially overflowed the fixed-height admin bar.
   - Fix: prevented the action bar from shrinking in the scroll container.
   - Post-fix evidence: both Close and Edit event are fully visible at `520 × 900`.

## Findings

No actionable P0, P1, or P2 differences remain.

### Follow-up polish

- P3: A future game-runtime integration could replace the static preview timer with the simulator’s live countdown. It is intentionally static in the admin sample.

final result: passed
