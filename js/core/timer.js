/**
 * Pomodoro engine. Pure timer state, no DOM — testable and restart-safe.
 */
export const MODES = {
  focus: { key: 'focus', label: 'Focus', tone: 'primary' },
  short: { key: 'short', label: 'Short break', tone: 'success' },
  long: { key: 'long', label: 'Long break', tone: 'info' },
};

const DEFAULT_DURATIONS = { focus: 25, short: 5, long: 10, longSession: 50 };

export function createTimer(durations = {}) {
  const d = { ...DEFAULT_DURATIONS, ...durations };
  return {
    durations: d,
    mode: 'focus',
    totalSeconds: d.focus * 60,
    secondsLeft: d.focus * 60,
    running: false,
    completedFocusSessions: 0,
    handle: null,
    onTick: null,
    onComplete: null,
  };
}

export function setMode(timer, mode) {
  const minutes = timer.durations[mode] ?? DEFAULT_DURATIONS.focus;
  stop(timer);
  timer.mode = mode;
  timer.totalSeconds = minutes * 60;
  timer.secondsLeft = minutes * 60;
  timer.onTick?.(timer);
  return timer;
}

export function reset(timer) {
  stop(timer);
  timer.totalSeconds = timer.durations[timer.mode] * 60;
  timer.secondsLeft = timer.totalSeconds;
  timer.onTick?.(timer);
  return timer;
}

export function start(timer) {
  if (timer.running) return timer;
  timer.running = true;
  timer.handle = setInterval(() => tick(timer), 1000);
  timer.onTick?.(timer);
  return timer;
}

export function pause(timer) {
  stop(timer);
  timer.onTick?.(timer);
  return timer;
}

export function stop(timer) {
  clearInterval(timer.handle);
  timer.handle = null;
  timer.running = false;
  return timer;
}

export function toggle(timer) {
  return timer.running ? pause(timer) : start(timer);
}

function tick(timer) {
  timer.secondsLeft -= 1;
  if (timer.secondsLeft <= 0) {
    timer.secondsLeft = 0;
    const finishedMode = timer.mode;
    stop(timer);
    if (finishedMode === 'focus') timer.completedFocusSessions += 1;
    timer.onComplete?.(finishedMode, timer);
    timer.onTick?.(timer);
    return;
  }
  timer.onTick?.(timer);
}

/** Skip the current phase and report it as complete. */
export function skip(timer) {
  const finishedMode = timer.mode;
  stop(timer);
  if (finishedMode === 'focus') timer.completedFocusSessions += 1;
  timer.onComplete?.(finishedMode, timer);
  reset(timer);
  return timer;
}

export const timerProgress = (timer) => (timer.totalSeconds ? ((timer.totalSeconds - timer.secondsLeft) / timer.totalSeconds) * 100 : 0);

export const timerMinutes = (timer) => Math.round(timer.totalSeconds / 60);

/** Next logical phase: after 4 focus blocks take a long break. */
export function nextMode(timer) {
  if (timer.mode !== 'focus') return 'focus';
  return timer.completedFocusSessions % 4 === 0 ? 'long' : 'short';
}
