/** Closed-form damped spring: stable across refresh rates and long frame gaps. */
export class Spring {
  value: number; target: number; velocity = 0;
  constructor(value: number, public frequency = 3.5, public damping = 0.88) {
    if (!Number.isFinite(value) || !Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(damping) || damping < 0) throw new RangeError('A spring needs a finite value, positive frequency and nonnegative damping');
    this.value = this.target = value;
  }
  snap(value = this.target): void { this.value = this.target = value; this.velocity = 0; }
  step(seconds: number): boolean {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid spring timestep');
    const w = this.frequency * Math.PI * 2, z = this.damping, x = this.value - this.target, v = this.velocity, t = Math.min(seconds, 1);
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t), c = Math.cos(wd * t), s = Math.sin(wd * t), b = (v + z * w * x) / wd;
      this.value = this.target + e * (x * c + b * s);
      this.velocity = e * (v * c - (z * w * b + wd * x) * s);
    } else if (z === 1) {
      const b = v + w * x, e = Math.exp(-w * t);
      this.value = this.target + (x + b * t) * e; this.velocity = (v - w * b * t) * e;
    } else {
      const root = Math.sqrt(z * z - 1), r1 = -w * (z - root), r2 = -w * (z + root), a = (v - r2 * x) / (r1 - r2), b = x - a;
      this.value = this.target + a * Math.exp(r1 * t) + b * Math.exp(r2 * t);
      this.velocity = a * r1 * Math.exp(r1 * t) + b * r2 * Math.exp(r2 * t);
    }
    if (Math.abs(this.value - this.target) < 0.001 && Math.abs(this.velocity) < 0.01) { this.snap(); return false; }
    return true;
  }
}
