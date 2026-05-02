import { useState, useEffect, useCallback } from 'react';

const POMODORO_FOCUS_MINUTES = 25;
const POMODORO_BREAK_MINUTES = 5;
const POMODORO_LONG_BREAK_MINUTES = 15;
const POMODORO_CYCLES = 4;

export type SessionType = 'focus' | 'break' | 'longBreak';
export type TimerMode = 'pomodoro' | 'custom';

export function useTimer(
  mode: TimerMode, 
  customFocusMinutes: number, 
  customBreakMinutes: number,
  onComplete?: (sessionType: SessionType) => void
) {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_FOCUS_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [cycle, setCycle] = useState(0);

  const getDuration = useCallback((type: SessionType) => {
    if (mode === 'custom') {
      return (type === 'focus' ? customFocusMinutes : customBreakMinutes) * 60;
    }
    switch (type) {
      case 'focus': return POMODORO_FOCUS_MINUTES * 60;
      case 'break': return POMODORO_BREAK_MINUTES * 60;
      case 'longBreak': return POMODORO_LONG_BREAK_MINUTES * 60;
      default: return POMODORO_FOCUS_MINUTES * 60;
    }
  }, [mode, customFocusMinutes, customBreakMinutes]);

  useEffect(() => {
    setSecondsLeft(getDuration(sessionType));
    setIsActive(false);
  }, [mode, customFocusMinutes, customBreakMinutes, getDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(seconds => seconds - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
      if (onComplete) onComplete(sessionType);
      
      if (sessionType === 'focus') {
        const newCycle = cycle + 1;
        setCycle(newCycle);
        const newSessionType = newCycle % POMODORO_CYCLES === 0 ? 'longBreak' : 'break';
        setSessionType(newSessionType);
        setSecondsLeft(getDuration(newSessionType));
      } else {
        if (sessionType === 'longBreak' && mode === 'pomodoro') {
          setCycle(0);
        }
        setSessionType('focus');
        setSecondsLeft(getDuration('focus'));
      }
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, sessionType, cycle, getDuration, mode, onComplete]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setSecondsLeft(getDuration(sessionType));
  };

  const skip = () => {
    if (sessionType === 'focus') {
      const newCycle = mode === 'pomodoro' ? cycle + 1 : 0;
      if (mode === 'pomodoro') setCycle(newCycle);
      const newSessionType = (mode === 'pomodoro' && newCycle % POMODORO_CYCLES === 0) ? 'longBreak' : 'break';
      setSessionType(newSessionType);
      setSecondsLeft(getDuration(newSessionType));
    } else {
      if (sessionType === 'longBreak' && mode === 'pomodoro') {
        setCycle(0);
      }
      setSessionType('focus');
      setSecondsLeft(getDuration('focus'));
    }
    setIsActive(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return { 
    secondsLeft, 
    isActive, 
    sessionType, 
    cycle, 
    minutes, 
    seconds, 
    toggle, 
    reset, 
    skip,
    POMODORO_CYCLES 
  };
}
