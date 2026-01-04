
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';
import { goBackOrFallback } from '../utils/navigation';

interface LegalViewProps {
    navigateTo: (view: string) => void;
    goBack: () => void;
    themeColor: string;
}

const Header = ({ title, themeColor }: { title: string, themeColor: string }) => (
    <div className="flex items-center space-x-2 mb-6">
        <button onClick={() => goBackOrFallback('#/about')} className={`p-2 rounded-full hover:bg-${themeColor}-100 text-${themeColor}-600 dark:text-${themeColor}-400 dark:hover:bg-gray-800`}>
            <ArrowLeft size={24} />
        </button>
        <h2 className={`text-2xl font-bold text-${themeColor}-800 dark:text-${themeColor}-200`}>{title}</h2>
    </div>
);

export const TermsView: React.FC<LegalViewProps> = ({ goBack, themeColor }) => (
    <div className="p-4">
        <Header title="Terms of Service" themeColor={themeColor} />
        <Card className="p-6 overflow-y-auto max-h-[80vh]">
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <p className="font-bold text-xs uppercase text-gray-400">Last Updated: October 2024</p>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h3>
                    <p>By accessing and using Engram, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">2. Description of Service</h3>
                    <p>Engram is an AI-powered study companion that helps users generate quizzes, flashcards, and track study progress. The application uses artificial intelligence to process user-provided notes and images.</p>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">3. AI Disclaimer</h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400">
                        <p className="text-yellow-800 dark:text-yellow-200"><strong>Important:</strong> Services provided by Engram leverage Google's Gemini AI. Artificial intelligence can make mistakes. The quizzes, summaries, and chat responses generated may contain inaccuracies. <strong>Always verify critical information with your official textbooks or instructors.</strong></p>
                    </div>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">4. User Data & Content</h3>
                    <p>You retain ownership of all notes and content you upload. By using the OCR and AI features, you grant the application permission to process this data via third-party APIs (Google Gemini) solely for the purpose of generating study materials. You agree not to upload illegal, offensive, or copyrighted material you do not have the right to use.</p>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">5. Disclaimer of Warranties</h3>
                    <p>The application is provided "as is" without any warranties. We do not guarantee that the results will be error-free, accurate, or that the service will be uninterrupted.</p>
                </section>
            </div>
        </Card>
    </div>
);

export const PrivacyView: React.FC<LegalViewProps> = ({ goBack, themeColor }) => (
    <div className="p-4">
        <Header title="Privacy Policy" themeColor={themeColor} />
        <Card className="p-6 overflow-y-auto max-h-[80vh]">
             <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <p className="font-bold text-xs uppercase text-gray-400">Last Updated: October 2024</p>

                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">1. Local-First Data Storage</h3>
                    <p>Engram is designed with a "Local First" approach. Your study logs, habits, profile data, and settings are stored locally on your device using Browser LocalStorage. We do not maintain a central database of your personal data.</p>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">2. Image & Text Processing</h3>
                    <p>When you use features like "Scan Notes" (OCR) or "Chat with Notes", your text inputs and images are temporarily transmitted to Google's Gemini API for processing. This data is not used to train Google's models in the default consumer API setting, but please refer to <a href="https://policies.google.com/privacy" className={`text-${themeColor}-600 underline`}>Google's Privacy Policy</a> for details on how they handle API data.</p>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">3. Analytics</h3>
                    <p>We do not currently track personally identifiable usage data. Any future analytics implementation will be aggregated and anonymous.</p>
                </section>
                
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">4. Your Rights</h3>
                    <p>Since data is stored locally, you have full control. You can delete all your application data at any time by using the "Delete All Data" option in the Settings menu or by clearing your browser cache.</p>
                </section>
            </div>
        </Card>
    </div>
);

export const LicensesView: React.FC<LegalViewProps> = ({ goBack, themeColor }) => (
    <div className="p-4">
        <Header title="Open Source Licenses" themeColor={themeColor} />
        <p className="mb-4 text-sm text-gray-500">Engram is built using the following open source software:</p>
        <div className="space-y-3">
             <Card className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white">React</h3>
                <p className="text-xs text-gray-500 mt-1 mb-2">MIT License. Copyright (c) Meta Platforms, Inc.</p>
                <p className="text-[10px] text-gray-400">Permission is hereby granted, free of charge, to any person obtaining a copy of this software...</p>
            </Card>
            <Card className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Lucide React</h3>
                <p className="text-xs text-gray-500 mt-1 mb-2">ISC License. Copyright (c) 2022 Lucide Contributors.</p>
                <p className="text-[10px] text-gray-400">Permission to use, copy, modify, and/or distribute this software for any purpose...</p>
            </Card>
             <Card className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Google GenAI SDK</h3>
                <p className="text-xs text-gray-500 mt-1 mb-2">Apache-2.0 License. Copyright 2024 Google LLC.</p>
                <p className="text-[10px] text-gray-400">Licensed under the Apache License, Version 2.0 (the "License")...</p>
            </Card>
            <Card className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Tailwind CSS</h3>
                <p className="text-xs text-gray-500 mt-1 mb-2">MIT License. Copyright (c) Tailwind Labs, Inc.</p>
                <p className="text-[10px] text-gray-400">Permission is hereby granted, free of charge, to any person obtaining a copy...</p>
            </Card>
        </div>
    </div>
);
