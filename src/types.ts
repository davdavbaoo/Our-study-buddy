export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: number; // 1-5, where 5 is highest
  estimatedPomodoros?: number;
  actualPomodoros?: number;
  subTasks?: { text: string; completed: boolean }[];
  createdAt: number;
}

export interface FocusSession {
  id: string;
  startTime: number;
  duration: number; // in minutes
  type: 'focus' | 'break' | 'longBreak';
  taskId?: string;
}

export interface UserStats {
  streak: number;
  lastActive: number;
  totalFocusTime: number;
  dailyGoal: number;
}
