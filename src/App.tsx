import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, SkipForward, Settings, 
  CheckCircle2, Circle, Trash2, MessageCircle, 
  Sparkles, TrendingUp, Brain, Flame, Calendar,
  Loader2, Compass, ChevronDown, ChevronRight
} from 'lucide-react';
import { useTimer, SessionType, TimerMode } from './hooks/useTimer';
import { breakdownTask, getReflectiveBreather, getNavigationPlan } from './services/gemini';
import { Task, FocusSession } from './types';
import { format, isSameDay } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// --- STYLING UTILS ---
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ACCENT_COLOR = '#007AFF';

export default function App() {
  // --- DATA STATE ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    const saved = localStorage.getItem('sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [customFocus, setCustomFocus] = useState(45);
  const [customBreak, setCustomBreak] = useState(10);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [focusInsights, setFocusInsightsText] = useState<string | null>(null);
  const [isInsightsMinimized, setIsInsightsMinimized] = useState(false);
  const [inputPriority, setInputPriority] = useState(3);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }, [sessions]);

  // --- TIMER HOOK ---
  const { 
    minutes, seconds, isActive, sessionType, cycle, 
    toggle, reset, skip, POMODORO_CYCLES 
  } = useTimer(mode, customFocus, customBreak, async (type) => {
    // Session completed callback
    const sessionId = Date.now().toString();
    const sessionData: FocusSession = {
      id: sessionId,
      startTime: Date.now(),
      duration: type === 'focus' ? (mode === 'pomodoro' ? 25 : customFocus) : 5,
      type,
      taskId: activeTaskId || undefined
    };

    setSessions(prev => [sessionData, ...prev]);
      
    if (type === 'focus' && activeTaskId) {
      setTasks(prev => prev.map(t => t.id === activeTaskId ? { 
        ...t, 
        actualPomodoros: (t.actualPomodoros || 0) + 1 
      } : t));
    }
    
    if (type !== 'focus') {
      fetchBreather();
    }
  });

  // --- THEME ---
  useEffect(() => {
    const hour = new Date().getHours();
    const body = document.body;
    body.classList.remove('theme-morning', 'theme-day', 'theme-evening', 'theme-night');
    if (hour >= 6 && hour < 12) body.classList.add('theme-morning');
    else if (hour >= 12 && hour < 17) body.classList.add('theme-day');
    else if (hour >= 17 && hour < 21) body.classList.add('theme-evening');
    else body.classList.add('theme-night');
  }, []);

  // --- AI ACTIONS ---
  const fetchBreather = async () => {
    setIsAiLoading(true);
    try {
      const msg = await getReflectiveBreather("Hngoc");
      setAiMessage(msg);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSmartBreakdown = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setIsAiLoading(true);
    try {
      const breakdown = await breakdownTask(task.text);
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        estimatedPomodoros: breakdown.suggestedPomodoros,
        subTasks: breakdown.subTasks.map(st => ({ text: st.text, completed: false }))
      } : t));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleNavigationRequest = async () => {
    if (tasks.length === 0) return;
    setIsAiLoading(true);
    try {
      const plan = await getNavigationPlan(tasks, "Hngoc");
      // Remove markdown bolding (**) and ensure clean text
      const cleanPlan = plan.replace(/\*\*/g, '').trim();
      setFocusInsightsText(cleanPlan);
      setIsInsightsMinimized(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- TASK ACTIONS ---
  const addTask = async (text: string, priority: number) => {
    const taskId = Date.now().toString();
    const newTask: Task = {
      id: taskId,
      text,
      completed: false,
      priority,
      createdAt: Date.now(),
      actualPomodoros: 0
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const toggleTask = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // --- STATS CALCULATION ---
  const heatmapData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), d) && s.type === 'focus');
    return {
      day: format(d, 'EEE'),
      minutes: daySessions.reduce((acc, s) => acc + s.duration, 0),
    };
  });

  const getStreak = () => {
    if (sessions.length === 0) return 0;
    return 4; // Placeholder for streak logic
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-6xl font-black mb-12 tracking-tight text-white drop-shadow-lg text-center mt-12"
      >
        Timer for Hngoc
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* TIMER COLUMN */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <motion.div 
             layout
             className="glass-panel p-8 flex flex-col items-center justify-center relative overflow-hidden group"
          >
            {/* Settings Button */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Settings size={20} className="opacity-60" />
            </button>

            <div className="relative mb-8 text-center min-w-0">
              <motion.span 
                key={minutes + seconds}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-9xl font-extrabold tabular-nums tracking-tighter"
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </motion.span>
              <div className="mt-2 text-2xl font-semibold opacity-80 tracking-tight truncate">
                {sessionType === 'focus' ? 'Deep Work' : 'Reflective Breather'}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={reset}
                className="p-4 rounded-full glass-panel hover:bg-white/20 transition-all border-none"
              >
                <RotateCcw size={24} />
              </button>
              <button 
                onClick={toggle}
                className="w-24 h-24 rounded-full flex items-center justify-center bg-white text-blue-600 shadow-2xl transition-transform active:scale-95"
              >
                {isActive ? <Pause size={40} /> : <Play size={40} className="pl-1" />}
              </button>
              <button 
                onClick={skip}
                className="p-4 rounded-full glass-panel hover:bg-white/20 transition-all border-none"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex mt-12 glass-panel p-1 border-none rounded-full overflow-hidden">
              <button 
                onClick={() => setMode('pomodoro')}
                className={cn(
                  "px-6 py-2 rounded-full transition-all text-sm font-semibold",
                  mode === 'pomodoro' ? "bg-white text-blue-600" : "text-white/60"
                )}
              >
                Pomodoro
              </button>
              <button 
                onClick={() => setMode('custom')}
                className={cn(
                  "px-6 py-2 rounded-full transition-all text-sm font-semibold",
                  mode === 'custom' ? "bg-white text-blue-600" : "text-white/60"
                )}
              >
                Custom
              </button>
            </div>
          </motion.div>

          {/* AI Breather Panel */}
          <AnimatePresence mode="wait">
            {sessionType !== 'focus' && (
              <motion.div
                key="ai-breather"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-panel p-6 border-blue-400/30"
              >
                <div className="flex items-center gap-3 mb-3 text-blue-200">
                  <Sparkles size={20} />
                  <span className="text-sm font-bold tracking-tight">AI Reflective Breather</span>
                  {isAiLoading && <Loader2 className="animate-spin" size={14} />}
                </div>
                <p className="text-lg font-medium leading-relaxed italic">
                  {aiMessage || "Taking a moment for yourself is the smartest move you can make. Ready for some fresh perspective?"}
                </p>
                {sessionType !== 'focus' && (
                  <button 
                    onClick={fetchBreather}
                    disabled={isAiLoading}
                    className="mt-4 text-xs font-bold underline opacity-60 hover:opacity-100 disabled:opacity-30"
                  >
                    Refresh Perspective
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Focus Insights Panel */}
          <div className="glass-panel p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} />
                <h3 className="text-xl font-bold">Focus Roadmap</h3>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black">{sessions.filter(s => s.type === 'focus').length}</div>
                  <div className="text-[10px] opacity-50 font-bold">Pomos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-orange-400 flex items-center gap-1">
                    <Flame size={20} /> {getStreak()}
                  </div>
                  <div className="text-[10px] opacity-50 font-bold">Streak</div>
                </div>
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 700 }}
                  />
                  <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                    {heatmapData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.minutes > 60 ? '#60A5FA' : '#3B82F6'} 
                        opacity={0.4 + (entry.minutes / 200)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* TASK COLUMN */}
        <div className="lg:col-span-5">
          <div className="glass-panel p-6 md:p-8 h-full flex flex-col justify-center bg-white/10 border-white/20">
            <div className="flex items-center justify-center mb-8">
              <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">Task</h2>
            </div>

            {/* Task Input */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Declare your focus..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      addTask((e.target as HTMLInputElement).value, inputPriority);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition-all placeholder:text-white/30 font-semibold text-white text-lg shadow-inner"
                />
              </div>
              
              <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Priority</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => setInputPriority(p)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center",
                        inputPriority === p 
                          ? "bg-blue-500 text-white shadow-lg scale-110" 
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Task List */}
            <div className="flex-grow overflow-y-auto task-list space-y-4 pr-1 min-h-[400px]">
              <AnimatePresence initial={false} mode="popLayout">
                {tasks.length === 0 && (
                  <motion.div 
                    key="empty-tasks"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center py-20"
                  >
                    <Calendar size={64} className="mb-4 text-white" />
                    <p className="font-black tracking-tight text-sm text-white">No active tasks</p>
                  </motion.div>
                )}
                {tasks
                  .sort((a, b) => {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    if (b.priority !== a.priority) return b.priority - a.priority;
                    return b.createdAt - a.createdAt;
                  })
                  .map(task => {
                    const subtasksDone = task.subTasks?.filter(st => st.completed).length || 0;
                    const subtasksTotal = task.subTasks?.length || 0;
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={task.id}
                        onClick={() => {
                          if (activeTaskId === task.id) {
                            toggleTask(task.id);
                          } else {
                            setActiveTaskId(task.id);
                          }
                        }}
                        className={cn(
                          "p-6 rounded-[2rem] glass-panel group relative transition-all border border-white/10 cursor-pointer hover:border-white/20",
                          activeTaskId === task.id 
                            ? "bg-white text-blue-950 border-white scale-[1.02]" 
                            : "bg-black/20 text-white hover:bg-black/30"
                        )}
                      >
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                            className={cn(
                              "flex-shrink-0 transition-all active:scale-90 w-6 h-6 flex items-center justify-center",
                              activeTaskId === task.id ? "text-blue-600" : "text-white/60 hover:text-white"
                            )}
                          >
                            {task.completed ? (
                              <CheckCircle2 size={24} className={cn(activeTaskId === task.id ? "text-blue-600" : "text-green-400")} />
                            ) : (
                              <Circle size={24} className="opacity-60" />
                            )}
                          </button>
                          
                          <div className="min-w-0">
                            <div 
                              className={cn(
                                "font-black text-xl leading-tight transition-all tracking-tight",
                                task.completed && "line-through opacity-40 font-bold"
                              )}
                            >
                              {task.text}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-3 block">
                              <div className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                                activeTaskId === task.id ? "bg-blue-900/10 text-blue-900" : "bg-black/40 text-white shadow-sm"
                              )}>
                                PRIORITY {task.priority}
                              </div>
                              
                              {(task.estimatedPomodoros || subtasksTotal > 0) && (
                                <div className="flex items-center gap-2">
                                  {task.estimatedPomodoros && (
                                    <div className={cn(
                                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                      activeTaskId === task.id ? "bg-blue-600/10 text-blue-600" : "bg-blue-500/20 text-blue-200"
                                    )}>
                                      <Brain size={12} /> {task.actualPomodoros || 0} / {task.estimatedPomodoros}
                                    </div>
                                  )}

                                  {subtasksTotal > 0 && (
                                    <div className={cn(
                                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                      activeTaskId === task.id ? "bg-blue-900/5 text-blue-900/60" : "bg-white/10 text-white/50"
                                    )}>
                                      {subtasksDone} / {subtasksTotal} Steps
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                            className={cn(
                              "p-2.5 rounded-2xl transition-all opacity-0 group-hover:opacity-100 active:scale-90 flex-shrink-0",
                              activeTaskId === task.id 
                                ? "bg-red-50 text-red-500 hover:bg-red-100" 
                                : "bg-red-500/10 text-red-300 hover:bg-red-500/30"
                            )}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {/* Subtasks */}
                        {task.subTasks && task.subTasks.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "mt-6 pl-11 space-y-3 border-l-2",
                              activeTaskId === task.id ? "border-blue-600/20" : "border-white/10"
                            )}
                          >
                            {task.subTasks.map((st, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm font-bold opacity-70 group/sub">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  activeTaskId === task.id ? "bg-blue-600/40" : "bg-blue-400/30"
                                )} />
                                <span className={cn(activeTaskId === task.id ? "text-blue-900/80" : "text-white/80")}>
                                  {st.text}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>

            {/* AI Insight Section */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <AnimatePresence mode="wait">
                {focusInsights && (
                  <motion.div 
                    key="navigation-plan"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="glass-panel bg-black/40 border-white/10 rounded-[2rem] overflow-hidden">
                      <button 
                        onClick={() => setIsInsightsMinimized(!isInsightsMinimized)}
                        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors group/header"
                      >
                        <div className="flex items-center gap-2 text-blue-400 not-italic font-black text-[10px] uppercase tracking-[0.2em] opacity-90">
                           <Compass size={12} className={cn("transition-transform duration-500", !isInsightsMinimized && "animate-pulse")} /> 
                           Strategic Intent
                        </div>
                        <div className="text-white/60 group-hover/header:text-white/100 transition-colors bg-white/5 p-1 rounded-full border border-white/10 group-hover/header:border-white/20">
                          {isInsightsMinimized ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {!isInsightsMinimized && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <div className="px-6 pb-6 mt-[-1rem]">
                              <div className="whitespace-pre-wrap bg-black/50 p-5 rounded-2xl border border-white/10 font-bold text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-md leading-relaxed text-sm">
                                {focusInsights}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={handleNavigationRequest}
                disabled={isAiLoading || tasks.length === 0}
                className="w-full p-5 glass-panel bg-blue-950/40 border-blue-400/20 flex items-center justify-center gap-3 hover:bg-blue-900/60 transition-all shadow-lg active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-transparent group"
              >
                {isAiLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Compass size={20} className="text-blue-300 group-hover:rotate-90 transition-transform duration-500" />
                )}
                <span className="font-black text-sm tracking-tight text-blue-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Navigate Productivity</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel p-8 max-w-md w-full border-white/20"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">Timer Settings</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-white/40 mb-3">Custom Focus (min)</label>
                  <input 
                    type="range" min="1" max="120" step="1"
                    value={customFocus}
                    onChange={(e) => setCustomFocus(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-2 text-sm font-sans">
                    <span className="opacity-40">1m</span>
                    <span className="text-blue-400 font-black tracking-tight">{customFocus}m</span>
                    <span className="opacity-40">120m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white/40 mb-3">Custom Break (min)</label>
                  <input 
                    type="range" min="1" max="60" step="1"
                    value={customBreak}
                    onChange={(e) => setCustomBreak(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-2 text-sm font-sans">
                    <span className="opacity-40">1m</span>
                    <span className="text-blue-400 font-black tracking-tight">{customBreak}m</span>
                    <span className="opacity-40">60m</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full mt-12 py-4 bg-white text-blue-600 font-black tracking-tight text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
              >
                Save Protocol
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

