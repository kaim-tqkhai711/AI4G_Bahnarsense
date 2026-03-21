import { useState, useRef, useEffect } from 'react';
import { Mic, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerWinBurst } from '../../lib/confetti';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';

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
    const { token } = useUserStore();
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleHoldStart = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await handleSend({ audioBlob });
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Vui lòng cấp quyền sử dụng Micro cho trình duyệt!');
        }
    };

    const handleHoldEnd = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSend = async ({ text, audioBlob }: { text?: string, audioBlob?: Blob }) => {
        setIsProcessing(true);
        let base64Audio = undefined;

        if (audioBlob) {
            base64Audio = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.readAsDataURL(audioBlob);
            });
        }

        const userMsg: Message = { 
            id: Date.now().toString(), 
            text: text || "🎤 Đã gửi một tin nhắn thoại...", 
            isAi: false 
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const payload: any = { topic_id: "general_greeting" };
            if (base64Audio) {
                payload.audio_base64 = base64Audio;
                payload.mime_type = audioBlob!.type;
            }
            if (text) {
                payload.stt_text = text;
            }

            const response = await fetchWithMonitor<{ data: any } | any>(
                `${API_URL}/api/v1/ai/chat/speak`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                },
                'genai_last_response',
                15000
            );

            const dataResult = response?.data || response;
            const evalData = dataResult?.evaluation || {};

            const aiFeedback: Message = {
                id: (Date.now() + 1).toString(),
                text: evalData.response_bhn || 'Tuyệt vời. Bạn làm tốt lắm!',
                isAi: true,
                translation: evalData.vietnamese_translation || 'Response fallback from AI',
                accuracy: evalData.accuracy
            };

            // Ghi đè lại lời nói bằng Text từ STT (nếu gửi bằng Voice)
            if (!text && dataResult.stt_recognized) {
                setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, text: dataResult.stt_recognized } : m));
            }
            setMessages(prev => [...prev, aiFeedback]);

            if (aiFeedback.accuracy && aiFeedback.accuracy >= 80) {
                triggerWinBurst();
            }

            if (dataResult.audio_base64) {
                const audio = new Audio(dataResult.audio_base64);
                audio.play().catch(e => console.error("Auto-play error", e));
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

    const handleSendText = () => {
        if (!inputText.trim() || isProcessing) return;
        const textToSubmit = inputText.trim();
        setInputText('');
        handleSend({ text: textToSubmit });
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

            {/* Input Action Panel (Voice & Text) */}
            <div className="pt-4 px-4 sm:px-8 border-t border-stone-100 bg-white relative z-10 bottom-0 pb-6">
                <div className="flex items-center gap-3 max-w-2xl mx-auto">
                    {/* Text Input */}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendText();
                        }}
                        disabled={isProcessing || isRecording}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-stone-900 placeholder-stone-400 font-medium"
                    />

                    {/* Action Button (Mic or Send) */}
                    {inputText.trim() ? (
                        <button
                            onClick={handleSendText}
                            disabled={isProcessing}
                            className="w-12 h-12 flex-shrink-0 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    ) : (
                        <motion.button
                            onMouseDown={handleHoldStart}
                            onMouseUp={handleHoldEnd}
                            onTouchStart={handleHoldStart}
                            onTouchEnd={handleHoldEnd}
                            onMouseLeave={handleHoldEnd}
                            animate={isRecording ? { scale: 1.1 } : { scale: 1 }}
                            disabled={isProcessing}
                            className={`relative w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${isProcessing ? 'bg-stone-200 cursor-not-allowed text-stone-400' :
                                isRecording ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm'
                                }`}
                        >
                            {isRecording && (
                                <>
                                    <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-rose-400 rounded-full blur-sm" />
                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="absolute inset-0 bg-rose-500 rounded-full" />
                                </>
                            )}
                            <span className="relative z-10">
                                {isRecording ? <AudioWaveformSmall /> : <Mic className="w-5 h-5" />}
                            </span>
                        </motion.button>
                    )}
                </div>
                <div className="text-center mt-3">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                        {isRecording ? 'Đang ghi âm...' : 'Gõ hoặc Giữ Mic để nói'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Microinteraction: Mini Audio Waveform Fake Animation
function AudioWaveformSmall() {
    return (
        <div className="flex items-center justify-center gap-[3px] h-5">
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    animate={{ height: ['20%', '100%', '20%'] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1, ease: 'easeInOut' }}
                    className="w-1 bg-white rounded-full"
                />
            ))}
        </div>
    );
}
