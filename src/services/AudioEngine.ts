interface AudioCatalog { bgm?: string[]; jingles?: string[] }

export class AudioEngine {
  private context?: AudioContext
  private master?: GainNode
  private sources: AudioScheduledSourceNode[] = []
  private jingleBuffer?: AudioBuffer
  private volume = 0.22

  private async loadBuffer(path: string, baseUrl: string) {
    if (!this.context) return undefined
    const response = await fetch(new URL(path, `${location.origin}${baseUrl}`).toString())
    if (!response.ok) throw new Error('Audio asset unavailable')
    return this.context.decodeAudioData(await response.arrayBuffer())
  }

  private startGeneratedBed() {
    if (!this.context || !this.master) return
    ;[110, 164.81, 220].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator(); const gain = this.context!.createGain()
      oscillator.type = index === 1 ? 'triangle' : 'sine'; oscillator.frequency.value = frequency; gain.gain.value = index === 0 ? .38 : .13
      oscillator.connect(gain).connect(this.master!); oscillator.start(); this.sources.push(oscillator)
    })
  }

  async start(volume: number, baseUrl: string) {
    this.volume = volume
    this.context ??= new AudioContext()
    await this.context.resume()
    if (this.sources.length) { this.setBgmVolume(volume); return }
    this.master = this.context.createGain(); this.master.gain.value = 0; this.master.connect(this.context.destination)
    try {
      const catalogResponse = await fetch(`${baseUrl}audio/catalog.json`, { cache: 'no-store' })
      const catalog = catalogResponse.ok ? await catalogResponse.json() as AudioCatalog : {}
      const [bgmBuffer, jingleBuffer] = await Promise.all([
        catalog.bgm?.[0] ? this.loadBuffer(`audio/bgm/${catalog.bgm[0]}`, baseUrl) : undefined,
        catalog.jingles?.[0] ? this.loadBuffer(`audio/jingles/${catalog.jingles[0]}`, baseUrl) : undefined,
      ])
      this.jingleBuffer = jingleBuffer
      if (bgmBuffer) { const source = this.context.createBufferSource(); source.buffer = bgmBuffer; source.loop = true; source.connect(this.master); source.start(); this.sources.push(source) }
      else this.startGeneratedBed()
    } catch { this.startGeneratedBed() }
    this.master.gain.linearRampToValueAtTime(this.volume * .12, this.context.currentTime + 1.4)
  }

  setBgmVolume(value: number, ducked = false) {
    this.volume = value; if (!this.context || !this.master) return
    const target = value * .12 * (ducked ? .3 : 1); this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.linearRampToValueAtTime(target, this.context.currentTime + .42)
  }
  duck(active: boolean) { this.setBgmVolume(this.volume, active) }
  playJingle(volume: number) {
    if (!this.context || volume <= 0) return
    if (this.jingleBuffer) { const source = this.context.createBufferSource(); const gain = this.context.createGain(); source.buffer = this.jingleBuffer; gain.gain.value = volume; source.connect(gain).connect(this.context.destination); source.start(); return }
    ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator(); const gain = this.context!.createGain(); const start = this.context!.currentTime + index * .12
      oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume * .08, start + .03); gain.gain.exponentialRampToValueAtTime(.0001, start + .42)
      oscillator.connect(gain).connect(this.context!.destination); oscillator.start(start); oscillator.stop(start + .44)
    })
  }
  pause() { void this.context?.suspend() }
  resume() { void this.context?.resume() }
  stop() { this.sources.forEach((source) => { try { source.stop() } catch { /* already stopped */ } }); this.sources = []; this.master = undefined; this.jingleBuffer = undefined; void this.context?.close(); this.context = undefined }
}
