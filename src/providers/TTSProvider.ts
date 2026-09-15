import type { Speaker } from '../types/radio'

export interface SpeakOptions { speaker: Speaker; voiceURI: string; volume: number; onStart?: () => void; onEnd?: () => void }

export class BrowserSpeechProvider {
  private pending?: () => void
  get available() { return typeof window !== 'undefined' && 'speechSynthesis' in window }
  getVoices() { return this.available ? window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('ja')) : [] }
  speak(text: string, options: SpeakOptions) {
    if (!this.available) return new Promise<void>((resolve) => { options.onStart?.(); window.setTimeout(() => { options.onEnd?.(); resolve() }, Math.max(1200, text.length * 70)) })
    return new Promise<void>((resolve, reject) => {
      this.pending = resolve
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = window.speechSynthesis.getVoices().find((item) => item.voiceURI === options.voiceURI)
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'ja-JP'; utterance.volume = options.volume; utterance.rate = options.speaker === 'A' ? 0.96 : 1.04; utterance.pitch = options.speaker === 'A' ? 0.92 : 1.08
      utterance.onstart = () => options.onStart?.()
      utterance.onend = () => { this.pending = undefined; options.onEnd?.(); resolve() }
      utterance.onerror = (event) => { this.pending = undefined; options.onEnd?.(); if (event.error === 'canceled' || event.error === 'interrupted') resolve(); else reject(new Error(event.error)) }
      window.speechSynthesis.speak(utterance)
    })
  }
  pause() { if (this.available) window.speechSynthesis.pause() }
  resume() { if (this.available) window.speechSynthesis.resume() }
  cancel() { this.pending?.(); this.pending = undefined; if (this.available) window.speechSynthesis.cancel() }
}
