import { useTheme } from '../../context/ThemeContext'

export function useChartTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark' || theme === 'contrast'
  return {
    dark,
    grid: dark ? '#334155' : '#e2e8f0',
    axis: dark ? '#94a3b8' : '#64748b',
    tick: dark ? '#cbd5e1' : '#475569',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    tooltipLabel: dark ? '#f1f5f9' : '#0f172a',
    fontSize: 11,
  }
}
