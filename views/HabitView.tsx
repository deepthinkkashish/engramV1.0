import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { MapPin, Calendar as CalendarIcon, BarChart2, Plus, ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react';
import { Habit } from '../types';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';

export const HabitTrackerView: React.FC = () => {
    const { habits, setHabits } = useUser();
    const { currentTheme: themeColor } = useSettings();
    
    const [newHabitName, setNewHabitName] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const { displayDates } = useMemo(() => {
        const display = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            display.push({
                fullDate: date.toISOString().split('T')[0],
                dayName: days[date.getDay()],
                isToday: i === 0
            });
        }
        return { displayDates: display };
    }, []);

    const toggleHabit = (habitId: string, date: string) => {
        const updatedHabits = habits.map(h => {
            if (h.id === habitId) {
                const isCompleted = h.completedDates.includes(date);
                const newDates = isCompleted 
                    ? h.completedDates.filter(d => d !== date)
                    : [...h.completedDates, date];
                return { ...h, completedDates: newDates };
            }
            return h;
        });
        setHabits(updatedHabits);
    };

    const addHabit = () => {
        if (!newHabitName.trim()) return;
        const newHabit: Habit = {
            id: Date.now().toString(),
            name: newHabitName.trim(),
            completedDates: []
        };
        setHabits([...habits, newHabit]);
        setNewHabitName('');
        setShowInput(false);
    };

    const deleteHabit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
             setHabits(habits.filter(h => h.id !== id));
        }
    }

    const changeMonth = (offset: number) => {
        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1));
    };

    const getCalendarCells = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        return cells;
    };

    return (
        <div className="p-4 space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h1 className={`text-3xl font-bold text-${themeColor}-800 dark:text-${themeColor}-200 flex items-center`}>
                    <MapPin className="mr-2" /> Habits
                </h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                        className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition`}
                        title="Toggle View"
                    >
                        {viewMode === 'week' ? <CalendarIcon size={20} /> : <BarChart2 size={20} />}
                    </button>
                    <button 
                        onClick={() => setShowInput(!showInput)}
                        className={`p-2 rounded-full bg-${themeColor}-100 dark:bg-${themeColor}-900 text-${themeColor}-600 dark:text-${themeColor}-300 hover:bg-${themeColor}-200 transition`}
                    >
                        <Plus size={20} />
                    </button>
                </div>
             </div>

             {showInput && (
                <Card className="p-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
                    <input 
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                        placeholder="Enter habit name..."
                        className="flex-1 p-2 border rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
                        autoFocus
                    />
                    <button 
                        onClick={addHabit}
                        className={`bg-${themeColor}-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-${themeColor}-600`}
                    >
                        Add
                    </button>
                </Card>
             )}

            {viewMode === 'month' && (
                <Card className="p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)}><ChevronLeft size={20} className="text-gray-400"/></button>
                        <span className="font-bold text-gray-800 dark:text-white">
                            {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)}><ChevronRight size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {getCalendarCells().map((day, idx) => {
                            if (!day) return <div key={idx}></div>;
                            const dateObj = new Date(Date.UTC(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
                            const dateStr = dateObj.toISOString().split('T')[0];
                            const completedCount = habits.filter(h => h.completedDates.includes(dateStr)).length;
                            const isSelected = selectedCalendarDate.toISOString().split('T')[0] === dateStr;
                            
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedCalendarDate(dateObj)}
                                    className={`aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition relative
                                        ${isSelected ? `bg-${themeColor}-100 dark:bg-${themeColor}-900/40 ring-2 ring-${themeColor}-500` : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                                    `}
                                >
                                    <span className={`text-sm ${isSelected ? `font-bold text-${themeColor}-700 dark:text-${themeColor}-300` : 'text-gray-700 dark:text-gray-300'}`}>{day}</span>
                                    {completedCount > 0 && (
                                        <div className="flex space-x-0.5 mt-1">
                                            {[...Array(Math.min(completedCount, 3))].map((_, i) => (
                                                <div key={i} className={`w-1 h-1 rounded-full bg-${themeColor}-500`}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            <Card className="p-6">
                {habits.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        No habits added yet. Tap + to start tracking!
                    </div>
                ) : (
                    <div className="space-y-6">
                        {viewMode === 'month' && (
                            <div className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                {selectedCalendarDate.toDateString() === new Date().toDateString() ? "Today's Habits" : `Habits for ${selectedCalendarDate.toLocaleDateString()}`}
                            </div>
                        )}
                        
                        {habits.map(habit => {
                            if (viewMode === 'month') {
                                const targetDateStr = selectedCalendarDate.toISOString().split('T')[0];
                                const isDone = habit.completedDates.includes(targetDateStr);
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isEditable = targetDateStr === todayStr;

                                return (
                                    <div key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{habit.name}</span>
                                        <div className="flex items-center space-x-3">
                                            <button 
                                                onClick={() => isEditable && toggleHabit(habit.id, targetDateStr)}
                                                disabled={!isEditable}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${isDone ? `bg-${themeColor}-500 text-white` : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-300'} ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {isDone && <Check size={20} strokeWidth={3} />}
                                            </button>
                                            {/* Delete button removed in Calendar view to prevent accidental history loss */}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={habit.id} className="flex flex-col space-y-3 pb-4 border-b last:border-0 border-gray-100 dark:border-gray-700 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-lg">{habit.name}</span>
                                        <button 
                                            onClick={(e) => deleteHabit(e, habit.id)} 
                                            className="p-2 -mr-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition outline-none focus:outline-none"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl">
                                        {displayDates.map((item, index) => {
                                            const isCompleted = habit.completedDates.includes(item.fullDate);
                                            const isClickable = item.isToday;

                                            return (
                                                <div key={item.fullDate} className="flex flex-col items-center space-y-1">
                                                    <span className={`text-[10px] font-bold ${item.isToday ? `text-${themeColor}-600 dark:text-${themeColor}-400` : 'text-gray-400'}`}>{item.dayName}</span>
                                                    <button 
                                                        onClick={() => (item.isToday || isCompleted) && toggleHabit(habit.id, item.fullDate)} 
                                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${isCompleted ? `bg-${themeColor}-500 text-white shadow-md scale-105` : isClickable ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer' : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 opacity-60'}`}
                                                    >
                                                        {isCompleted && <Check size={18} strokeWidth={3} />}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
};