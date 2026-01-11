import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Coffee, Bot, User, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedbackGiven?: 'positive' | 'negative' | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const STORAGE_KEY = 'sharma-coffee-chat-history';
const SESSION_KEY = 'sharma-coffee-chat-session';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const sessionId = useRef(getSessionId());

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to parse chat history:', e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = useCallback(async (userMessages: Message[], onDelta: (text: string) => void, onDone: () => void) => {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        userContext: {
          currentPage: location.pathname
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to connect to assistant');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    onDone();
  }, [location.pathname]);

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSend = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { id: generateMessageId(), role: 'user', content: trimmedInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    let assistantContent = '';
    const assistantId = generateMessageId();

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id === assistantId) {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { id: assistantId, role: 'assistant', content: assistantContent, feedbackGiven: null }];
      });
    };

    try {
      await streamChat(
        newMessages,
        (chunk) => updateAssistant(chunk),
        () => setIsLoading(false)
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: generateMessageId(),
        role: 'assistant', 
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or contact us directly at +91-8762988145.",
        feedbackGiven: null
      }]);
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageIndex: number, isPositive: boolean) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant' || message.feedbackGiven) return;

    // Find the user message that preceded this assistant message
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // Update UI immediately
    setMessages(prev => prev.map((m, i) => 
      i === messageIndex ? { ...m, feedbackGiven: isPositive ? 'positive' : 'negative' } : m
    ));

    try {
      const { error } = await supabase.from('chat_feedback').insert({
        message_content: userMessage.content,
        response_content: message.content,
        is_positive: isPositive,
        session_id: sessionId.current,
        page_context: location.pathname
      });

      if (error) throw error;
      toast.success('Thanks for your feedback!');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      // Revert UI on error
      setMessages(prev => prev.map((m, i) => 
        i === messageIndex ? { ...m, feedbackGiven: null } : m
      ));
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Chat history cleared');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "What's your best-selling coffee?",
    "How do I brew filter coffee?",
    "Do you ship internationally?",
    "What's the difference between your blends?"
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 ${isOpen ? 'hidden' : 'block'}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chat assistant"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-25" />
          <div className="relative flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary/90 rounded-full shadow-lg transition-colors">
            <Coffee className="w-7 h-7 text-primary-foreground" />
          </div>
          {messages.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {messages.filter(m => m.role === 'assistant').length}
            </div>
          )}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-foreground text-background text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
              Chat with us
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-foreground rotate-45" />
            </div>
          </div>
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Sharma Coffee Assistant</h3>
                  <p className="text-xs text-primary-foreground/80">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                    aria-label="Clear chat history"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Welcome to Sharma Coffee!</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      I'm here to help you find the perfect coffee, answer questions, or assist with your order.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick questions:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputValue(q);
                            inputRef.current?.focus();
                          }}
                          className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-full transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={message.id} className="space-y-1">
                    <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-md'
                          : 'bg-muted text-foreground rounded-tl-md'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                    
                    {/* Feedback buttons for assistant messages */}
                    {message.role === 'assistant' && !isLoading && (
                      <div className="flex items-center gap-1 ml-11">
                        {message.feedbackGiven ? (
                          <span className="text-xs text-muted-foreground">
                            {message.feedbackGiven === 'positive' ? '👍 Thanks!' : '👎 Thanks for letting us know'}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleFeedback(index, true)}
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-green-600"
                              title="Helpful response"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(index, false)}
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-muted border-0 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="rounded-full w-10 h-10 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Powered by Sharma Coffee • <span className="text-primary">Since 1987</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}