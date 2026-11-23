import { Spring } from './spring.js';
export interface SpringOptions { frequency?: number; damping?: number }
export interface MotionOptions { immediate?: boolean; spring?: SpringOptions }
export interface MotionResult { finished: boolean }
export const motionPresets = Object.freeze({
  responsive: Object.freeze({frequency:3.8,damping:0.88}),
  fluid: Object.freeze({frequency:3.1,damping:0.88}),
  gentle: Object.freeze({frequency:2.5,damping:0.96}),
});
export function configureSpring(spring: Spring, config?: SpringOptions): void {
  const frequency=config?.frequency ?? spring.frequency,damping=config?.damping ?? spring.damping;
  if(!Number.isFinite(frequency)||frequency<=0||!Number.isFinite(damping)||damping<0)throw new RangeError('Invalid spring configuration');
  spring.frequency=frequency;spring.damping=damping;
}
export function isResting(spring: Spring): boolean { return Math.abs(spring.value-spring.target)<0.001 && Math.abs(spring.velocity)<0.01; }
