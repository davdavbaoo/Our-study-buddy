
export interface Task {
  id: number;
  text: string;
  completed: boolean;
}

export type TimerMode = 'pomodoro' | 'custom';
export type SessionType = 'focus' | 'break' | 'longBreak';
