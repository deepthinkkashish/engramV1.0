
import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Bot, User } from 'lucide-react';
import { Card } from '../components/Card';
import { Topic } from '../types';
import { chatWithNotes } from '../services/gemini';
import { ensureTopicContent } from '../services/storage';
import katex from 'katex';
import DOMPurify from 'dompurify';

interface ChatViewProps {
    topic: Topic | null;
    userId: string;
    navigateTo: (view: string, data?: any) => void;
    themeColor: string;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ topic, userId, navigateTo, themeColor }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `Hi! I've read your notes on "${topic?.topicName}". What would you like to clarify?` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Hydrated content state
    const [fullNotes, setFullNotes] = useState<string>('');
    
    // Ref for the scrollable container (not the end element)
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Robust scroll to bottom that targets the specific container
    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            // Immediate scroll
            scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
            
            // Safety timeout for mobile rendering lags
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Hydrate notes on mount
    useEffect(() => {
        if (topic) {
            ensureTopicContent(userId, topic).then(hydrated => {
                setFullNotes(hydrated.shortNotes || "");
            });
        }
    }, [topic, userId]);

    const handleSend = async () => {
        if (!input.trim() || !topic) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Convert current messages to history format for API
            const history = messages.map(m => ({ role: m.role, text: m.text }));
            
            // Use local fullNotes state which is hydrated from IDB
            // Pass featureId='chat'
            const responseText = await chatWithNotes(
                history,
                userMsg.text,
                fullNotes, 
                topic.subject,
                'chat'
            );

            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const renderMessageContent = (text: string) => {
        const blockMathRegex = /\$\$(.*?)\$\$/g;
        const inlineMathRegex = /\$(.*?)\$/g;
        let processedText = text;
        const blockMatches: string[] = [];
        processedText = processedText.replace(blockMathRegex, (match, formula) => {
            try {
                const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
                blockMatches.push(html);
                return `__BLOCK_MATH_${blockMatches.length - 1}__`;
            } catch (e) {
                return match;
            }
        });
        processedText = processedText.replace(inlineMathRegex, (match, formula) => {
            try {
                const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                return html;
            } catch (e) {
                return match;
            }
        });
        blockMatches.forEach((html, index) => {
            processedText = processedText.replace(`__BLOCK_MATH_${index}__`, html);
        });
        processedText = processedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono text-xs text-red-500">$1</code>')
            .replace(/\n/g, '<br />');
        return processedText;
    };

    if (!topic) return <div>Error: No topic selected</div>;

    return (
        <div className="flex flex-col flex-1 w-full min-h-0 h-full">
            <div className="flex items-center space-x-2 mb-4 shrink-0 px-1">
                <button onClick={() => navigateTo('topicDetail', topic)} className={`p-2 rounded-full hover:bg-${themeColor}-100 text-${themeColor}-600`}>
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className={`text-xl font-bold text-${themeColor}-800 dark:text-${themeColor}-200`}>Chat with Notes</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{topic.topicName}</p>
                </div>
            </div>

            {/* Main Chat Card Container - Relative for absolute input positioning */}
            <Card className="flex-1 relative flex flex-col min-h-0 overflow-hidden p-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/40 dark:border-gray-700/40">
                
                {/* Scrollable Messages Area */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-contain pb-24" // Extra padding bottom to clear absolute input
                >
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? `bg-${themeColor}-500 text-white ml-2` : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 mr-2 shadow-sm'}`}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                                </div>
                                <div 
                                    className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                            ? `bg-${themeColor}-500 text-white rounded-tr-none` 
                                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-600'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMessageContent(msg.text)) }}
                                />
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                         <div className="flex justify-start">
                             <div className="flex flex-row items-center">
                                 <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 mr-2 shadow-sm flex items-center justify-center"><Bot size={16}/></div>
                                 <div className="bg-white dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-600 shadow-sm flex space-x-1">
                                     <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                     <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                     <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                 </div>
                             </div>
                         </div>
                    )}
                </div>

                {/* Fixed Input Area at Bottom of Card */}
                <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-full border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={!fullNotes ? "Loading context..." : "Ask about your notes..."}
                            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-gray-700 dark:text-gray-200"
                            disabled={isTyping || !fullNotes}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping || !fullNotes}
                            className={`p-2 rounded-full transition shadow-sm ${!input.trim() ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500' : `bg-${themeColor}-500 text-white hover:scale-105 active:scale-95`}`}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
