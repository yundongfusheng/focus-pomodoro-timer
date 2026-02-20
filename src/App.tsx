import { useState, useEffect, useRef } from 'react'

type Phase = 'focus' | 'break'

const FOCUS_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

function playBeep() {
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime
    const beep = (freq: number, start: number, end: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, t + start)
      gain.gain.exponentialRampToValueAtTime(0.001, t + end)
      osc.start(t + start)
      osc.stop(t + end)
    }
    beep(880, 0, 0.15)
    beep(1100, 0.18, 0.33)
    beep(880, 0.36, 0.6)
  } catch {
    // AudioContext not available
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('focus')
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [flash, setFlash] = useState(false)
  // Signal to auto-restart after a phase transition
  const autoRestartRef = useRef(false)

  // Countdown interval — recreated whenever isRunning toggles
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Detect natural timer expiry → switch phase
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return

    setIsRunning(false)
    autoRestartRef.current = true
    playBeep()
    setFlash(true)

    if (phase === 'focus') {
      setPhase('break')
      setTimeLeft(BREAK_DURATION)
    } else {
      setCompletedPomodoros(c => c + 1)
      setPhase('focus')
      setTimeLeft(FOCUS_DURATION)
    }
  }, [timeLeft, isRunning, phase])

  // Auto-start next phase after the state from the transition settles
  useEffect(() => {
    if (!autoRestartRef.current || isRunning) return
    autoRestartRef.current = false
    setIsRunning(true)
  }, [isRunning, timeLeft])

  // Clear flash after 800 ms
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(false), 800)
    return () => clearTimeout(id)
  }, [flash])

  // Keep document title in sync
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} · ${phase === 'focus' ? '专注' : '休息'} | 番茄钟`
  }, [timeLeft, phase])

  const isFocus = phase === 'focus'
  const initialDuration = isFocus ? FOCUS_DURATION : BREAK_DURATION
  const progress = ((initialDuration - timeLeft) / initialDuration) * 100
  const startLabel = isRunning ? '暂停' : timeLeft === initialDuration ? '开始' : '继续'

  const handleStartPause = () => setIsRunning(r => !r)

  const handleSkip = () => {
    autoRestartRef.current = false
    if (phase === 'focus') {
      setPhase('break')
      setTimeLeft(BREAK_DURATION)
    } else {
      setPhase('focus')
      setTimeLeft(FOCUS_DURATION)
    }
    // keep isRunning as-is: if already running, new phase starts immediately
  }

  const handleReset = () => {
    autoRestartRef.current = false
    setIsRunning(false)
    setTimeLeft(isFocus ? FOCUS_DURATION : BREAK_DURATION)
  }

  // Pomodoro dots: 4 slots representing current group
  const cyclePos = completedPomodoros % 4
  const filledDots = completedPomodoros > 0 && cyclePos === 0 ? 4 : cyclePos

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 ${
        flash ? 'bg-amber-50' : isFocus ? 'bg-rose-50' : 'bg-teal-50'
      }`}
    >
      {/* Phase badge */}
      <span
        className={`mb-8 px-5 py-1.5 rounded-full text-sm font-semibold tracking-[0.15em] uppercase transition-colors duration-500 ${
          isFocus ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'
        }`}
      >
        {isFocus ? '专注' : '休息'}
      </span>

      {/* Timer */}
      <div
        className={`text-8xl sm:text-9xl font-mono font-bold tabular-nums leading-none mb-8 select-none transition-colors duration-500 ${
          flash ? 'text-amber-400' : isFocus ? 'text-rose-500' : 'text-teal-500'
        }`}
      >
        {formatTime(timeLeft)}
      </div>

      {/* Progress bar */}
      <div className="w-72 h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            isFocus ? 'bg-rose-400' : 'bg-teal-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-12">
        {/* Reset */}
        <button
          onClick={handleReset}
          aria-label="重置"
          title="重置"
          className="w-11 h-11 rounded-full bg-white shadow hover:shadow-md text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        {/* Start / Pause / Continue */}
        <button
          onClick={handleStartPause}
          className={`w-20 h-20 rounded-full text-white text-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 ${
            isFocus ? 'bg-rose-500 hover:bg-rose-600' : 'bg-teal-500 hover:bg-teal-600'
          }`}
        >
          {startLabel}
        </button>

        {/* Skip */}
        <button
          onClick={handleSkip}
          aria-label="跳过"
          title="跳过"
          className="w-11 h-11 rounded-full bg-white shadow hover:shadow-md text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      {/* Completed pomodoros */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">已完成番茄钟</p>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors duration-300 ${
                i < filledDots
                  ? isFocus
                    ? 'bg-rose-400 border-rose-400'
                    : 'bg-teal-400 border-teal-400'
                  : 'border-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-3xl font-bold text-gray-700">{completedPomodoros}</p>
      </div>
    </div>
  )
}
