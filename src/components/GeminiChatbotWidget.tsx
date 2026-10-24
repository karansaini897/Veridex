import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Bot,
  User,
} from 'lucide-react';
import {
  ApplicationRecord,
  DocumentRecord,
  Role,
  UserAccount,
} from '../types/portal';
import {
  ChatbotPresetPrompt,
  generateFallbackRoleResponse,
  getRoleChatbotConfig,
} from '../lib/chatbotData';

interface GeminiChatbotWidgetProps {
  currentUser: UserAccount | null;
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  categoryTag?: string;
  sourceMode?: 'gemini' | 'fallback';
}

export const GeminiChatbotWidget: React.FC<GeminiChatbotWidgetProps> = ({
  currentUser,
  applications,
  documents,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptsPanel, setShowPromptsPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeRole: Role | 'public' = currentUser ? currentUser.role : 'public';

  const roleConfig = useMemo(
    () =>
      getRoleChatbotConfig(activeRole, {
        currentUser,
        applications,
        documents,
      }),
    [activeRole, currentUser, applications, documents]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Reset conversation with role-specific greeting whenever active user/role changes
  useEffect(() => {
    setMessages([
      {
        id: `welcome-${activeRole}-${currentUser?.id || 'anon'}`,
        sender: 'assistant',
        text: roleConfig.welcomeMessage,
        timestamp: 'Just now',
        categoryTag: roleConfig.roleBadge,
        sourceMode: 'fallback',
      },
    ]);
    setShowPromptsPanel(true);
  }, [activeRole, currentUser?.id, roleConfig.welcomeMessage, roleConfig.roleBadge]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSelectPrompt = (preset: ChatbotPresetPrompt) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: preset.question,
      timestamp: nowTime,
    };

    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'assistant',
      text: preset.answer,
      timestamp: nowTime,
      categoryTag: preset.category,
      sourceMode: 'fallback',
    };

    setShowPromptsPanel(false);
    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleSendCustomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: nowTime,
    };

    setShowPromptsPanel(false);
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const contextSummary = roleConfig.prompts
        .map((p) => `Q: ${p.question}\nA: ${p.answer}`)
        .join('\n\n')
        .slice(0, 3800);

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed.slice(0, 1500),
          role: activeRole,
          userName: currentUser?.fullName,
          institutionName: currentUser?.institutionName,
          contextSummary,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.reply && data?.mode === 'gemini') {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              sender: 'assistant',
              text: data.reply,
              timestamp: nowTime,
              categoryTag: 'Gemini Assistant',
              sourceMode: 'gemini',
            },
          ]);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fallback to deterministic role-scoped response below
    }

    // Deterministic role-specific response fallback
    const fallbackAnswer = generateFallbackRoleResponse(activeRole, trimmed, {
      currentUser,
      applications,
      documents,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: fallbackAnswer,
        timestamp: nowTime,
        categoryTag: roleConfig.roleBadge,
        sourceMode: 'fallback',
      },
    ]);
    setIsLoading(false);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-reset-${Date.now()}`,
        sender: 'assistant',
        text: roleConfig.welcomeMessage,
        timestamp: 'Just now',
        categoryTag: roleConfig.roleBadge,
        sourceMode: 'fallback',
      },
    ]);
    setShowPromptsPanel(true);
  };

  const roleDisplayName =
    activeRole === 'admin'
      ? 'Admin / Reviewer'
      : activeRole === 'institutional_rep'
        ? 'Institute Nodal Officer'
        : activeRole === 'faculty'
          ? 'Faculty Member'
          : activeRole === 'student'
            ? 'Student'
            : 'Visitors';

  return (
    <div
      data-testid="chatbot-floating-container"
      className="fixed bottom-[4.5rem] right-4 sm:bottom-20 sm:right-5 z-50 flex flex-col items-end"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            data-testid="chatbot-dialog-panel"
            aria-label="VERIDEX Gemini Compliance Chatbot"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[calc(100dvh-10.5rem)] sm:max-h-[min(640px,calc(100dvh-11rem))] flex flex-col rounded-2xl bg-[#FCF9F2] dark:bg-stone-900 border-2 border-[#C2410C] shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100"
          >
            {/* Tricolour Top Accent */}
            <div className="h-1.5 w-full tricolour-bar shrink-0" />

            {/* Chatbot Header */}
            <div className="px-4 py-3 bg-[#F3E9D7] dark:bg-stone-950 border-b border-[#C2410C]/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
                    alt="VERIDEX Gemini Assistant"
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full object-cover bg-[#E7D8C0] border border-[#C2410C]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#046A38] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                    {roleConfig.interfaceTitle}
                  </div>
                  <div className="text-[11px] font-semibold text-[#046A38] dark:text-emerald-400 truncate">
                    {roleConfig.roleBadge}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  aria-label="Reset chatbot conversation"
                  title="Reset conversation"
                  className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-[#E7D8C0]/60 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Gemini compliance chatbot"
                  className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-[#E7D8C0]/60 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 max-h-[min(380px,calc(100dvh-19rem))]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.sender === 'user'
                        ? 'bg-[#C2410C] text-white'
                        : 'bg-[#046A38] text-white'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#C2410C] text-white rounded-tr-xs'
                        : 'bg-[#F4EDE1] dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-[#C2410C]/35 rounded-tl-xs'
                    }`}
                  >
                    {msg.sender === 'assistant' && (
                      <div className="text-[10px] font-mono-tabular font-bold text-[#046A38] dark:text-emerald-400 mb-1 flex flex-wrap items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>{msg.categoryTag || roleConfig.roleBadge}</span>
                        </span>
                        <span className="text-[9px] font-mono-tabular px-1.5 py-0.5 rounded bg-[#EFE6D5] dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-[#C2410C]/30">
                          {msg.sourceMode === 'gemini'
                            ? 'Gemini Assistant'
                            : 'Local Compliance Guide (Fallback)'}
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-line">{msg.text}</div>
                    <div
                      className={`text-[10px] mt-1.5 font-mono-tabular ${
                        msg.sender === 'user'
                          ? 'text-orange-100 text-right'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 pl-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#046A38] animate-spin" />
                  <span>Analyzing your {activeRole.replace('_', ' ')} query...</span>
                </div>
              )}

              {/* Role-Specific Suggested Prompts Bank */}
              {showPromptsPanel && (
                <div className="pt-2 border-t border-[#C2410C]/25 space-y-1.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#046A38]" />
                      <span>Suggested Questions for {roleDisplayName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPromptsPanel(false)}
                      className="text-[11px] font-semibold text-[#C2410C] hover:underline cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>

                  {roleConfig.prompts.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPrompt(preset)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white dark:bg-stone-950 hover:bg-[#EFE6D5] dark:hover:bg-stone-800 border border-[#C2410C]/35 text-xs text-stone-800 dark:text-stone-200 flex items-start justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono-tabular font-bold text-[#046A38] dark:text-emerald-400 block">
                          {preset.category}
                        </span>
                        <span className="font-medium leading-snug block mt-0.5">
                          {preset.question}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#C2410C] shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Persistent Bar to Re-Open Role Prompts when collapsed */}
            {!showPromptsPanel && (
              <div className="px-4 py-2 bg-[#EFE6D5]/80 dark:bg-stone-900 border-t border-[#C2410C]/30 flex items-center justify-between text-xs shrink-0">
                <span className="text-[11px] text-stone-700 dark:text-stone-300 font-medium">
                  Want another {roleDisplayName} question?
                </span>
                <button
                  type="button"
                  onClick={() => setShowPromptsPanel(true)}
                  className="text-[11px] font-bold text-[#046A38] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Show {roleConfig.prompts.length} Suggested Prompts</span>
                </button>
              </div>
            )}

            {/* Custom Query Input Form */}
            <form
              onSubmit={handleSendCustomMessage}
              className="p-3 bg-[#F3E9D7] dark:bg-stone-950 border-t border-[#C2410C]/40 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                maxLength={1500}
                aria-label="Ask Gemini compliance assistant a question"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={roleConfig.placeholder}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#C2410C]/45 bg-[#FCF9F2] dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#046A38]"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message to Gemini assistant"
                className="px-3 py-2 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating Bottom-Right Circular Button with Logo & Gemini Badge */}
      <button
        type="button"
        data-testid="chatbot-launcher-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          isOpen
            ? 'Close VERIDEX Gemini Compliance Assistant'
            : 'Open VERIDEX Gemini Compliance Assistant'
        }
        aria-expanded={isOpen}
        className="group relative w-14 h-14 rounded-full bg-[#FCF9F2] dark:bg-stone-900 border-2 border-[#C2410C] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
      >
        <img
          src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
          alt="VERIDEX Gemini Assistant"
          referrerPolicy="no-referrer"
          className="w-11 h-11 rounded-full object-cover bg-[#E7D8C0]"
        />
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#046A38] border-2 border-[#FCF9F2] text-white flex items-center justify-center shadow-md">
          {isOpen ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </span>
      </button>
    </div>
  );
};
