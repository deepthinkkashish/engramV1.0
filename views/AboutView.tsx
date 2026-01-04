
import React from 'react';
import { ArrowLeft, Twitter, Instagram, Facebook, ChevronRight } from 'lucide-react';
import { goBackOrFallback } from '../utils/navigation';
import { EngramLogo } from '../components/EngramLogo';

interface AboutViewProps {
    navigateTo: (view: string) => void;
    goBack: () => void;
    themeColor: string;
}

export const AboutView: React.FC<AboutViewProps> = ({ navigateTo, goBack, themeColor }) => (
    <div className="p-4 space-y-6">
        <div className="flex items-center space-x-2 mb-4">
            <button onClick={() => goBackOrFallback('#/settings')} className={`p-2 rounded-full hover:bg-${themeColor}-100 text-${themeColor}-600 dark:text-${themeColor}-400 dark:hover:bg-gray-800`}>
                <ArrowLeft size={24} />
            </button>
            <h2 className={`text-2xl font-bold text-${themeColor}-800 dark:text-${themeColor}-200`}>About</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center">
            
            <div className="flex items-center justify-center mb-6">
                <EngramLogo size={64} className="shadow-lg rounded-2xl transform rotate-3" />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Engram</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-6">Version 1.0 (Beta)</p>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                Engram is an AI-powered study companion designed to help you master any subject through spaced repetition, active recall, and instant feedback.
            </p>
            <div className="flex justify-center space-x-4 mb-8">
                <a href="#" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:text-blue-500 transition"><Twitter size={20} /></a>
                <a href="#" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:text-pink-500 transition"><Instagram size={20} /></a>
                <a href="#" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:text-blue-700 transition"><Facebook size={20} /></a>
            </div>
            <div className="space-y-3">
                <button onClick={() => navigateTo('terms')} className="w-full py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 flex justify-between px-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition"><span>Terms of Service</span><ChevronRight size={16}/></button>
                <button onClick={() => navigateTo('privacy')} className="w-full py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 flex justify-between px-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition"><span>Privacy Policy</span><ChevronRight size={16}/></button>
                <button onClick={() => navigateTo('licenses')} className="w-full py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 flex justify-between px-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition"><span>Open Source Licenses</span><ChevronRight size={16}/></button>
            </div>
            <p className="mt-8 text-xs text-gray-400">© 2025 Engram. All rights reserved.</p>
        </div>
    </div>
);
