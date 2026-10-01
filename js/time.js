// Time engine: holds the simulated instant and drives playback.

import { DAY_MS, J2000_MS } from './config.js?v=10';

export class TimeEngine {
  constructor() {
    const now = Date.now();
    this.min = Date.UTC(1900, 0, 1);
    this.max = Date.UTC(2300, 0, 1);
    this.current = now;
    this.playing = false;
    // Simulated days advanced per real second.
    this.speed = 1;
    this._listeners = new Set();
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit() {
    for (const fn of this._listeners) fn(this.current);
  }

  set(ms) {
    this.current = Math.min(this.max, Math.max(this.min, ms));
    this._emit();
  }

  setDaysFromJ2000(days) {
    this.set(J2000_MS + days * DAY_MS);
  }

  now() {
    this.set(Date.now());
  }

  play() {
    this.playing = true;
    this._emit();
  }

  pause() {
    this.playing = false;
    this._emit();
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  setSpeed(daysPerSecond) {
    this.speed = daysPerSecond;
    this._emit();
  }

  // dt in seconds since the previous frame.
  update(dt) {
    if (!this.playing) return;
    this.set(this.current + dt * this.speed * DAY_MS);
  }

  get fraction() {
    return (this.current - this.min) / (this.max - this.min);
  }
}
