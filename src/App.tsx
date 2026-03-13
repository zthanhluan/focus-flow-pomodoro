import { useState, useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'
import './App.css'

function App() {
  const [focusMinutes, setFocusMinutes] = useState(53);
  const [breakMinutes, setBreakMinutes] = useState(7);
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60);
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
      console.log('Focus session complete! 🎉');
    }
    const nextIsFocus = !isFocus;
    setIsFocus(nextIsFocus);
    setTimeLeft(nextIsFocus ? focusMinutes * 60 : breakMinutes * 60);
  }, [isFocus, focusMinutes, breakMinutes]);

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
    setTimeLeft(isFocus ? focusMinutes * 60 : breakMinutes * 60);
  };

  const handleFocusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setFocusMinutes(val);
    if (!isActive && isFocus) {
      setTimeLeft(val * 60);
    }
  };

  const handleBreakChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setBreakMinutes(val);
    if (!isActive && !isFocus) {
      setTimeLeft(val * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container">
      <div className="settings">
        <div className="setting-item">
          <label>Focus (min)</label>
          <input 
            type="number" 
            value={focusMinutes} 
            onChange={handleFocusChange}
            min="1"
            disabled={isActive}
          />
        </div>
        <div className="setting-item">
          <label>Break (min)</label>
          <input 
            type="number" 
            value={breakMinutes} 
            onChange={handleBreakChange}
            min="1"
            disabled={isActive}
          />
        </div>
      </div>
      <div className="status">
        {isFocus ? '🚀 Focus Time' : '☕ Break Time'}
      </div>
      <div className="timer">
        {formatTime(timeLeft)}
      </div>
      <div className="controls">
        <button onClick={toggleTimer}>
          {isActive ? 'Pause' : (isFocus ? 'Start Focus' : 'Start Break')}
        </button>
        <button className="secondary" onClick={resetTimer}>
          Reset
        </button>
      </div>
      {!isActive && isFocus && timeLeft === focusMinutes * 60 && (
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>
          "Focus is the art of saying no."
        </p>
      )}
    </div>
  )
}

export default App
