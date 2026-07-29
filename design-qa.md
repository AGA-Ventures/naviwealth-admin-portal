# Stock Set Details — Design QA

## Comparison target

- Source visual truth: `design-qa-stock-detail-source.png` (the accepted Event Set detail layout) and `design-qa-stock-library-source.png` (the annotated Stock Dataset design language and content).
- Implementation: `design-qa-stock-detail.png`.
- Viewport: 1954 × 1273 CSS pixels.
- Source and implementation screenshots: 1954 × 1273 pixels.
- Device scale factor: 2; the in-app browser normalized both captures to the same CSS-sized PNG, so no additional density conversion was required.
- State: Stock Set 4 loaded, configuration dialog closed, desktop layout.

## Full-view comparison evidence

- Evidence: `design-qa-stock-detail-comparison.png`.
- The Stock Set page preserves the accepted detail hierarchy: persistent sidebar, restrained top bar, breadcrumb, icon/title/action hero, four metrics, large membership table, readiness panel, and reuse-history panel.
- The cyan stock accent intentionally replaces the event page’s purple accent while retaining the same semantic hierarchy and component proportions.
- No content overlaps, clipped controls, unexpected wrapping, or horizontal overflow are visible at the target viewport.

## Focused comparison evidence

- Evidence: `design-qa-stock-detail-focused-comparison.png`.
- The hero, metrics, table header, table rows, readiness card, and reuse card retain the source screen’s padding, radii, borders, density, and alignment.
- Stock-specific price ranges and sequence-change badges remain readable without changing the table’s overall rhythm.

## Findings

- No actionable P0, P1, or P2 differences remain.

## Required fidelity surfaces

- Fonts and typography: Geist Sans and Geist Mono, weights, hierarchy, line height, tracking, and numeric emphasis match the existing portal.
- Spacing and layout rhythm: sidebar width, main-content inset, hero spacing, four-card grid, table density, 15px column gap, borders, and radii match the accepted detail screen.
- Colors and visual tokens: existing navy surfaces and line tokens are preserved; cyan is used consistently for the stock context, with green/red reserved for positive/negative moves and yellow for usage.
- Image quality and asset fidelity: no new raster imagery was required; the screen uses the portal’s existing logo and component assets without placeholders.
- Copy and content: labels describe the stock package accurately, including 360 ticks, 10-second cadence, MYR price ranges, readiness, and reuse history.

## Interaction checks

- Selecting Stock Set 4 from the library navigates to `/admin/stocks/8`.
- Configure set opens the existing stock-package editor and Close dialog dismisses it.
- Duplicate, Use in game, Copy symbols, breadcrumb, back link, and sidebar routes are present and connected.
- The browser console reported no errors.
- The production build completed successfully.
- All 11 automated tests pass.

## Comparison history

- Initial implementation: no P0/P1/P2 visual mismatch was identified in the first normalized side-by-side comparison, so no design-fix iteration was required.

## Implementation checklist

- [x] Card-level navigation to a dedicated Stock Set route.
- [x] Stock-specific hero, metrics, membership table, readiness, and usage.
- [x] Working package configuration and dataset actions.
- [x] Responsive reuse of the existing detail-page layout.
- [x] Browser and automated verification.

## Follow-up polish

- No blocking or recommended P3 polish remains for this scope.

final result: passed
