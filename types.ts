
export interface QuizOption {
  A: string;
  B: string;
  C: string;
  D: string;
  [key: string]: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption;
  correct_answer_letter: string;
  explanation: string;
}

export interface QuizAttemptQuestion extends QuizQuestion {
  questionText?: string; // Mapped from question
  correctAnswer?: string; // Mapped from correct_answer_letter
  userSelected: string;
}

export interface QuizAttempt {
  timeTakenSeconds: number;
  score: number;
  isFallbackQuiz: boolean;
  questions: QuizAttemptQuestion[];
}

export interface Repetition {
  dateCompleted: string;
  nextReviewDate: string;
  quizCompleted: boolean;
  score: number;
  totalQuestions: number;
  quizAttempt: QuizAttempt;
}

export interface FocusSession {
    date: string;
    minutes: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  subject: string;
  topicName: string;
  shortNotes: string;
  podcastScript?: string; // The text script for the podcast
  podcastAudio?: string; // Base64 audio string (optional, generally transient now)
  hasSavedAudio?: boolean; // Flag indicating audio is stored in IndexedDB
  isMarkedDifficult?: boolean; // Flag for difficult topics folder
  pomodoroTimeMinutes: number;
  focusLogs?: FocusSession[];
  repetitions: Repetition[];
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface GeminiQuizResponse {
  pop_quiz: QuizQuestion[];
}

export interface DateTimeSettings {
    timeFormat: 'system' | '12h' | '24h';
    startDayOfWeek: 'sunday' | 'monday' | 'saturday';
    additionalCalendar: 'none' | 'indian' | 'chinese' | 'hijri';
    showWeekNumbers: boolean;
    week1Definition: 'default' | 'first4day' | 'firstFullWeek';
    countdownMode: boolean;
}

export interface NotificationSettings {
    enabled: boolean;
    reminderTime: string; // "HH:MM" format
}

export interface Habit {
    id: string;
    name: string;
    completedDates: string[]; // ISO Date strings YYYY-MM-DD
}

export interface UserProfile {
    name: string;
    avatar: string | null; // Base64 data URI
    username?: string; // Unique handle from Supabase
}

// Global variable declarations for Canvas/Runtime environment
declare global {
  interface Window {
    __app_id?: string;
  }
}
