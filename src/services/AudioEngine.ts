export class AudioEngine {
  private context?: AudioContext
  private master?: GainNode
  private sources: OscillatorNode[] = []
  private volume = 0.22

  async start(volume: number) {
    this.volume = volume
    const AudioContextClass = window.AudioContext
    this.context ??= new AudioContextClass()
    await this.context.resume()
    if (this.sources.length) { this.setBgmVolume(volume); return }
    this.master = this.context.createGain(); this.master.gain.value = 0; this.master.connect(this.context.destination)
    ;[110, 164.81, 220].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator(); const gain = this.context!.createGain()
      oscillator.type = index === 1 ? 'triangle' : 'sine'; oscillator.frequency.value = frequency; gain.gain.value = index === 0 ? .38 : .13
      oscillator.connect(gain).connect(this.master!); oscillator.start(); this.sources.push(oscillator)
    })
    this.master.gain.linearRampToValueAtTime(this.volume * .12, this.context.currentTime + 1.4)
  }
  setBgmVolume(value: number, ducked = false) {
    this.volume = value; if (!this.context || !this.master) return
    const target = value * .12 * (ducked ? .3 : 1); this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.linearRampToValueAtTime(target, this.context.currentTime + .42)
  }
  duck(active: boolean) { this.setBgmVolume(this.volume, active) }
  playJingle(volume: number) {
    if (!this.context || volume <= 0) return
    ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator(); const gain = this.context!.createGain(); const start = this.context!.currentTime + index * .12
      oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume * .08, start + .03); gain.gain.exponentialRampToValueAtTime(.0001, start + .42)
      oscillator.connect(gain).connect(this.context!.destination); oscillator.start(start); oscillator.stop(start + .44)
    })
  }
  pause() { void this.context?.suspend() }
  resume() { void this.context?.resume() }
  stop() { this.sources.forEach((source) => { try { source.stop() } catch { /* already stopped */ } }); this.sources = []; this.master = undefined; void this.context?.close(); this.context = undefined }
}
