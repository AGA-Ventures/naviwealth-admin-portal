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

# Live game-screen preview in the event editor — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-editor-live-preview/reference.png`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-editor-live-preview/implementation.png`.
- Same-state side-by-side comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-editor-live-preview/comparison.png`.
- Implementation viewport: `1761 × 1354` CSS pixels.
- State: authenticated Malaysia event dataset at `http://localhost:3000/admin/events/12`, Row 03 open in edit mode.

## Full-view comparison

The existing editor header, summary, source metadata, field groups, and sticky actions remain visually consistent with the supplied source. A clearly labeled live sample now sits immediately below the editor header and uses the same game-screen rendering as the full preview. The wider editor preserves the current modal proportions while giving the sample screen enough space to remain readable.

## Required fidelity surfaces

- Fonts and typography: the live sample reuses the established event-output typography, metrics, and mono metadata labels.
- Spacing and layout rhythm: the new preview heading uses the modal's existing compact toolbar rhythm; the sample is centered with an even `18px` frame.
- Colors and visual tokens: cyan, purple, red, green, borders, gradients, and shadows are all existing NaviWealth tokens.
- Image quality and asset fidelity: the shared game-screen component retains the existing grid texture without new placeholder assets.
- Copy and content: the preview is generated from the current draft record and displays the selected country and currency.

## Interaction checks

- Row 03 opens in preview mode and `Edit event` enters the editor.
- The editor contains exactly one `Live game-screen preview` region below its header.
- Changing `Title (ENG)` updates both the editor heading and embedded game-screen heading immediately without saving.
- `Open full preview` carries the unsaved draft into the full-screen sample.
- `Reset changes` restores the original title and disables `Save event`; no database data was changed during QA.
- The editor scrolls as one surface while its save actions remain sticky.
- Browser logs contain no errors.

## Findings

No actionable P0, P1, or P2 differences remain. The live preview is visible before the fields, matches the existing game-screen component, and keeps all editor controls accessible in the scrollable modal.

## Follow-up polish

- No P3 polish is required for this scoped addition.

final result: passed

---

# Age Set composition rules — Design QA

## Evidence

- Source visual truth: `/var/folders/d8/t1mw66t10m5b3j173p40kqzc0000gn/T/naviwealth-age-set-source.png` (the annotated browser screen from the current request).
- Browser-rendered implementation: `/var/folders/d8/t1mw66t10m5b3j173p40kqzc0000gn/T/naviwealth-age-set-implementation.png`.
- Normalized side-by-side comparison: `/var/folders/d8/t1mw66t10m5b3j173p40kqzc0000gn/T/naviwealth-age-set-comparison.png`.
- Source pixels: `1280 × 984`, supplied from a `1761 × 1354` browser viewport.
- Implementation pixels: `1746 × 1343`, captured from the same in-app browser surface and normalized to `1280 × 984` for comparison.
- State: authenticated Malaysia dataset at `http://localhost:3000/admin/events/12`, Age 25 expanded, with the membership panel and readiness audit visible.

## Full-view comparison

The existing four-row Age Set hierarchy remains intact. Incomplete Cash Flow or Capital Gain rows now receive an amber rule panel directly above the affected Set, while valid pairs use two equal card columns and single Market/Expenses rows remain alone. The readiness panel uses the same amber state to identify every invalid Set independently from a completely missing Set.

## Focused-region comparison

The Age 25 source and implementation are readable in the normalized comparison, so no separate crop is required. Sets `25 - 1` and `25 - 4` now explicitly request `Capital Gain`; Set `25 - 2` remains a valid two-column Capital Gain/Cash Flow pair; Set `25 - 3` remains a valid single Expenses row. The audit changes from presence-only coverage to strict composition coverage and reports `5/15 complete`.

## Required fidelity surfaces

- Fonts and typography: the warning uses the existing Geist Sans/Mono hierarchy, compact uppercase metadata, and readable amber action copy without changing card typography.
- Spacing and layout rhythm: warning panels align with the card content column; cards use two equal columns so paired events read together; single rows keep an intentional empty partner column.
- Colors and visual tokens: amber communicates a fixable rule issue, green remains complete, and the existing category colors for Cash Flow, Capital Gain, Expenses, and Market are unchanged.
- Image quality and asset fidelity: no new imagery or decorative assets were required; the existing NaviWealth brand and interface assets remain unchanged.
- Copy and content: warnings name the missing counterpart or explain an invalid row mix; the readiness summary describes the exact first failing Age/Set and the overall rule count.

## Interaction checks

- Age 25 renders two incomplete Sets and two complete Sets.
- Both incomplete Sets say `Add Capital Gain` and explain the pairing rule.
- `Fix Age Set` opens the existing Configure Event Package dialog and the dialog closes normally.
- The readiness audit distinguishes `17` invalid row mixes from `1` completely missing Set.
- The game-use action remains disabled and reads `Fix age set rules` until all 15 ages pass.
- Browser console logs contain no errors.
- Production build and all `32` automated tests pass.

## Comparison history

1. Initial P1: presence-only checks marked Cash Flow-only and Capital Gain-only Sets as complete.
   - Fix: validate each Age Set as either one Market/Expenses row or exactly one Cash Flow plus one Capital Gain pair.
   - Post-fix evidence: Age 25 Sets 1 and 4 are amber, Sets 2 and 3 remain complete, and the readiness count is recalculated across all 60 Sets.
2. Initial P2: the affected row provided no explanation or path to correction.
   - Fix: add a scoped amber warning with the missing event type and a working `Fix Age Set` action.
   - Post-fix evidence: the action opens the existing configuration dialog without navigation or console errors.

## Findings

No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- No P3 polish is required for this scoped rule update.

final result: passed

---

# Editable role permissions — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/role-permissions/role-guide-before.jpg`.
- Browser-rendered implementation, matching closed state: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/role-permissions/role-guide-after.jpg`.
- Browser-rendered editor state: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/role-permissions/role-permission-editor-admin.jpg`.
- Full normalized comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/role-permissions/role-guide-comparison.jpg`.
- Focused role-guide comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/role-permissions/role-guide-focus-comparison.jpg`.
- Source and closed implementation pixels: `1280 × 1497`; editor pixels: `1280 × 720`.
- Browser CSS viewport: `1280 × 720`; device scale factor `1`; source and implementation captures use the same density.
- Route and state: authenticated superadmin at `http://localhost:3000/admin/users`; closed-state comparison plus the Admin role selected in the editor.

## Full-view comparison

The administrator directory, metrics, sidebar, access-health panel, audit history, typography, and page proportions remain unchanged. The scoped role-guide panel keeps the original footprint and adds one compact `Edit roles` action plus saved permission counts for all four roles.

## Focused-region comparison

The equal-size focused comparison shows that the original four role rows, icons, descriptions, borders, spacing, and color treatment remain intact. Permission counts align at the end of each row without changing panel height. The editor reuses the existing modal language with role tabs, a selected-role summary, two-column permission controls, required badges, and a persistent action footer.

## Required fidelity surfaces

- Fonts and typography: existing Geist Sans and Geist Mono families, weights, compact labels, title hierarchy, and tracking are preserved.
- Spacing and layout rhythm: the role guide retains its original width and height; the editor uses the established modal header, `8px` control gaps, `9px` radii, and a sticky footer so its primary action remains visible at `720px` height.
- Colors and visual tokens: navy surfaces, cyan enabled states, purple role accents, muted Viewer styling, border tokens, and focus treatment all reuse the current admin system.
- Image quality and asset fidelity: no raster imagery or new asset approximations were required; the existing NaviWealth brand and interface assets remain unchanged.
- Copy and content: each permission has a direct task label and explanation; role counts match the persisted database defaults (`7`, `5`, `3`, `1`), and required safeguards are explicitly labeled.

## Interaction checks

- `Edit roles` opens an accessible dialog with four selectable role tabs.
- Switching from Admin to Superadmin updates the selected-role summary, affected-user count, saved permission count, and checked controls.
- `portal.view` is checked and locked for every role.
- `users.manage` and `audit.view` are checked and locked for Superadmin to prevent access-management lockout.
- `users.manage` and `audit.view` are disabled and labeled `Superadmin only` for every other role.
- The Viewer `Run simulator` control changed `false → true → false` in-browser and was cancelled without mutating saved access.
- Cancel closes the editor; the sticky save footer remains visible at the verified viewport.
- The authenticated page loaded all seven users, four role configurations, and the existing action history without an error overlay.
- Production build, focused lint, and all 30 automated tests pass.

## Comparison history

1. Initial P2: the first editor capture placed the action buttons just below the visible modal area at a `720px`-high viewport.
   - Fix: make the role-editor action footer sticky within the existing scrollable modal and preserve a solid navy footer background.
   - Post-fix evidence: `role-permission-editor-admin.jpg` shows both `Cancel` and `Save Admin` fully visible without obscuring the permission controls.

## Findings

No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- No P3 polish is required for this scoped role-permission editor.

final result: passed

---

# Event detail sidebar on phone — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/mobile-admin-nav/mobile-nav-desktop-before.jpg`.
- Desktop regression capture: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/mobile-admin-nav/mobile-nav-desktop-after-matched.jpg`.
- Phone implementation, closed state: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/mobile-admin-nav/mobile-nav-phone-closed.jpg`.
- Phone implementation, open state: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/mobile-admin-nav/mobile-nav-phone-open.jpg`.
- Desktop source and implementation: `1280 × 720` CSS pixels at device scale factor `1`.
- Phone implementation: `390 × 844` CSS pixels at device scale factor `1`.
- Route: authenticated event detail at `http://localhost:3000/admin/events/12`.

## Full-view comparison

The equal-size desktop before/after comparison keeps the original 244px fixed sidebar, top bar, event membership content, readiness panel, typography, and spacing unchanged. At the requested phone breakpoint, the same navigation becomes a `320px` slide-in drawer over a dimmed backdrop instead of disappearing. The closed state replaces the unavailable sidebar with a compact `Menu` control beside the existing NaviWealth mobile brand.

The user supplied the desktop annotated screen rather than a literal phone mock, so the phone view is evaluated as a responsive derivation of that source. The original hierarchy, copy, colors, and controls are preserved.

## Focused-region comparison

The phone closed/open captures were reviewed together. The open drawer preserves the source logo, workspace grouping, active Event datasets state, package summary, and signed-in user at a readable touch size. The drawer occupies `82%` of the captured phone width, leaves a visible dismissal area, and keeps the package and account controls within the scrollable navigation surface.

## Required fidelity surfaces

- Fonts and typography: existing Geist sans and mono styles, weights, label sizes, and letter spacing are unchanged.
- Spacing and layout rhythm: the drawer keeps the source sidebar spacing; the mobile top bar has balanced `20px` side padding and the content remains single-column without horizontal overflow.
- Colors and visual tokens: the drawer, cyan active state, purple package card, green status, dimmed backdrop, borders, and focus states reuse the existing admin tokens.
- Image quality and asset fidelity: no image or icon assets were added, replaced, or approximated.
- Copy and content: all navigation labels, counts, package metadata, and account information remain identical to the desktop source; only `Menu` and `Close` are new responsive controls.

## Interaction checks

- `Menu` appears at `390px` and is hidden at the `1280px` desktop viewport.
- Opening the drawer sets `aria-expanded="true"`, locks background scrolling, shows the backdrop, and moves focus to `Close` after the transition.
- Escape closes the drawer, removes the backdrop, restores page scrolling, and returns focus to `Menu`.
- Tapping the uncovered backdrop closes the drawer without navigating away.
- Desktop sidebar remains visible at `244px` and the mobile trigger remains hidden.
- Lint, production build, and all 29 automated tests pass.

## Comparison history

1. Initial P1: the existing `max-width: 880px` rule removed the entire admin sidebar, leaving phone users without access to primary navigation.
   - Fix: retain the sidebar as an off-canvas drawer with a visible Menu trigger, close control, backdrop, and mobile-safe scrolling.
   - Post-fix evidence: the phone closed/open captures show the complete navigation and a usable dismissal area at `390 × 844`.
2. Initial P2: the first browser pass left focus on `Menu` after the drawer opened.
   - Fix: move focus to `Close` after the drawer transition and restore it to `Menu` on Escape or backdrop dismissal.
   - Post-fix evidence: the browser reports `sidebar-mobile-close` as the active control while open and `Menu` after both dismissal paths.

## Findings

No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- No P3 polish is required for this scoped responsive navigation change.

final result: passed

---

# Four Age Set rows inside every age — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-set-rows/age-set-rows-before.jpg`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-set-rows/age-set-rows-after.jpg`.
- Full Age 25 implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-set-rows/age-set-rows-full-page.png`.
- Focused implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-set-rows/age-set-rows-focused-after.png`.
- Normalized side-by-side comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-set-rows/age-set-rows-comparison.jpg`.
- Source capture: `1087 × 883` CSS pixels at device scale factor `2`.
- Implementation viewport: `1280 × 720` CSS pixels at device scale factor `2`; the comparison fits both captures into equal `960 × 720` canvases without cropping their content.
- Route and state: authenticated Malaysia dataset at `http://localhost:3000/admin/events/12`, with Age 25 expanded.

## Full-view comparison

The source placed all five Age 25 events into one flat card grid, which made a duplicate `Age Set 25 - 2` appear like a fifth set. The implementation presents exactly four horizontal Age Set rows: `25 - 1`, `25 - 2`, `25 - 3`, and `25 - 4`. Both events mapped to `25 - 2` remain visible together in the second row.

## Focused-region comparison

The focused implementation shows the complete four-row hierarchy. Each row has a fixed metadata rail with its Age Set identity and event count, followed by the existing event cards. The cards retain their category colors, typography, financial effect, localized title, and preview affordance.

## Required fidelity surfaces

- Fonts and typography: the existing Geist sans and mono hierarchy is preserved; the Age Set rail uses the same compact metadata treatment as the rest of the admin portal.
- Spacing and layout rhythm: all four rows share consistent rails, separators, padding, and card gaps. At `1280px`, two cards remain comfortably readable; at wider desktop sizes the grid uses three columns.
- Colors and visual tokens: cyan Age Set labels, navy surfaces, event-category borders, and the yellow missing-state treatment reuse existing tokens.
- Image quality and asset fidelity: no image or icon assets were added or replaced.
- Copy and content: all 90 imported events remain present. Age Set labels come from the imported `Age Set` field, with `Set Within Age` and `Screen Set` used only as defensive fallbacks.

## Interaction checks

- 15 age groups render.
- Exactly 60 Age Set rows render: four rows for each of the 15 ages.
- All 90 event cards remain rendered.
- Age 25 contains card counts `1, 2, 1, 1` across Age Sets `25 - 1` through `25 - 4`.
- Opening the second event inside `25 - 2` still launches the correct game-screen preview.
- Age 39 still renders four rows; `39 - 4` is visibly marked as the one missing row.
- Readiness now derives coverage from `Age Set` and labels the audit as Age Set coverage.

## Comparison history

1. Initial P1: five flat Age 25 cards obscured the required four-Age-Set structure and made duplicated `25 - 2` data look like a fifth set.
   - Fix: group every age into four persistent rows keyed by the imported Age Set suffix, while retaining every event inside its matching row.
   - Post-fix evidence: browser checks report four rows, five cards, labels `25 - 1` through `25 - 4`, and row card counts `1, 2, 1, 1`.
2. Initial P2: three columns at the `1280px` verification viewport reduced event cards to about `159px` each and caused excessive title compression.
   - Fix: switch to two columns at `1400px` and below.
   - Post-fix evidence: the measured card grid changed from three `159px` columns to two `243.5px` columns.

## Findings

No actionable P0, P1, or P2 differences remain. The grouped-card preview interaction passed, the missing Age Set state passed, lint passed, the production build passed, and all automated tests passed.

## Follow-up polish

- No P3 polish is required for this scoped hierarchy change.

final result: passed

---

# Event membership grouped by age — Design QA

## Evidence

- Source visual truth: the browser annotation screenshot attached to the current request, showing the original flat event-card grid.
- Browser-rendered initial state: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-groups/event-age-groups-first-open.jpg`.
- Browser-rendered interaction state: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-groups/event-age-groups-age26-open.jpg`.
- Initial and interaction pixels: `1601 × 1137`.
- Browser CSS viewport: `1616 × 1147`; reported device scale factor `2`.
- Side-by-side interaction comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-groups/event-age-groups-comparison.jpg`.
- State: Age 25 expanded by default on the left; Age 25 collapsed and Age 26 expanded on the right.

## Full-view comparison

The event set now presents its 90 cards as 15 age sections instead of one continuous grid. Each section exposes its age, source-row range, and event count before expansion, while the surrounding event identity, metrics, readiness, reuse history, and card design remain unchanged.

## Focused-region comparison

The first section opens automatically so the page never lands on an empty-looking panel. Selecting a summary collapses or expands that age in place. Expanded sections retain the existing three-column card layout and every card continues to open the same game preview.

## Required fidelity surfaces

- Fonts and typography: existing Geist sans and mono hierarchy is preserved; age labels and metadata reuse the current section patterns.
- Spacing and layout rhythm: collapsed rows use a compact `54px` summary, while expanded groups keep the existing `12px` card-grid spacing.
- Colors and visual tokens: cyan disclosure markers, purple count badges, navy surfaces, and existing per-event accent colors remain consistent.
- Image quality and asset fidelity: no image or icon assets were added or replaced.
- Copy and content: all 90 imported events, row numbers, financial effects, bilingual labels, and preview actions remain unchanged.

## Interaction checks

- The event set renders 15 age groups covering Ages 25–39.
- Exactly one age group is expanded on initial load.
- Age 25 can be collapsed, leaving zero groups open.
- Age 26 can be expanded independently, leaving exactly one group open.
- The first Age 26 card opens the expected `Real Estate Investment - 1-Bedroom SOHO Apartment` preview.

## Comparison history

1. Initial P2: the first native disclosure did not open consistently when using `defaultOpen` with hydrated event data.
   - Fix: use explicit expansion state and initialize the first populated age group as open.
2. Interaction P1: a controlled native `toggle` handler let the browser and React state briefly disagree, keeping two sections open after a collapse/expand sequence.
   - Fix: prevent the summary's native toggle and update the expansion set directly from the summary click.
   - Post-fix evidence: browser checks report `1 → 0 → 1` open groups across initial, collapse, and expand states.

## Findings

No actionable P0, P1, or P2 differences remain. The page rendered without an error overlay, all browser interaction checks passed, lint passed, the production build passed, and all 26 automated tests passed.

## Follow-up polish

- No P3 polish is required for this scoped grouping change.

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

---

# Stock trend sparkline containment — Design QA

## Evidence

- Source defect screenshot: `/var/folders/d8/t1mw66t10m5b3j173p40kqzc0000gn/T/TemporaryItems/NSIRD_screencaptureui_mlF9ov/Screenshot 2026-08-03 at 2.18.44 PM.png`.
- Source pixels: `2546 × 1266`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/stock-trend-fix/stock-trends-fixed.jpg`.
- Implementation pixels: `1190 × 1525`; browser CSS viewport `1205 × 1147`, reported device scale factor `2`.
- Focused comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/stock-trend-fix/stock-trends-comparison.png`.
- Density normalization: the source and implementation trend-column crops were each scaled to `350 × 1060` and placed side by side in the focused comparison.
- State: Stock datasets source inventory with all eight simulated instruments visible.

## Full-view comparison

The fixed browser capture preserves the existing NaviWealth stock page, table columns, semantic red/green colors, row spacing, labels, prices, and dataset controls. The only visible change is that each trend profile now renders as a compact sparkline in its own row instead of using raw price values as unbounded percentage heights.

## Focused-region comparison

The comparison image places the reported broken trend column on the left and the fixed browser result on the right. The source shows red and green bars spanning several rows; the fixed result shows eight distinct 25px-tall profiles aligned to their corresponding rows. Runtime measurements confirm every bar is contained within its `25px` sparkline and every table row remains `61px` tall.

## Required fidelity surfaces

- Fonts and typography: unchanged; table labels, numeric values, and monospace metadata retain the existing NaviWealth hierarchy.
- Spacing and layout rhythm: each sparkline is fixed at `95 × 25px`; bars range from `3–25px` and remain inside the `61px` row.
- Colors and visual tokens: negative profiles remain red and positive profiles remain green using the existing semantic tokens.
- Image quality and asset fidelity: no image assets were added or replaced; these are data-driven interface marks already present in the product.
- Copy and content: instrument names, prices, percentage movements, and package usage remain unchanged.

## Comparison history

1. Initial P1: raw prices such as `1300` were emitted as `height: 1300%`, causing red and green bars to overflow across the table.
   - Fix: normalize each instrument's trend points to a `12–100%` local scale, clip the sparkline container, and cap each bar at `100%`.
   - Post-fix evidence: all eight runtime measurements report `contained: true`, `sparklineHeight: 25`, `tallestBar: 25`, and `rowHeight: 61`.

## Findings

No actionable P0, P1, or P2 differences remain. The browser control surface did not expose historical console output; however, the page rendered without an error overlay, all eight DOM measurements completed, lint passed, the production build passed, and all 26 automated tests passed.

## Follow-up polish

- No P3 polish is required for this fix.

final result: passed

---

# Event country variants inside Configure set — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/country-variants-original-header.jpg`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/country-variants-in-configure.jpg`.
- Source and implementation pixels: `1601 × 1137`.
- Browser CSS viewport: `1616 × 1147`; reported device scale factor `2`. Both captures use the browser's same normalized screenshot density.
- Full-view comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/country-variants-comparison.jpg`.
- Focused comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/country-variants-focused-comparison.jpg`.
- State: Malaysia event dataset before the move on the left; the same dataset with Configure set open after the move on the right.

## Full-view comparison

The event detail header is now cleaner and starts directly with the event identity. The Malaysia/China controls appear at the top of the existing Configure event package modal, ahead of dataset metadata, without changing the surrounding page, event cards, metrics, readiness panel, or reuse history.

## Focused-region comparison

The focused evidence shows the same two country controls before and after relocation. Their order, labels, currency indicators, active Malaysia state, purple highlight, radii, and spacing are preserved. The modal adds a concise `2/2 available` count and country-isolation explanation using existing admin-field typography.

## Required fidelity surfaces

- Fonts and typography: existing Geist sans and mono hierarchy is unchanged; the modal label and availability count reuse current form patterns.
- Spacing and layout rhythm: the two variants use equal grid columns inside a padded configuration group and remain aligned at the modal's full content width.
- Colors and visual tokens: the existing purple active state, navy surfaces, border tokens, and cyan count remain consistent with the event configuration UI.
- Image quality and asset fidelity: no image or icon assets were introduced or replaced.
- Copy and content: `MY Malaysia RM` and `CN China RMB` remain unchanged; explanatory copy clarifies that country economies stay independent.

## Interaction checks

- The event-detail header contains zero country switchers.
- Configure set contains exactly one country switcher.
- The China control navigates from `/admin/events/12` to `/admin/events/14`.
- Reopening Configure set on China marks `CN China RMB` active.
- Missing country variants continue to render as an Add-country button inside Configure set.

## Comparison history

1. Initial P2: country variants occupied a full row above the event identity and duplicated country-creation actions in the header.
   - Fix: move the complete switch/create control into Configure set and remove the header duplicate.
   - Post-fix evidence: the final header has zero switchers, the modal has one switcher, and country navigation remains functional.

## Findings

No actionable P0, P1, or P2 differences remain. The browser control surface did not expose historical console output; the page and modal rendered without an error overlay, browser interaction checks passed, lint passed, the production build passed, and all 26 automated tests passed.

## Follow-up polish

- No P3 polish is required for this scoped relocation.

final result: passed

---

# Four event sets per age — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-readiness/readiness-before.jpg`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-readiness/readiness-after.jpg`.
- Browser-rendered age audit: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-readiness/readiness-age-grid.jpg`.
- Source and implementation pixels: `1265 × 712`.
- Browser CSS viewport: `1280 × 720`; reported device scale factor `2`. Source and implementation use the same screenshot density.
- Full-view comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-readiness/readiness-comparison.jpg`.
- Focused readiness comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-readiness/readiness-focused-comparison.jpg`.
- State: Malaysia Ages 25–40 event dataset with 90 imported rows; Age 39 is missing Screen Set 4.

## Full-view comparison

The existing event-detail composition remains unchanged. The right readiness panel now reports `REVIEW` instead of the misleading `READY`, includes a four-sets-per-age validation result, and changes the primary action to the disabled `Complete age sets` state while coverage is incomplete.

## Focused-region comparison

The focused comparison shows the readiness panel before and after the new validation gate. The scrolled implementation view exposes all 15 age checks in a compact two-column matrix. Ages 25–38 show four green set markers; Age 39 is highlighted in yellow with Set 4 missing.

## Required fidelity surfaces

- Fonts and typography: the existing Geist sans and mono hierarchy is preserved; audit labels and set markers reuse the panel's small-data typography.
- Spacing and layout rhythm: the check list keeps its original row spacing, while the 15-age matrix fits the existing 300px sidebar in two columns without horizontal overflow.
- Colors and visual tokens: complete states use the existing green token and incomplete coverage uses the existing yellow warning token.
- Image quality and asset fidelity: no image or icon assets were added or replaced; all coverage marks are data labels.
- Copy and content: the result is derived from imported `Age` and `Screen Set` values. It states `14 of 15 ages contain Sets 1–4` and identifies `Age 39` as missing `Set 4`.

## Interaction checks

- Exactly 15 age audit rows render.
- 14 age rows pass and one age row warns.
- Age 39 exposes Set 4 as the missing value.
- The package score changes to `REVIEW`.
- `Use in game` changes to disabled `Complete age sets` until all age checks pass.
- Browser DOM validation completed without an error overlay; lint, production build, and all 27 automated tests pass.

## Comparison history

1. Initial P1: the original panel marked this package ready based only on member count even though Age 39 lacked Screen Set 4.
   - Fix: compute the expected 15 consecutive ages, validate Screen Sets 1–4 for each age, and include coverage in the package-ready gate.
   - Post-fix evidence: the browser reports 15 checks, 14 complete, one warning, and missing Set 4 for Age 39.
2. Initial P2: a single warning sentence would not let an administrator verify every age quickly.
   - Fix: add the compact two-column age matrix with four explicit set markers per age.
   - Post-fix evidence: all 15 ages are readable in the scrolled readiness capture with no horizontal overflow.

## Findings

No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- No P3 polish is required for this scoped validation change.

final result: passed

---

# Separate event package name and starting age — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/country-variants-in-configure.jpg`.
- Intended implementation route: `http://localhost:3000/admin/events/12`, Configure set modal.
- Source pixels: `1601 × 1137`; source CSS viewport `1616 × 1147`, device scale factor `2`.
- Implementation screenshot: unavailable because the local administrator session expired and the protected route redirects to sign-in.
- State: source Configure set modal with the original combined `Dataset name` input; intended state has separate `Package name` and numeric `Starting age` inputs.

## Full-view comparison

Blocked: the updated authenticated Configure set modal cannot be captured until an administrator signs back in.

## Focused-region comparison

Blocked for the same authentication reason. Static implementation and automated checks confirm the form structure, but those do not replace browser-rendered visual evidence.

## Implemented behavior awaiting visual verification

- Existing names such as `Kid Events · Ages 25–40` are parsed into `Package name: Kid Events` and `Starting age: 25`.
- Starting age uses a required whole-number input from 1–100.
- The live range preview calculates `ending age = starting age + 15`.
- Saving recombines the fields into the existing compatible dataset name format.
- Lint, production build, and all 28 automated tests pass.

## Findings

- [P1] Browser-rendered implementation evidence is missing.
  - Location: Configure set modal on `/admin/events/12`.
  - Evidence: the current in-app browser session is on the sign-in page.
  - Impact: layout, focus, input sizing, and live range behavior cannot be visually approved.
  - Fix: sign in to the local admin portal, reopen Configure set, capture the updated modal, test editing Starting age, and repeat the side-by-side comparison.

## Follow-up polish

- None identified until the blocking browser verification is completed.

final result: blocked

---

# Separate event package name and starting age — Completed Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/country-variants-in-configure.jpg`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/package-name-starting-age-after.jpg`.
- Normalized side-by-side comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-country-config/package-name-starting-age-comparison.jpg`.
- Route and state: authenticated Malaysia dataset at `http://localhost:3000/admin/events/12` with Configure set open.

## Full-view comparison

The original combined `Dataset name` field is replaced by two aligned controls: `Package name` and `Starting age`. The country variants, description, status, bundled IDs, and modal actions retain the existing layout and design language.

## Required fidelity surfaces

- Fonts and typography: existing Geist sans and mono styles remain unchanged.
- Spacing and layout rhythm: package name and starting age share one balanced row, while the rest of the form keeps its established spacing.
- Colors and visual tokens: the numeric input, range preview, borders, and focus state reuse current admin-form tokens.
- Copy and content: the saved compatible name remains `Kid Events · Ages 25–40`; the editable fields expose `Kid Events` and `25` separately.

## Interaction checks

- `Package name` loads as `Kid Events`.
- `Starting age` loads as `25` and displays `Range 25–40`.
- Changing the starting age to `30` updates the live range and modal heading to `30–45`.
- The value was restored to `25` without saving, so no dataset mutation occurred during QA.

## Findings

The earlier authentication blocker is resolved. No actionable P0, P1, or P2 differences remain; the authenticated modal rendered without an error overlay and the live range behavior passed.

## Follow-up polish

- No P3 polish is required for this scoped form change.

final result: passed

---

# Remove event-preview timer — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-output-design-qa/event-output-preview.jpg`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-output-design-qa/event-output-without-timer-after.jpg`.
- Normalized side-by-side comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-output-design-qa/event-output-timer-removal-comparison.jpg`.
- Route and state: authenticated event Row 01 game-screen preview at `http://localhost:3000/admin/events/12`.

## Full-view comparison

The `TIME REMAINING 00:41` card is completely removed from the preview. The event identity now occupies the top line by itself, while the snapshot and impact sections keep their original grid, hierarchy, and spacing.

## Required fidelity surfaces

- Fonts and typography: event title, Chinese heading, metric labels, and values are unchanged.
- Spacing and layout rhythm: the timer leaves no empty bordered container or mobile-only gap; the remaining content keeps its established alignment.
- Colors and visual tokens: no visual tokens were added or changed.
- Image quality and asset fidelity: no image or icon assets were introduced or replaced.
- Copy and content: only the timer label and value were removed; event data and financial values remain unchanged.

## Interaction checks

- Opening the first event card still launches the game-screen preview.
- The preview contains zero `.event-output-timer` elements.
- The preview contains zero exact `TIME REMAINING` labels.
- `Close` and `Edit event` remain present and usable.

## Findings

No actionable P0, P1, or P2 differences remain. The authenticated browser check passed, the production build passed, and all 28 automated tests passed.

## Follow-up polish

- No P3 polish is required for this scoped removal.

final result: passed

---

# Four Age Set rows — Final verification

The full evidence, fidelity review, responsive correction, and comparison history are recorded in `Four Age Set rows inside every age — Design QA` above. Final browser verification confirms 15 age groups, exactly 60 Age Set rows, all 90 event cards retained, and the correct `1, 2, 1, 1` event distribution across Age 25 rows. The grouped Row 03 preview remains functional, and Age 39 renders `39 - 4` as the single missing Age Set.

Implementation evidence: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-set-rows/age-set-rows-focused-after.png`.

final result: passed

---

# Event-type counts in each age summary — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-type-counts/event-type-counts-before.png`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-type-counts/event-type-counts-after.png`.
- Same-state side-by-side comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-age-type-counts/event-type-counts-comparison.png`.
- Source and implementation viewport: `1280 × 720` CSS pixels at device scale factor `2`.
- State: authenticated Malaysia dataset at `http://localhost:3000/admin/events/12`, with Age 25 expanded.

## Full-view comparison

The single purple `5 events` total is replaced with three compact, category-colored badges that explain the age composition: `Cash Flow 3`, `Capital Gain 1`, and `Expenses 1`. The age title, source-row range, accordion behavior, Age Set rows, readiness panel, and surrounding layout remain unchanged.

## Focused-region comparison

The summary badges are readable at the captured desktop viewport and align to the right side of the age header. Cyan, purple, yellow, and green reuse the existing event-category colors. A separate crop is unnecessary because the equal-size comparison makes every label and count legible.

## Required fidelity surfaces

- Fonts and typography: badges reuse the existing small mono metadata style, with the count given a brighter weight for scanning.
- Spacing and layout rhythm: badges wrap as a group with consistent `5px` gaps and switch to left-aligned stacking on narrow screens.
- Colors and visual tokens: Cash Flow uses cyan, Capital Gain purple, Expenses yellow, and Market green from the existing event system.
- Image quality and asset fidelity: no image or icon assets were added or replaced.
- Copy and content: labels match the imported `Type` values; zero-count types are omitted.

## Interaction checks

- All 15 age summaries render an event-type breakdown.
- The old `.event-age-count` total renders zero times.
- Age 25 reports `Cash Flow 3`, `Capital Gain 1`, and `Expenses 1`.
- Age 26 independently reports `Cash Flow 2`, `Capital Gain 2`, and `Expenses 1`.
- Expanded/collapsed Age Set behavior and event-card previews remain unchanged.

## Comparison history

1. Initial P2: `5 events` described volume but did not explain which event types were available in that age.
   - Fix: aggregate imported records by normalized event category for every age and render only the categories present.
   - Post-fix evidence: the browser reports 15 breakdown groups and the exact Age 25 and Age 26 counts above.

## Findings

No actionable P0, P1, or P2 differences remain. The authenticated browser-rendered comparison passed, lint passed, the production build passed, and all 28 automated tests passed.

## Follow-up polish

- No P3 polish is required for this scoped summary change.

final result: passed

---

# Full-width single-event Age Sets — Design QA

## Evidence

- Source visual truth: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-single-card-full-width/reference.png`.
- Browser-rendered implementation: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-single-card-full-width/implementation.png`.
- Normalized side-by-side comparison: `/Users/chishiongtan/Documents/naviwealth-admin-portal/outputs/event-single-card-full-width/comparison.png`.
- Source pixels: `1280 × 984`; implementation pixels: `1746 × 1343`, normalized to `1280 × 984` for comparison.
- State: authenticated Malaysia event dataset at `http://localhost:3000/admin/events/12`, Age 25 expanded with the Expenses event in Age Set `25 - 3` visible.

## Full-view comparison

The selected single Expenses event now spans the complete Age Set content track instead of leaving an empty second column. The same rule applies consistently to every Age Set containing exactly one event, while the valid two-event Capital Gain/Cash Flow pair remains a balanced two-column row.

## Focused-region comparison

The normalized side-by-side view keeps Age Sets `25 - 2`, `25 - 3`, and `25 - 4` legible together. It confirms that only single-event grids expand, the selected Expenses card reaches both content edges, and the surrounding Age Set labels, validation warnings, and right-side readiness panels remain aligned.

## Required fidelity surfaces

- Fonts and typography: event-card typography and truncation rules are unchanged.
- Spacing and layout rhythm: the full-width card preserves the existing `9px` grid rhythm and `10px` Age Set inset while removing the unused column.
- Colors and visual tokens: category borders, focus state, backgrounds, and semantic colors remain unchanged.
- Image quality and asset fidelity: no image or icon assets were introduced or modified.
- Copy and content: row title, Chinese title, event type, age, screen, subtype, financial effect, and preview action are unchanged.

## Interaction checks

- The selected Expenses card still opens its game-screen preview.
- Closing the preview returns to the same membership position.
- Single-event and paired-event grids are both present and render their intended column count.
- Browser logs contain no errors.

## Findings

No actionable P0, P1, or P2 differences remain. Single-event cards fill the available Age Set width without changing paired events or the surrounding membership hierarchy.

## Follow-up polish

- No P3 polish is required for this scoped layout correction.

final result: passed
