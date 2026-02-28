import { useState, useRef, useEffect } from 'react';
import { Mic, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerWinBurst } from '../../lib/confetti';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';

type Message = {
    id: string;
    text: string;
    isAi: boolean;
    translation?: string;
    accuracy?: number;
};

// Khởi tạo Chat với Mascot KơRai Giáo Viên
const INITIAL_MESSAGES: Message[] = [
    {
        id: 'm-1',
        text: 'A mưi hơk trâu? (Chào buổi sáng, bạn khỏe không?)',
        isAi: true,
        translation: 'Hãy nhấn giữ micro và thử phản hồi tôi bằng tiếng Ba Na nhé!',
    }
];

export function ChatRoom() {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleHoldStart = () => {
        setIsRecording(true);
        // Ở môi trường thật, sẽ gọi navigator.mediaDevices.getUserMedia()
    };

    const handleHoldEnd = () => {
        setIsRecording(false);
        if (!isProcessing) {
            handleProcessAI("Nhen yau, kơ mưi sư!"); // Mock kết quả Speech-to-text
        }
    };

    const handleProcessAI = async (voiceText: string) => {
        setIsProcessing(true);

        const userMsg: Message = { id: Date.now().toString(), text: voiceText, isAi: false };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Demo API tích hợp bộ đo Latency /monitor.ts
            const response = await fetchWithMonitor<{ reply?: string, accuracy?: number }>(
                'http://localhost:8000/api/ai/chat/speak',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: voiceText })
                },
                'genai_last_response',
                4000 // 4 seconds timeout
            );

            const aiFeedback: Message = {
                id: (Date.now() + 1).toString(),
                text: response.reply || 'Tuyệt vời. Bạn làm tốt lắm!',
                isAi: true,
                translation: 'Response fallback from AI',
                accuracy: response.accuracy || (Math.random() > 0.5 ? 85 : 60)
            };
            setMessages(prev => [...prev, aiFeedback]);

            if (aiFeedback.accuracy && aiFeedback.accuracy >= 80) {
                triggerWinBurst();
            }

        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const fallbackMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Mạng đang yếu. KơRai không nghe rõ. Vui lòng nói lại!',
                isAi: true,
                translation: errorMsg,
            };
            setMessages(prev => [...prev, fallbackMsg]);
            trackEvent('genai_error', { reason: errorMsg });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white relative">
            {/* Header Mộc Mạc */}
            <div className="pb-6 pt-2 flex items-center gap-4 border-b border-stone-100">
                <div className="w-14 h-14 bg-orange-100 rounded-[1.2rem] flex items-center justify-center text-orange-600 shadow-sm border border-orange-200">
                    <Sparkles className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="font-bold text-stone-900 text-2xl tracking-tight">KơRai AI</h2>
                    <p className="text-stone-500 text-sm font-medium">Giáo viên bản xứ</p>
                </div>
            </div>

            {/* Khung Chat Tràn viền */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 no-scrollbar">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex flex-col ${msg.isAi ? 'items-start' : 'items-end'}`}
                    >
                        <div
                            className={`max-w-[85%] px-5 py-4 rounded-[1.8rem] shadow-sm transform transition-all ${msg.isAi
                                ? 'bg-stone-50 text-stone-900 rounded-tl-md border border-stone-100'
                                : 'bg-stone-900 text-white rounded-tr-md shadow-md'
                                }`}
                        >
                            <p className="font-semibold text-[16px] leading-relaxed">{msg.text}</p>

                            {/* Tag % Độ Chuẩn Xác (Gemini Feedback) */}
                            {msg.accuracy && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${msg.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        Độ chuẩn xác: {msg.accuracy}%
                                    </span>
                                </div>
                            )}

                            {/* Thông dịch tiếng Việt */}
                            {msg.translation && (
                                <p className={`mt-2 text-[14px] font-medium ${msg.isAi ? 'text-stone-500' : 'text-stone-300'}`}>
                                    {msg.translation}
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}

                {/* Typing Indicator */}
                {isProcessing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
                        <div className="bg-stone-50 px-5 py-4 rounded-[1.8rem] rounded-tl-md border border-stone-100 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-stone-400 animate-spin" />
                            <span className="text-sm font-semibold text-stone-500">Giáo viên đang nghe...</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Action Panel (One Action Rule) */}
            <div className="pt-6 border-t border-stone-100 flex flex-col items-center justify-center bg-white relative z-10 bottom-0 pb-2">
                <div className="text-center mb-4">
                    <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                        {isRecording ? 'Đang ghi âm...' : 'Giữ để Luyện nói'}
                    </p>
                </div>

                <motion.button
                    onMouseDown={handleHoldStart}
                    onMouseUp={handleHoldEnd}
                    onTouchStart={handleHoldStart}
                    onTouchEnd={handleHoldEnd}
                    animate={isRecording ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    disabled={isProcessing}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${isProcessing ? 'bg-stone-200 cursor-not-allowed' :
                        isRecording ? 'bg-rose-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.4)]' : 'bg-stone-900 text-white shadow-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]'
                        }`}
                >
                    {isRecording && (
                        <>
                            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-rose-400 rounded-full blur-md" />
                            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="absolute inset-0 bg-rose-500 rounded-full" />
                        </>
                    )}

                    <span className="relative z-10">
                        {isRecording ? <AudioWaveform /> : <Mic className="w-10 h-10" />}
                    </span>
                </motion.button>
            </div>
        </div>
    );
}

// Microinteraction: Audio Waveform Fake Animation
function AudioWaveform() {
    return (
        <div className="flex items-center justify-center gap-1.5 h-10">
            {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    animate={{ height: ['20%', '100%', '20%'] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1, ease: 'easeInOut' }}
                    className="w-1.5 bg-white rounded-full"
                />
            ))}
        </div>
    );
}
