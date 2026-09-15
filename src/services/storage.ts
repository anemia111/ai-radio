import { defaultSettings, type RadioSettings } from '../types/radio'
const KEY = 'ai-radio-settings-v1'
export function loadSettings(): RadioSettings { try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } as RadioSettings } catch { return defaultSettings } }
export function saveSettings(settings: RadioSettings) { try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* privacy mode or unavailable storage */ } }
