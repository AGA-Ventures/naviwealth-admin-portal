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
