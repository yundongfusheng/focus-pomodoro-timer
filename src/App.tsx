import { useState, useEffect, useRef } from 'react'
import './App.css'

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
  const autoRestartRef = useRef(false)

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

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

  useEffect(() => {
    if (!autoRestartRef.current || isRunning) return
    autoRestartRef.current = false
    setIsRunning(true)
  }, [isRunning, timeLeft])

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(false), 800)
    return () => clearTimeout(id)
  }, [flash])

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
  }

  const handleReset = () => {
    autoRestartRef.current = false
    setIsRunning(false)
    setTimeLeft(isFocus ? FOCUS_DURATION : BREAK_DURATION)
  }

  const cyclePos = completedPomodoros % 4
  const filledDots = completedPomodoros > 0 && cyclePos === 0 ? 4 : cyclePos

  const phaseClass = flash ? 'flash' : isFocus ? 'focus' : 'break'

  return (
    <div className={`app-shell ${phaseClass}`}>
      <span className={`phase-badge ${isFocus ? 'focus' : 'break'}`}>
        {isFocus ? '专注' : '休息'}
      </span>

      <div className={`timer-display ${phaseClass}`}>{formatTime(timeLeft)}</div>

      <div className="progress-track">
        <div
          className={`progress-fill ${isFocus ? 'focus' : 'break'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="controls">
        <button
          onClick={handleReset}
          aria-label="重置"
          title="重置"
          className="icon-button"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          onClick={handleStartPause}
          className={`start-button ${isFocus ? 'focus' : 'break'}`}
        >
          {startLabel}
        </button>

        <button
          onClick={handleSkip}
          aria-label="跳过"
          title="跳过"
          className="icon-button"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      <div className="pomodoro-stats">
        <p className="stats-label">已完成番茄钟</p>
        <div className="dot-row">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`dot ${
                i < filledDots
                  ? isFocus
                    ? 'focus'
                    : 'break'
                  : 'empty'
              }`}
            />
          ))}
        </div>
        <p className="stats-number">{completedPomodoros}</p>
      </div>
    </div>
  )
}
