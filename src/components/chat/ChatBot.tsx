import { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Coffee,
  Loader2,
  ShoppingBag,
  Package,
  Phone,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** For assistant messages: the user message that preceded this response */
  userMessageContent?: string;
}

const quickActions = [
  { label: "Browse Products", icon: ShoppingBag, action: "/shop" },
  { label: "Track Order", icon: Package, action: "track" },
  { label: "Contact Us", icon: Phone, action: "/contact" },
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "up" | "down">>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist session ID for chat feedback
  const getSessionId = () => {
    let sid = sessionStorage.getItem("chat_session_id");
    if (!sid) {
      sid = crypto.randomUUID?.() ?? `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("chat_session_id", sid);
    }
    return sid;
  };

  // Welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm the Sharma Coffee Works assistant ☕ How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message handler - streaming support
  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat service error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        // Streaming response - parse OpenAI SSE format
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            userMessageContent: text,
          },
        ]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (typeof delta === "string") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + delta }
                        : m
                    )
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      } else {
        // Non-streaming (e.g. demo fallback) - parse JSON
        const data = await response.json();
        let assistantText = "Sorry, I couldn't process that.";

        if (data) {
          if (typeof data === "string") {
            try {
              const parsed = JSON.parse(data);
              assistantText = typeof parsed.response === "string" ? parsed.response : data;
            } catch {
              assistantText = data;
            }
          } else if (typeof data === "object" && data !== null) {
            if (typeof data.response === "string") {
              assistantText = data.response;
            } else if (data.data && typeof data.data.response === "string") {
              assistantText = data.data.response;
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: assistantText,
            timestamp: new Date(),
            userMessageContent: text,
          },
        ]);
      }
    } catch (err) {
      console.error("ChatBot error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content:
            "I'm having trouble right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitFeedback(messageId: string, isPositive: boolean) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.role !== "assistant" || messageFeedback[messageId]) return;

    const userContent = msg.userMessageContent ?? "";
    try {
      await supabase.from("chat_feedback").insert({
        message_content: userContent,
        response_content: msg.content,
        is_positive: isPositive,
        session_id: getSessionId(),
      });
      setMessageFeedback((prev) => ({ ...prev, [messageId]: isPositive ? "up" : "down" }));
    } catch (e) {
      console.error("Failed to submit chat feedback:", e);
    }
  }

  // Quick actions handler
  function handleQuickAction(action: string) {
    if (action.startsWith("/")) {
      window.location.href = action;
      return;
    }

    if (action === "track") {
      sendMessage("I want to track my order");
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 w-[90vw] md:w-80 h-[500px] bg-card border rounded-2xl shadow-2xl z-[9999] flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Sharma Coffee Assistant</h3>
                  <p className="text-xs opacity-80">Customer Support</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div ref={scrollRef} className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-2 text-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {m.content}
                      {isLoading && m.role === "assistant" && m.id === messages[messages.length - 1]?.id && (
                        <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse align-middle" aria-hidden />
                      )}
                      {m.role === "assistant" && m.id !== "welcome" && (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => submitFeedback(m.id, true)}
                            disabled={!!messageFeedback[m.id]}
                            className={cn(
                              "p-1 rounded hover:bg-background/50 transition-colors disabled:opacity-50",
                              messageFeedback[m.id] === "up" && "text-primary"
                            )}
                            aria-label="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => submitFeedback(m.id, false)}
                            disabled={!!messageFeedback[m.id]}
                            className={cn(
                              "p-1 rounded hover:bg-background/50 transition-colors disabled:opacity-50",
                              messageFeedback[m.id] === "down" && "text-destructive"
                            )}
                            aria-label="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}

                {messages.length === 1 && (
                  <div className="grid gap-2 mt-4">
                    {quickActions.map((q) => (
                      <Button
                        key={q.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(q.action)}
                      >
                        <q.icon className="w-4 h-4 mr-2" />
                        {q.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="p-4 border-t flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-105 transition-transform"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
      </button>
    </>
  );
}