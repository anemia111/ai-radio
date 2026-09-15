import { defaultSettings, type RadioSettings } from '../types/radio'
const KEY = 'ai-radio-settings-v1'
export function loadSettings(): RadioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<RadioSettings>
    if (saved.voiceSelectionVersion !== 2) return { ...defaultSettings, ...saved, voiceA: '', voiceB: '', voiceSelectionVersion: 2 }
    return { ...defaultSettings, ...saved }
  } catch { return defaultSettings }
}
export function saveSettings(settings: RadioSettings) { try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* privacy mode or unavailable storage */ } }
