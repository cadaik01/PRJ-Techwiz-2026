import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatApi } from '@/features/ai/api/chatApi';
import { ApiError } from '@/lib/ApiError';

let messageSeq = 0;
function createMessage(role, content) {
    messageSeq += 1;
    return { id: `msg-${messageSeq}`, role, content };
}
const INITIAL_MESSAGES = [
    createMessage('assistant', 'Hi! I can help find markets, check stock, or guide you for stall pickup.'),
];
export function useAiChat() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [tools, setTools] = useState([]);
    const bottomRef = useRef(null);
    const sendMutation = useMutation({
        mutationFn: (payload) => chatApi.send(payload),
        onSuccess: (result) => {
            setMessages((prev) => [...prev, createMessage('assistant', result.reply)]);
            setTools(result.tools_used);
        },
        onError: (err) => {
            setError(ApiError.fromUnknown(err).friendlyMessage);
        },
    });
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sendMutation.isPending, open]);
    const send = (text) => {
        const content = text.trim().slice(0, 1000);
        if (!content || sendMutation.isPending)
            return;
        const nextMessages = [...messages, createMessage('user', content)].slice(-10);
        setMessages(nextMessages);
        setInput('');
        setError(null);
        const payload = nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
        }));
        sendMutation.mutate(payload);
    };
    return {
        open,
        setOpen,
        input,
        setInput,
        loading: sendMutation.isPending,
        error,
        messages,
        tools,
        bottomRef,
        send,
    };
}
