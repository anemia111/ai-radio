import { defaultSettings, type RadioSettings } from '../types/radio'
const KEY = 'ai-radio-settings-v1'
export function loadSettings(): RadioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<RadioSettings>
    const migrated = { ...defaultSettings, ...saved }
    if (saved.voiceSelectionVersion !== 2) Object.assign(migrated, { voiceA: '', voiceB: '', voiceSelectionVersion: 2 })
    if (saved.connectionVersion !== 1) Object.assign(migrated, { workerUrl: defaultSettings.workerUrl, provider: 'auto', connectionVersion: 1 })
    if (saved.newsFeedVersion !== 1) Object.assign(migrated, { rssUrl: defaultSettings.rssUrl, newsFeedVersion: 1 })
    return migrated
  } catch { return defaultSettings }
}
export function saveSettings(settings: RadioSettings) { try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* privacy mode or unavailable storage */ } }
