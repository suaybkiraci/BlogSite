'use client';

import { useState, useRef, useEffect } from 'react';
import { geminiAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Bot, User as UserIcon } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth guard now handled by ProtectedRoute

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await geminiAPI.chat({
        messages: [...messages, userMessage],
        temperature: 0.7,
      });

      const aiMessage: Message = {
        role: 'model',
        content: response.data.response,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Conversation cleared');
  };

  return (
    <ProtectedRoute>
      <div className="py-10">
        <div className="glass-card mx-auto flex min-h-[70vh] max-w-4xl flex-col rounded-[36px] p-4 shadow-[0_40px_120px_rgba(15,23,42,0.25)] sm:p-6">
        {/* Header */}
        <motion.div 
          className="glass-surface mb-4 flex items-center justify-between rounded-2xl p-4 shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Napolyon AI</h1>
              <p className="text-xs text-muted-foreground">Chat with AI</p>
            </div>
          </div>
          {messages.length > 0 && (
            <motion.button
              onClick={clearChat}
              className="glass-chip flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 size={16} />
              Temizle
            </motion.button>
          )}
        </motion.div>

        {/* Messages */}
        <div className="mb-4 flex-1 space-y-4 overflow-y-auto">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div 
                className="text-center text-muted-foreground mt-20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground shadow'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs mb-2 opacity-70">
                      {message.role === 'user' ? (
                        <>
                          <UserIcon size={14} />
                          <span>Sen</span>
                        </>
                      ) : (
                        <>
                          <Bot size={14} />
                          <span>Gemini AI</span>
                        </>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          
          {loading && (
            <motion.div 
              className="flex justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-card text-card-foreground shadow rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div 
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div 
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="glass-surface flex gap-2 rounded-2xl p-2 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 text-field py-3"
            disabled={loading}
          />
          <motion.button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={18} />
            {loading ? 'Sending...' : 'Send'}
          </motion.button>
        </motion.form>
      </div>
    </div>
    </ProtectedRoute>
  );
}

