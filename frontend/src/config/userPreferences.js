/** Labels for Settings UI — must match backend enums */

export const WEATHER_THEME_OPTIONS = [
  { id: 'default', label: 'Default', hint: 'Classic sky gradients by condition' },
  {
    id: 'seasonal',
    label: 'Seasonal',
    hint: 'Palette matches the current meteorological season (Northern Hemisphere, your device date)',
  },
  { id: 'nonseasonal', label: 'Non-seasonal', hint: 'Neutral stone/slate; subtle weather hints' },
  { id: 'google', label: 'Google Weather', hint: 'Soft Material-style light cards (dark at night)' },
  { id: 'aurora', label: 'Aurora', hint: 'Violet, teal, and fuchsia glow' },
]

export const DASHBOARD_ACCENT_OPTIONS = [
  { id: 'teal', label: 'Teal' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'violet', label: 'Violet' },
  { id: 'ember', label: 'Ember' },
  { id: 'forest', label: 'Forest' },
  { id: 'slate', label: 'Slate' },
]
