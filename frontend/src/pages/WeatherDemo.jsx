import React, { useState } from 'react';
import { WeatherMini } from '../features/weather/WeatherMini';
import { WeatherFull } from '../features/weather/WeatherFull';

// Sample weather data
const SAMPLE_WEATHER = {
  city: 'San Francisco, CA',
  temp: 72,
  condition: 'partly cloudy',
  main: 'Clouds',
  isDay: true,
  hourly: [
    { time: '1 PM', temp: 72 },
    { time: '2 PM', temp: 73 },
    { time: '3 PM', temp: 74 },
    { time: '4 PM', temp: 73 },
    { time: '5 PM', temp: 71 },
    { time: '6 PM', temp: 69 },
  ],
};

const MODAL_ROWS = [
  {
    dt: Date.now() / 1000 + 86400,
    temp_max: 75,
    temp_min: 62,
    weather: [{ description: 'Partly cloudy', icon: '02d' }],
    wind_speed_max: 12,
  },
  {
    dt: Date.now() / 1000 + 172800,
    temp_max: 78,
    temp_min: 65,
    weather: [{ description: 'Mostly sunny', icon: '01d' }],
    wind_speed_max: 8,
  },
  {
    dt: Date.now() / 1000 + 259200,
    temp_max: 72,
    temp_min: 60,
    weather: [{ description: 'Rainy', icon: '10d' }],
    wind_speed_max: 15,
  },
];

const EXTRA_CONTENT = {
  joke: {
    setup: 'Why did the meteorologist break up with their girlfriend?',
    punchline: 'Because the forecast said she would be gone with the wind!',
  },
  news: [
    { title: 'Climate Summit Reaches Agreement on Emissions', url: '#' },
    { title: 'New Weather Prediction Model Shows Promise', url: '#' },
  ],
  sports: [
    { title: 'Baseball Game Postponed Due to Rain', url: '#' },
  ],
};

const THEMES = ['default', 'dark', 'ocean', 'sunset'];

const Tooltip = ({ text, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
      {text}
    </div>
  </div>
);

const ControlRow = ({ label, tooltip, children }) => (
  <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
    <Tooltip text={tooltip}>
      <label className="font-medium text-slate-700">{label}</label>
    </Tooltip>
    {children}
  </div>
);

const CodePreview = ({ config }) => (
  <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
    <h4 className="mb-2 font-semibold text-slate-900">Current Config</h4>
    <pre className="overflow-x-auto text-xs text-slate-700">
      {JSON.stringify(config, null, 2)}
    </pre>
  </div>
);

export default function WeatherDemo() {
  const [showFull, setShowFull] = useState(false);
  const [theme, setTheme] = useState('default');
  const [size, setSize] = useState('normal');
  const [showLiveClock, setShowLiveClock] = useState(true);
  const [showJoke, setShowJoke] = useState(true);
  const [sceneBackground, setSceneBackground] = useState(true);
  const [scenePhotos, setScenePhotos] = useState(false);
  const [ambientAnimation, setAmbientAnimation] = useState(true);
  const [showExtraContent, setShowExtraContent] = useState(true);
  const [breakpoint, setBreakpoint] = useState('desktop');

  const miniConfig = {
    weatherThemeId: theme,
    showLiveClock,
    joke: showJoke ? EXTRA_CONTENT.joke : null,
    sceneBackground,
    scenePhotos,
    ambientAnimation,
    compact: size === 'compact',
  };

  const fullConfig = {
    weatherThemeId: theme,
    showHeaderClock: showLiveClock,
    extraContent: showExtraContent ? EXTRA_CONTENT : null,
    range: '7',
    provider: 'open-meteo',
  };

  const breakpointWidths = {
    mobile: 'w-80',
    tablet: 'w-96',
    desktop: 'w-full',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">Weather Widget Showcase</h1>
          <p className="text-lg text-slate-600">
            Interactive demo with live controls and responsive preview
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Controls Panel */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Controls</h2>

              {/* Theme Selector */}
              <ControlRow
                label="Theme"
                tooltip="Choose the visual style for weather widgets"
              >
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </ControlRow>

              {/* Size Selector */}
              <ControlRow
                label="Size"
                tooltip="Toggle between normal and compact layouts"
              >
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="compact">Compact</option>
                </select>
              </ControlRow>

              {/* Breakpoint Selector */}
              <ControlRow
                label="Breakpoint"
                tooltip="Preview at different screen sizes"
              >
                <select
                  value={breakpoint}
                  onChange={(e) => setBreakpoint(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                  <option value="desktop">Desktop</option>
                </select>
              </ControlRow>

              {/* Toggle Controls */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <label className="flex items-center gap-2">
                  <Tooltip text="Show live updating clock">
                    <input
                      type="checkbox"
                      checked={showLiveClock}
                      onChange={(e) => setShowLiveClock(e.target.checked)}
                      className="rounded"
                    />
                  </Tooltip>
                  <span className="text-sm text-slate-700">Live Clock</span>
                </label>

                <label className="flex items-center gap-2">
                  <Tooltip text="Display joke in WeatherMini">
                    <input
                      type="checkbox"
                      checked={showJoke}
                      onChange={(e) => setShowJoke(e.target.checked)}
                      className="rounded"
                    />
                  </Tooltip>
                  <span className="text-sm text-slate-700">Show Joke</span>
                </label>

                <label className="flex items-center gap-2">
                  <Tooltip text="Use photo or gradient background">
                    <input
                      type="checkbox"
                      checked={sceneBackground}
                      onChange={(e) => setSceneBackground(e.target.checked)}
                      className="rounded"
                    />
                  </Tooltip>
                  <span className="text-sm text-slate-700">Scene Background</span>
                </label>

                <label className="flex items-center gap-2">
                  <Tooltip text="Load images from public/weather-bg/">
                    <input
                      type="checkbox"
                      checked={scenePhotos}
                      onChange={(e) => setScenePhotos(e.target.checked)}
                      className="rounded"
                    />
                  </Tooltip>
                  <span className="text-sm text-slate-700">Scene Photos</span>
                </label>

                <label className="flex items-center gap-2">
                  <Tooltip text="Animated rain/cloud/sun effects">
                    <input
                      type="checkbox"
                      checked={ambientAnimation}
                      onChange={(e) => setAmbientAnimation(e.target.checked)}
                      className="rounded"
                    />
                  </Tooltip>
                  <span className="text-sm text-slate-700">Ambient Animation</span>
                </label>

                <label className="flex items-center gap-2">
                  <Tooltip text="Show joke/news/sports carousel in full modal">
                    <input
                      type="checkbox"
                      checked={showExtraContent}
                      onChange={(e) => setShowExtraContent(e.target.checked)}
                      className="rounded"
                    />
                  </Tooltip>
                  <span className="text-sm text-slate-700">Extra Content</span>
                </label>
              </div>
            </div>

            {/* Code Preview */}
            <CodePreview config={miniConfig} />
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2">
            {/* Mini Widget Preview */}
            <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-bold text-slate-900">WeatherMini Preview</h2>
              <div
                className={`flex items-center justify-center rounded-lg bg-slate-100 p-8 ${breakpointWidths[breakpoint]}`}
              >
                <WeatherMini
                  data={SAMPLE_WEATHER}
                  onOpen={() => setShowFull(true)}
                  weatherThemeId={theme}
                  showLiveClock={showLiveClock}
                  joke={showJoke ? EXTRA_CONTENT.joke : null}
                  sceneBackground={sceneBackground}
                  scenePhotos={scenePhotos}
                  ambientAnimation={ambientAnimation}
                  compact={size === 'compact'}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Breakpoint: <span className="font-semibold">{breakpoint}</span>
              </p>
            </div>

            {/* Full Widget Button & Modal */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">WeatherFull Modal</h2>
                <button
                  onClick={() => setShowFull(!showFull)}
                  className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                    showFull
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {showFull ? 'Close Modal' : 'Open Modal'}
                </button>
              </div>

              {showFull && (
                <div className="mt-4">
                  <WeatherFull
                    data={SAMPLE_WEATHER}
                    onClose={() => setShowFull(false)}
                    range="7"
                    onRangeChange={() => {}}
                    maxDays={10}
                    modalRows={MODAL_ROWS}
                    provider="open-meteo"
                    isOpenMeteo={true}
                    updatedLabel="Last updated 5 minutes ago"
                    todayDaily={{ temp_max: 75, temp_min: 62 }}
                    tempNow={72}
                    weatherThemeId={theme}
                    showHeaderClock={showLiveClock}
                    extraContent={showExtraContent ? EXTRA_CONTENT : null}
                  />
                </div>
              )}

              {!showFull && (
                <p className="mt-3 text-sm text-slate-500">
                  Click "Open Modal" to preview the full weather widget
                </p>
              )}
            </div>

            {/* Props Reference */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-slate-900">WeatherMini Props</h3>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>• <code className="font-mono">data</code>: Weather object</li>
                  <li>• <code className="font-mono">onOpen</code>: Click callback</li>
                  <li>• <code className="font-mono">weatherThemeId</code>: Theme name</li>
                  <li>• <code className="font-mono">showLiveClock</code>: Update timer</li>
                  <li>• <code className="font-mono">joke</code>: Optional joke</li>
                  <li>• <code className="font-mono">sceneBackground</code>: Use backdrop</li>
                  <li>• <code className="font-mono">scenePhotos</code>: Load images</li>
                  <li>• <code className="font-mono">ambientAnimation</code>: Effects</li>
                  <li>• <code className="font-mono">compact</code>: Size variant</li>
                </ul>
              </div>

              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-slate-900">WeatherFull Props</h3>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>• <code className="font-mono">data</code>: Full weather obj</li>
                  <li>• <code className="font-mono">onClose</code>: Modal callback</li>
                  <li>• <code className="font-mono">modalRows</code>: Forecast data</li>
                  <li>• <code className="font-mono">range</code>: '4' | '7' | 'max'</li>
                  <li>• <code className="font-mono">onRangeChange</code>: Range update</li>
                  <li>• <code className="font-mono">extraContent</code>: Carousel data</li>
                  <li>• <code className="font-mono">weatherThemeId</code>: Theme</li>
                  <li>• <code className="font-mono">showHeaderClock</code>: Clock</li>
                  <li>• <code className="font-mono">updatedLabel</code>: Last update</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
