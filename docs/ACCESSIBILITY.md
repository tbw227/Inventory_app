# Accessibility baseline

Target, current state, required patterns, and tooling. Gaps are tracked in [`AUDIT.md §5`](../AUDIT.md).

---

## Target

**WCAG 2.2 Level AA** for every route reachable by an authenticated technician or admin. Print-label views (`/labels/print`, `/labels/scan` fullscreen) are scoped to "reasonable effort" because they are transient and keyboard-free by design.

---

## Required patterns

### Semantic structure
- Exactly **one `<h1>`** per route. Sub-sections use `<h2>` / `<h3>` in order; never skip levels for styling.
- Landmarks: `<header>`, `<nav>`, `<main>`, `<footer>` are set at the layout level (`frontend/src/components/layout/Layout.jsx`). Do not duplicate them inside pages.
- Lists of items use `<ul>` / `<ol>` + `<li>`, not stacks of `<div>`.

### Interactive elements
- Buttons are `<button>`. Links are `<a>` / `<Link>`. A `<div onClick>` is a bug unless it has `role="button"` + `tabIndex={0}` + `onKeyDown` handling Enter and Space.
- Every icon-only button needs `aria-label`. Example:
  ```jsx
  <button aria-label="Delete job" onClick={handleDelete}>
    <TrashIcon aria-hidden="true" />
  </button>
  ```
- Modals: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing at the title. Focus moves to the dialog on open and returns to the invoker on close.

### Forms
- Every `<input>` has an associated `<label>` (explicit `for`/`id` or wrapping).
- Error text is associated with its input via `aria-describedby`; the input also gets `aria-invalid="true"` when invalid.
- Required fields use `aria-required="true"` in addition to the `required` attribute.

### Loading and error states
- Use `components/ui/Spinner.jsx` with `role="status"` + `aria-live="polite"`. Do not write inline `animate-spin` divs.
- Use `components/ui/ErrorMessage.jsx` with `role="alert"` for assertive, user-blocking errors; `role="status"` for informational messages.
- Both components are currently under-used — adopting them is tracked in [`AUDIT.md §5.1`](../AUDIT.md).

### Focus
- Every interactive element must have a **visible** focus indicator. The global rule lives in `frontend/src/styles/index.css`:
  ```css
  :where(button, a, [role="button"], [role="link"]):focus-visible {
    outline: 2px solid theme('colors.indigo.500');
    outline-offset: 2px;
  }
  ```
- Do not write `outline: none` without providing a replacement focus style. Tailwind's `focus:outline-none` class must always be paired with a `focus:ring-*` or a custom `:focus-visible` rule.

### Color and contrast
- Text against its background must meet **4.5:1** contrast (normal) or **3.0:1** (large ≥ 18 px bold / ≥ 24 px regular).
- The dashboard accent palette in `frontend/src/config/dashboardAccents.js` has been checked against WCAG AA against the current surface colors. When adding an accent, verify with the WebAIM contrast checker before committing.
- Never use color alone to convey meaning (e.g. "red = overdue"). Pair with an icon or text.

### Motion
- Respect `prefers-reduced-motion`. Animated backgrounds (`frontend/src/features/weather/weatherSceneBackground.jsx`) and the rotating content widget must pause or simplify when the user has reduced motion enabled.

---

## Current state

### Strong
- `ErrorBoundary` wired at the top of the tree (`frontend/src/main.jsx`).
- Lazy-loaded routes keep initial rendering focus-stable: the `<Suspense>` fallback (`RouteFallback` in `App.jsx`) is a `role="status"` spinner, not a blank screen.
- ARIA coverage is good in the navigation, settings, profile, and weather areas.

### Known gaps (all tracked in `AUDIT.md §5`)
- Shared `Spinner` and `ErrorMessage` components exist but are not in use across list pages.
- ARIA coverage is thin in `Supplies.jsx`, `Jobs.jsx`, and `Locations.jsx` — the pages with the most interactive density.
- No global focus-visible rule yet; page-level `focus:ring` classes vary.
- `tailwind.config.cjs` has empty `theme.extend`, so semantic color tokens (surface, border, text) are ad hoc in class strings and not guaranteed to meet contrast.

---

## Tooling

### Manual checks (before every PR that touches UI)
- Navigate the changed screen with **Tab / Shift+Tab only**. Every interactive element should be reachable and visibly focused.
- Zoom to **200 %** and confirm the layout still works (no fixed pixel widths that cut off content).
- Trigger the change via keyboard where possible (Enter on links/buttons, Space on buttons, Esc on modals).

### Automated (planned — see `AUDIT.md §5.2`)
- Integrate `@axe-core/react` into the upcoming Vitest setup; fail test runs on serious/critical violations.
- Lighthouse CI (perf + a11y) on PRs that touch `frontend/src/`.

### Browser tooling
- Chrome DevTools → Lighthouse → Accessibility (quick per-page check).
- Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" to test motion behaviour.

---

## Escalation

If you find an a11y regression reported by a user:
1. Reproduce in the browser the user mentioned.
2. File as a **High** bug and link `AUDIT.md §5` if the root cause matches a tracked gap.
3. Patch on a branch, run the manual keyboard check, and include before/after screenshots in the PR.

---

## Scope exclusions (explicit)

- **Print-label preview** (`/labels/print`) is a one-shot flow with a generated PDF; we document the visual target but do not enforce full keyboard navigation of the preview itself.
- **Weather background animation** is purely decorative; it respects `prefers-reduced-motion` but is not announced to screen readers.
