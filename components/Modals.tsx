
import React from 'react';
import { Shield, XCircle, MessageSquarePlus } from 'lucide-react';

interface PermissionModalProps {
    onAllow: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ onAllow }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                <Shield size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enable Permissions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                To provide the best experience, Engram needs permission to access your device storage for saving notes and camera for profile photos.
            </p>
            <button 
                onClick={onAllow}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition transform active:scale-95 mb-3"
            >
                Allow Access
            </button>
            <p className="text-[10px] text-gray-400">
                We respect your privacy. Data stays on your device.
            </p>
        </div>
    </div>
);

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    themeColor: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, themeColor }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    <XCircle size={20} />
                </button>
                <div className="text-center mb-6">
                    <div className={`w-14 h-14 bg-${themeColor}-100 dark:bg-${themeColor}-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-${themeColor}-600 dark:text-${themeColor}-400`}>
                        <MessageSquarePlus size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Send Feedback</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Help us improve Engram.</p>
                </div>
                
                <textarea 
                    className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 mb-4"
                    placeholder="Describe your issue or suggestion..."
                ></textarea>

                <div className="flex space-x-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm">Cancel</button>
                    <button onClick={() => { alert("Feedback sent! Thank you."); onClose(); }} className={`flex-1 py-3 bg-${themeColor}-600 text-white rounded-xl font-bold text-sm shadow-md`}>Send</button>
                </div>
            </div>
        </div>
    );
};
