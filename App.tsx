import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TimerMode, SessionType } from './types';

// --- CONSTANTS ---
const ACCENT_COLOR = '#007AFF';
const POMODORO_FOCUS_MINUTES = 25;
const POMODORO_BREAK_MINUTES = 5;
const POMODORO_LONG_BREAK_MINUTES = 15;
const POMODORO_CYCLES = 4;

// --- ICONS ---
const GearIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.03.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.748 1.295 2.538 0 3.286L8.029 20.99c-1.25.72-2.779-.217-2.779-1.643V5.653z" />
    </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-6-13.5v13.5" />
    </svg>
);

const ResetIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
);

const SkipIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
    </svg>
);


// --- HOOKS ---
function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

function useTimer(
    mode: TimerMode, 
    customFocusMinutes: number, 
    customBreakMinutes: number
) {
    const [secondsLeft, setSecondsLeft] = useState(POMODORO_FOCUS_MINUTES * 60);
    const [isActive, setIsActive] = useState(false);
    const [sessionType, setSessionType] = useState<SessionType>('focus');
    const [cycle, setCycle] = useState(0);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    
    const getDuration = useCallback((type: SessionType) => {
        if (mode === 'custom') {
            return (type === 'focus' ? customFocusMinutes : customBreakMinutes) * 60;
        }
        switch(type) {
            case 'focus': return POMODORO_FOCUS_MINUTES * 60;
            case 'break': return POMODORO_BREAK_MINUTES * 60;
            case 'longBreak': return POMODORO_LONG_BREAK_MINUTES * 60;
            default: return POMODORO_FOCUS_MINUTES * 60;
        }
    }, [mode, customFocusMinutes, customBreakMinutes]);

    useEffect(() => {
        setSecondsLeft(getDuration(sessionType));
        setIsActive(false);
    }, [mode, customFocusMinutes, customBreakMinutes]);


    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isActive && secondsLeft > 0) {
            interval = setInterval(() => {
                setSecondsLeft(seconds => seconds - 1);
            }, 1000);
        } else if (isActive && secondsLeft === 0) {
            if (sessionType === 'focus') {
                const newCycle = cycle + 1;
                setCycle(newCycle);
                const newSessionType = newCycle % POMODORO_CYCLES === 0 ? 'longBreak' : 'break';
                setSessionType(newSessionType);
                setSecondsLeft(getDuration(newSessionType));
            } else { // break or longBreak
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
    }, [isActive, secondsLeft, sessionType, cycle, getDuration, mode]);

    useEffect(() => {
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const sessionName = sessionType === 'focus' ? 'Focus' : 'Break';
        document.title = `${timeString} - ${sessionName} | Timer for Hngoc`;
    }, [secondsLeft, sessionType, minutes, seconds]);
    
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

    return { secondsLeft, isActive, sessionType, cycle, minutes, seconds, toggle, reset, skip };
}

// --- COMPONENTS ---
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFocusMinutes: number;
    initialBreakMinutes: number;
    onSave: (focus: number, breakTime: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialFocusMinutes, initialBreakMinutes, onSave }) => {
    const [focusMinutes, setFocusMinutes] = useState(initialFocusMinutes);
    const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);
    
    useEffect(() => {
        setFocusMinutes(initialFocusMinutes);
        setBreakMinutes(initialBreakMinutes);
    }, [isOpen, initialFocusMinutes, initialBreakMinutes]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(focusMinutes, breakMinutes);
        onClose();
    };

    const TimeAdjuster: React.FC<{ label: string; value: number; setValue: React.Dispatch<React.SetStateAction<number>> }> = ({ label, value, setValue }) => (
        <div className="flex flex-col items-center">
            <label className="text-white/80 mb-2">{label}</label>
            <div className="flex items-center space-x-4">
                <button onClick={() => setValue(v => Math.max(1, v - 1))} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white font-bold text-2xl transition-transform hover:scale-110">-</button>
                <span className="text-white font-black text-5xl w-24 text-center tabular-nums">{value}</span>
                <button onClick={() => setValue(v => v + 1)} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white font-bold text-2xl transition-transform hover:scale-110">+</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="glass-panel p-8 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white text-center mb-8">Custom Timer Settings</h2>
                <div className="space-y-8 mb-10">
                    <TimeAdjuster label="Focus Minutes" value={focusMinutes} setValue={setFocusMinutes} />
                    <TimeAdjuster label="Break Minutes" value={breakMinutes} setValue={setBreakMinutes} />
                </div>
                <button 
                    onClick={handleSave}
                    style={{ backgroundColor: ACCENT_COLOR }} 
                    className="w-full text-white font-bold py-3 px-4 rounded-xl text-lg transition-transform hover:scale-105"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};


interface TasksPanelProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TasksPanel: React.FC<TasksPanelProps> = ({ tasks, setTasks }) => {
    const [newTaskText, setNewTaskText] = useState('');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            setTasks(prev => [...prev, { id: Date.now(), text: newTaskText.trim(), completed: false }]);
            setNewTaskText('');
        }
    };
    
    const toggleTask = (id: number) => {
        setTasks(prev => prev.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    };

    const deleteTask = (id: number) => {
        setTasks(prev => prev.filter(task => task.id !== id));
    };

    return (
        <div className="glass-panel p-6 flex flex-col w-full h-[30rem]">
            <h2 className="text-white text-2xl font-bold mb-4 text-center">Tasks</h2>
            <form onSubmit={handleAddTask} className="flex mb-4">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-grow bg-white/10 text-white placeholder-white/50 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[${ACCENT_COLOR}]"
                />
                <button type="submit" style={{ backgroundColor: ACCENT_COLOR }} className="text-white font-bold px-4 rounded-r-lg">Add</button>
            </form>
            <div className="flex-grow overflow-y-auto task-list pr-2">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg mb-2 group">
                        <div className="flex items-center">
                            <button 
                                onClick={() => toggleTask(task.id)}
                                aria-pressed={task.completed}
                                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent`}
                                style={{ 
                                    borderColor: task.completed ? ACCENT_COLOR : 'rgba(255,255,255,0.4)',
                                    ringColor: ACCENT_COLOR
                                }}
                            >
                                {task.completed && <CheckIcon className="w-3 h-3" style={{ color: ACCENT_COLOR }} />}
                            </button>
                            <span className={`ml-3 text-white ${task.completed ? 'line-through text-white/50' : ''}`}>{task.text}</span>
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="text-white/50 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface TimerPanelProps {
    mode: TimerMode;
    setMode: (mode: TimerMode) => void;
    onOpenSettings: () => void;
    customFocusMinutes: number;
    customBreakMinutes: number;
}

const TimerPanel: React.FC<TimerPanelProps> = ({ mode, setMode, onOpenSettings, customFocusMinutes, customBreakMinutes }) => {
    const { secondsLeft, isActive, sessionType, cycle, minutes, seconds, toggle, reset, skip } = useTimer(mode, customFocusMinutes, customBreakMinutes);

    const ModeSwitcher = () => (
        <div className="relative w-full max-w-xs mx-auto p-1 rounded-full bg-white/10 flex">
            <div 
                className="absolute top-0 left-0 h-full w-1/2 p-1 transition-transform duration-300 ease-in-out"
                style={{ transform: mode === 'custom' ? 'translateX(100%)' : 'translateX(0%)' }}
            >
                <div style={{ backgroundColor: ACCENT_COLOR }} className="w-full h-full rounded-full"></div>
            </div>
            <button onClick={() => setMode('pomodoro')} className="relative flex-1 py-2 text-center font-medium z-10" >
                <span className={mode === 'pomodoro' ? 'text-white' : 'text-white/70'}>Pomodoro</span>
            </button>
            <button onClick={() => setMode('custom')} className="relative flex-1 py-2 text-center font-medium z-10">
                <span className={mode === 'custom' ? 'text-white' : 'text-white/70'}>Custom</span>
            </button>
        </div>
    );

    const PomodoroDots = () => (
        <div className="flex justify-center space-x-2">
            {Array.from({ length: POMODORO_CYCLES }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < cycle ? 'bg-white' : 'bg-white/30'}`}></div>
            ))}
        </div>
    );

    return (
        <div className="glass-panel p-6 flex flex-col items-center justify-between w-full h-[30rem]">
            <ModeSwitcher />

            <div className="flex-grow flex flex-col items-center justify-center">
                 <div className="relative">
                    <p className="text-8xl md:text-9xl font-bold tabular-nums tracking-tighter">
                        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                    </p>
                    {mode === 'custom' && (
                        <button onClick={onOpenSettings} className="absolute -top-2 -right-8 text-white/70 hover:text-white transition-colors">
                            <GearIcon className="w-6 h-6" />
                        </button>
                    )}
                 </div>
                <p className="text-xl font-medium text-white/80 mt-2 capitalize">{sessionType === 'longBreak' ? 'Long Break' : sessionType}</p>
            </div>
            
            <div className="w-full">
                <div className="h-10 mb-4 flex items-center justify-center">
                    {mode === 'pomodoro' && <PomodoroDots />}
                </div>
                <div className="flex items-center justify-center space-x-6">
                    <button onClick={reset} title="Reset Timer" className="glass-panel rounded-full w-16 h-16 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95">
                        <ResetIcon className="w-8 h-8" />
                    </button>
                    <button 
                        onClick={toggle}
                        title={isActive ? 'Pause' : 'Start'}
                        className="rounded-full w-24 h-24 flex items-center justify-center text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-100"
                        style={{ backgroundColor: ACCENT_COLOR }}
                    >
                        {isActive ? <PauseIcon className="w-12 h-12" /> : <PlayIcon className="w-12 h-12" />}
                    </button>
                    <button onClick={skip} title="Skip Session" className="glass-panel rounded-full w-16 h-16 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95">
                        <SkipIcon className="w-8 h-8" />
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- APP ---
export default function App() {
    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
    const [mode, setMode] = useLocalStorage<TimerMode>('timerMode', 'pomodoro');
    const [customFocusMinutes, setCustomFocusMinutes] = useLocalStorage<number>('customFocusMinutes', 45);
    const [customBreakMinutes, setCustomBreakMinutes] = useLocalStorage<number>('customBreakMinutes', 10);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

    useEffect(() => {
        const hour = new Date().getHours();
        const body = document.body;
        body.classList.remove('theme-morning', 'theme-day', 'theme-evening', 'theme-night');

        if (hour >= 6 && hour < 12) { // Morning: 6 AM - 11 AM
            body.classList.add('theme-morning');
        } else if (hour >= 12 && hour < 17) { // Daytime: 12 PM - 4 PM
            body.classList.add('theme-day');
        } else if (hour >= 17 && hour < 21) { // Evening: 5 PM - 8 PM
            body.classList.add('theme-evening');
        } else { // Night: 9 PM - 5 AM
            body.classList.add('theme-night');
        }
    }, []);
    
    const handleSaveSettings = (focus: number, breakTime: number) => {
        setCustomFocusMinutes(focus);
        setCustomBreakMinutes(breakTime);
    };

    return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
            <h1 className="text-4xl sm:text-5xl font-semibold my-8 text-center" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                Timer for Hngoc
            </h1>
            <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
                <TimerPanel 
                    mode={mode}
                    setMode={setMode}
                    onOpenSettings={() => setSettingsModalOpen(true)}
                    customFocusMinutes={customFocusMinutes}
                    customBreakMinutes={customBreakMinutes}
                />
                <TasksPanel tasks={tasks} setTasks={setTasks} />
            </main>
            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                initialFocusMinutes={customFocusMinutes}
                initialBreakMinutes={customBreakMinutes}
                onSave={handleSaveSettings}
            />
        </div>
    );
}