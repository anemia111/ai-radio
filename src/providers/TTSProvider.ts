import type { Speaker } from '../types/radio'

export interface SpeakOptions { speaker: Speaker; voiceURI: string; volume: number; mood?: string; onStart?: () => void; onEnd?: () => void }
export interface TTSProvider { readonly name: string; readonly available: boolean; getVoices(): SpeechSynthesisVoice[]; speak(text: string, options: SpeakOptions): Promise<void>; pause(): void; resume(): void; cancel(): void }

export class BrowserSpeechProvider implements TTSProvider {
  readonly name = 'Browser Speech'
  private pending?: { resolve: () => void; finish: () => void }
  get available() { return typeof window !== 'undefined' && 'speechSynthesis' in window }
  getVoices() { return this.available ? window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('ja')).sort((a, b) => this.voiceScore(b) - this.voiceScore(a)) : [] }
  private voiceScore(voice: SpeechSynthesisVoice) {
    const name = `${voice.name} ${voice.voiceURI}`.toLowerCase()
    return (/natural|neural|online|premium/.test(name) ? 100 : 0) + (/nanami|keita|google.*日本語|google.*japanese|ayumi|haruka/.test(name) ? 50 : 0) + (!voice.localService ? 20 : 0)
  }
  private selectVoice(voiceURI: string, speaker: Speaker) {
    const voices = this.getVoices()
    return voices.find((voice) => voice.voiceURI === voiceURI) ?? voices[speaker === 'A' ? 0 : Math.min(1, voices.length - 1)]
  }
  private spokenText(text: string) {
    return text.replace(/AI/gi, 'エーアイ').replace(/F1/gi, 'エフワン').replace(/98\.7/g, 'きゅうじゅうはってんなな').replace(/([、。！？])(?=\S)/g, '$1 ')
  }
  speak(text: string, options: SpeakOptions) {
    if (!this.available) return new Promise<void>((resolve) => { options.onStart?.(); window.setTimeout(() => { options.onEnd?.(); resolve() }, Math.max(1200, text.length * 70)) })
    return new Promise<void>((resolve, reject) => {
      const finish = () => options.onEnd?.()
      this.pending = { resolve, finish }
      const utterance = new SpeechSynthesisUtterance(this.spokenText(text))
      const voice = this.selectVoice(options.voiceURI, options.speaker)
      if (voice) utterance.voice = voice
      const pace = options.mood === 'energetic' ? 0.04 : options.mood === 'midnight' || options.mood === 'calm' ? -0.04 : 0
      utterance.lang = voice?.lang ?? 'ja-JP'; utterance.volume = options.volume; utterance.rate = (options.speaker === 'A' ? 0.92 : 0.96) + pace; utterance.pitch = options.speaker === 'A' ? 0.99 : 1.01
      utterance.onstart = () => options.onStart?.()
      utterance.onend = () => { this.pending = undefined; finish(); resolve() }
      utterance.onerror = (event) => { this.pending = undefined; finish(); if (event.error === 'canceled' || event.error === 'interrupted') resolve(); else reject(new Error(event.error)) }
      window.speechSynthesis.speak(utterance)
    })
  }
  pause() { if (this.available) window.speechSynthesis.pause() }
  resume() { if (this.available) window.speechSynthesis.resume() }
  cancel() { this.pending?.finish(); this.pending?.resolve(); this.pending = undefined; if (this.available) window.speechSynthesis.cancel() }
}

export class KokoroProvider implements TTSProvider {
  readonly name = 'Kokoro'; readonly available = false
  getVoices() { return [] }
  async speak() { throw new Error('Kokoro TTS is not configured') }
  pause() {} resume() {} cancel() {}
}

export class ExternalTTSProvider implements TTSProvider {
  readonly name = 'External TTS'; readonly available = false
  getVoices() { return [] }
  async speak() { throw new Error('External TTS is not configured') }
  pause() {} resume() {} cancel() {}
}
