import { MessageCircle, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/common/forms/Button';
import { Textarea } from '@/components/common/forms/Textarea';
import { useAiChat } from '@/hooks/queries/common/useAiChat';
import { cn } from '@/lib/cn';

import './AiChatWidget.css';

const SUGGESTIONS = [
  'Which markets are open today?',
  'Is tomato still in stock?',
  'How do I get to the market?',
];

const panelTransition = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 34,
  mass: 0.85,
};

export function AiChatWidget() {
  const { open, setOpen, input, setInput, loading, messages, tools, bottomRef, send } =
    useAiChat();

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="ai-panel"
            initial={{ y: '110%', opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0.85 }}
            transition={panelTransition}
            className="ai-chat__panel"
            role="dialog"
            aria-label="MarketLink AI assistant"
          >
            <div className="ai-chat__header">
              <div>
                <p className="ai-chat__header-title">MarketLink assistant</p>
                <p className="ai-chat__header-sub">
                  Ask about markets, produce, or how to get there
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="ai-chat__close"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <X className="ai-chat__close-icon" />
              </Button>
            </div>

            <div className="ai-chat__messages">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'ai-chat__bubble',
                    m.role === 'user'
                      ? 'ai-chat__bubble--user'
                      : 'ai-chat__bubble--assistant',
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading ? <div className="ai-chat__typing">Typing…</div> : null}
              {tools.length > 0 && !loading ? (
                <div className="ai-chat__tools">
                  {tools.map((t) => (
                    <span key={t} className="ai-chat__tool-tag">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {!loading && messages.length <= 2 ? (
              <div className="ai-chat__suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="ai-chat__suggestion"
                    onClick={() => void send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              className="ai-chat__composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                placeholder="Ask about markets or produce…"
                rows={2}
                className="ai-chat__textarea"
                aria-label="Message for AI assistant"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send className="ai-chat__send-icon" />
              </Button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!open ? (
          <motion.button
            type="button"
            key="ai-fab"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18 }}
            className="ai-chat__fab"
            aria-label="Open AI assistant"
            onClick={() => setOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
          >
            <MessageCircle className="ai-chat__fab-icon" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
