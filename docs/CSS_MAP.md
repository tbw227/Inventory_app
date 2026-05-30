# CSS Chart Map

Reference for the styling architecture across the FireTrack frontend.

---

## 1. Framework & Tools

| Layer | Technology | File |
|-------|-----------|------|
| **CSS Framework** | Tailwind CSS 3.x | `frontend/tailwind.config.cjs` |
| **Dark Mode** | `class` strategy (`html.dark`) | `tailwind.config.cjs` line 2 |
| **Custom CSS** | Weather animations only | `frontend/src/styles/index.css` |
| **Design Tokens** | None in Tailwind `theme.extend` — all inline utilities | `tailwind.config.cjs` (empty `extend`) |

---

## 2. Color System (all inline Tailwind — no central tokens)

### App Shell & Pages (light / dark)

| Role | Light | Dark |
|------|-------|------|
| Page background | `#0f172a` (slate-950) | `#0f172a` (slate-950) |
| Card surface | `bg-white` | `bg-slate-900` |
| Card border | `border-slate-200` | `border-slate-700` |
| Primary text | `text-gray-900` / `text-slate-800` | `text-white` / `text-slate-100` |
| Secondary text | `text-gray-500` / `text-slate-500` | `text-gray-400` / `text-slate-400` |
| Muted text | `text-gray-400` | `text-gray-500` |

### Semantic Colors (hardcoded per-component)

| Meaning | Color | Where used |
|---------|-------|------------|
| Primary action | `bg-blue-600` | Login button, links |
| Success / done | `bg-emerald-500/600` | "Done today" KPI card |
| Warning / pending | `bg-orange-400/500` | "Left today" KPI card |
| Fire extinguisher | `bg-amber-50`, `text-amber-900` | FE unit cards, client detail |
| Danger / error | `text-red-600`, `bg-red-50` | Error messages |
| Teal accent (default) | `bg-teal-500/600/700` | Navigation, links, supply cards |

---

## 3. Dashboard Accent Themes (user-selectable)

Defined in `frontend/src/config/dashboardAccents.js` — 6 presets.

| ID | Hero Gradient | Greeting | Badge |
|----|--------------|----------|-------|
| **teal** (default) | `slate-800 → slate-700 → teal-800` | `text-teal-300` | `bg-teal-500/30` |
| **ocean** | `slate-900 → blue-900 → cyan-900` | `text-cyan-300` | `bg-cyan-500/30` |
| **violet** | `slate-900 → violet-900 → indigo-950` | `text-violet-300` | `bg-violet-500/30` |
| **ember** | `stone-900 → orange-900 → red-950` | `text-orange-300` | `bg-orange-500/30` |
| **forest** | `slate-900 → emerald-900 → green-950` | `text-emerald-300` | `bg-emerald-500/30` |
| **slate** | `slate-950 → slate-800 → slate-900` | `text-slate-300` | `bg-slate-500/30` |

Each accent also defines: `primaryBtn`, `chartSelected`, `pageLink`, `pageLinkStrong`, `spinner`, and icon wrapper colors.

---

## 4. Weather Widget Themes (5 presets × condition × day/night)

Defined in `frontend/src/features/weather/weatherTheme.js`.

| Theme | Strategy |
|-------|---------|
| **default** | Condition-based gradients (blue/amber/violet/slate) |
| **seasonal** | Season + condition (spring=green, summer=amber, fall=orange, winter=sky) |
| **nonseasonal** | Neutral condition-based (zinc/slate/stone) |
| **google** | Light UI mode (white/blue/sky backgrounds, dark text) |
| **aurora** | Vivid (violet/fuchsia/cyan) |

Each produces a token object with: `gradient`, `text`, `textSubtle`, `textMuted`, `border`, `card`, `pillIdle`, `pillActive`, `closeBtn`, etc. — so the weather widget is fully self-theming.

---

## 5. Custom CSS Animations (`frontend/src/styles/index.css`)

| Class | Effect | Used by |
|-------|--------|---------|
| `.wx-rain` / `.wx-rain-mini` | Falling rain streaks | Weather widget |
| `.wx-cloud` / `.wx-cloud-mini` | Drifting cloud layer | Weather widget |
| `.wx-snow` / `.wx-snow-mini` | Falling snowflakes | Weather widget |
| `.wx-thunder-flash` | Lightning flash | Weather widget |
| `.animate-pulse-slow` | Slow glow pulse (sun) | Weather widget |
| `.animate-sparkle` | Twinkling particle | Weather widget |
| `.animate-wind-streak` | Horizontal wind lines | Weather widget |
| `.animate-slide-up-fade` | Card entrance | Weather card |
| `.weather-card-tilt` | 3D hover tilt | Weather card |
| `.animate-temp-roll` | Temperature counter roll-in | Weather widget |
| `.animate-clock-tick` | Clock tick scale | Weather widget |
| `.animate-cloud-bounce` | Bouncing cloud icon | Weather widget |
| `.animate-sun-rotate` | Spinning sun rays | Weather widget |
| `.animate-rain-waved` | Angled rain | Weather widget |
| `.animate-star-twinkle` | Twinkling stars (night) | Weather widget |

---

## 6. Accessibility Mode

| Mode | Trigger | Effect |
|------|---------|--------|
| High contrast | `html.high-contrast` | `bg: #000`, `color: #ffff00`, links `#00ffff` |

---

## 7. Shared Component Patterns (Tailwind utility strings)

| Pattern | Classes | Used across |
|---------|---------|-------------|
| **Card** | `rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm` | Dashboard, KPIs, calendar, settings |
| **Spinner** | `animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600` | Loading states everywhere |
| **Error banner** | `text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3` | Form errors, page errors |
| **Gradient action card** | `rounded-xl bg-gradient-to-br from-X to-Y p-5 shadow-md text-white` | KPI cards (blue, emerald, orange) |
| **Table** | `min-w-full text-sm text-left` + `divide-y divide-gray-100 dark:divide-slate-800` | Inventory, supplies, locations |

---

## 8. Known Gaps

- **No semantic tokens in `tailwind.config.cjs`** — colors are scattered as raw utilities across 50+ files.
- **No CSS custom properties** (e.g. `--color-primary`) — everything is Tailwind classes.
- **No design system layer** — changing "primary blue" requires grepping across every file.
- Tracked in [`AUDIT.md §6`](../AUDIT.md) — "Tailwind token layer is still empty."
