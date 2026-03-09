import { useState, useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'
import './App.css'

const FOCUS_TIME = 1 * 60;
const BREAK_TIME = 1 * 60;

function App() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isFocus, setIsFocus] = useState(true);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleComplete = useCallback(() => {
    setIsActive(false);
    if (isFocus) {
      triggerConfetti();
      // In a real app, we'd play a sound here too
      console.log('Focus session complete! 🎉');
    }
    // Toggle between focus and break
    const nextIsFocus = !isFocus;
    setIsFocus(nextIsFocus);
    setTimeLeft(nextIsFocus ? FOCUS_TIME : BREAK_TIME);
  }, [isFocus]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleComplete]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isFocus ? FOCUS_TIME : BREAK_TIME);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container">
      <div className="status">
        {isFocus ? '🚀 Focus Time' : '☕ Break Time'}
      </div>
      <div className="timer">
        {formatTime(timeLeft)}
      </div>
      <div className="controls">
        <button onClick={toggleTimer}>
          {isActive ? 'Pause' : 'Start Focus'}
        </button>
        <button className="secondary" onClick={resetTimer}>
          Reset
        </button>
      </div>
      {/* Visual nudge hint for Day 5 */}
      {!isActive && isFocus && timeLeft === FOCUS_TIME && (
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>
          "Focus is the art of saying no."
        </p>
      )}
    </div>
  )
}

export default App
