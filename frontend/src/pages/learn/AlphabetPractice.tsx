import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Volume2, Mic, Check, Loader2, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bahnarAlphabet, AlphabetCategory } from '../../data/bahnarAlphabet';
import { useUserStore } from '../../store/useUserStore';
import { fetchWithMonitor } from '../../lib/monitor';
import { triggerConfetti } from '../../lib/confetti';

export function AlphabetPractice() {
    const navigate = useNavigate();
    const { token } = useUserStore();
    const [activeTab, setActiveTab] = useState<AlphabetCategory>('basic');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

    // Audio states for the selected letter
    const [isRecording, setIsRecording] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [scoreResult, setScoreResult] = useState<{ score: number, feedback: string, wrong_words?: string[] } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const activeGroup = bahnarAlphabet.find(g => g.id === activeTab)!;

    const handlePlaySample = async () => {
        if (!selectedLetter) return;
        setIsPlaying(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/v1/ai/pronounce?word=${encodeURIComponent(selectedLetter)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                throw new Error("Server AI phát âm hiện đang tắt");
            }

            const data = await res.json();
            const base64Audio = data.data?.audio_base64 || data.audio_base64;
            
            if (base64Audio && base64Audio.length > 50) {
                const audio = new Audio(base64Audio);
                await audio.play();
                await new Promise(resolve => audio.onended = resolve);
            } else {
                throw new Error("Không có Audio Base64");
            }
        } catch(e) {
            console.error("Lỗi khi nghe mẫu", e);
            alert("⚠️ Hệ thống AI tạo âm thanh tạm thời chưa tải được.");
        } finally {
            setIsPlaying(false);
        }
    };

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
                await processAudio(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setScoreResult(null);
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

    const processAudio = async (blob: Blob) => {
        setIsScoring(true);
        try {
            const base64Audio = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result?.toString().split(',')[1] || '';
                    resolve(base64data);
                };
                reader.readAsDataURL(blob);
            });

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetchWithMonitor<{ data: { score: number, feedback: string, wrong_words?: string[] } } | { score: number, feedback: string, wrong_words?: string[] }>(
                `${API_URL}/api/v1/ai/score-pronunciation`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        audioBase64: base64Audio,
                        mimeType: blob.type,
                        expectedText: selectedLetter
                    })
                },
                undefined,
                15000
            );

            const result = 'score' in response ? response : response.data;
            setScoreResult({ score: result.score, feedback: result.feedback, wrong_words: result.wrong_words });
            
            if (result.score >= 80) triggerConfetti();
        } catch (error) {
            console.error(error);
            setScoreResult({ score: 0, feedback: 'Kết nối kém hoặc có lỗi. Xin thử lại.' });
        } finally {
            setIsScoring(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#FDFBF7] relative overflow-hidden">
            {/* Header Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#FDFBF7]/90 backdrop-blur-md z-10 border-b border-stone-200/50">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-stone-900 text-lg tracking-tight">Bảng Chữ Cái Ba Na</span>
                <div className="w-9" /> {/* Spacer */}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full px-6 py-8">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                    {bahnarAlphabet.map((group) => (
                        <button
                            key={group.id}
                            onClick={() => setActiveTab(group.id)}
                            className={`px-4 py-2.5 rounded-full font-bold text-sm transition-all ${
                                activeTab === group.id 
                                ? 'bg-[#4e9f76] text-white shadow-md scale-105' 
                                : 'bg-white border text-stone-600 hover:bg-stone-50'
                            }`}
                        >
                            {group.title.split('(')[0].trim()}
                        </button>
                    ))}
                </div>

                {/* Group Description */}
                <div className="mb-8 text-center max-w-md mx-auto">
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">{activeGroup.title}</h2>
                    <p className="text-stone-500 text-sm leading-relaxed">{activeGroup.description}</p>
                </div>

                {/* Grid of Letters */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 pb-20 max-w-4xl mx-auto">
                    {activeGroup.items.map((letter, idx) => (
                        <motion.button
                            key={idx}
                            layoutId={`letter-${letter}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setSelectedLetter(letter);
                                setScoreResult(null);
                            }}
                            className="bg-white aspect-square rounded-2xl shadow-sm border border-stone-100 flex items-center justify-center cursor-pointer overflow-hidden relative group"
                        >
                            <span className="text-3xl font-bold text-stone-800 font-serif">{letter}</span>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-transparent group-hover:bg-[#facc15] transition-colors" />
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Letter Practice Modal (Bottom Sheet similar to Dictionary Tooltip) */}
            <AnimatePresence>
                {selectedLetter && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.08)] rounded-t-[2rem] border-t border-stone-100 p-6 md:p-8 z-50"
                    >
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex flex-col items-center w-full relative">
                                    <button
                                        onClick={() => setSelectedLetter(null)}
                                        className="absolute right-0 top-0 p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="w-24 h-24 mb-4 rounded-[2rem] bg-orange-50 flex flex-col items-center justify-center border-2 border-orange-100 shadow-sm relative overflow-hidden">
                                        <motion.span layoutId={`letter-${selectedLetter}`} className="text-5xl font-bold text-orange-500 font-serif z-10">
                                            {selectedLetter}
                                        </motion.span>
                                    </div>
                                    <p className="text-stone-400 font-medium text-sm text-center">Hướng dẫn: Bấm Nghe Mẫu để nghe cách phát âm chuẩn, sau đó giữ Mic để tự đọc lại.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-6">
                                <button 
                                    onClick={handlePlaySample} 
                                    disabled={isPlaying}
                                    className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-900 py-3.5 rounded-2xl font-bold hover:bg-stone-200 transition-colors">
                                    {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                                    Nghe mẫu
                                </button>

                                <button
                                    onMouseDown={handleHoldStart}
                                    onMouseUp={handleHoldEnd}
                                    onTouchStart={handleHoldStart}
                                    onTouchEnd={handleHoldEnd}
                                    disabled={isScoring}
                                    className={`flex-1 flex max-w-[200px] items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all relative ${isScoring ? 'bg-stone-200 text-stone-400 cursor-not-allowed' :
                                        isRecording ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105' : 'bg-stone-900 text-white hover:bg-stone-800'
                                    }`}
                                >
                                    {isScoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                    {isScoring ? 'Đang chấm...' : isRecording ? 'Đang thu âm' : 'Giữ để đọc'}
                                </button>
                            </div>

                            {/* Ai Score Result */}
                            {scoreResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mt-4 p-4 rounded-2xl border ${scoreResult.score >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm">Điểm phát âm:</span>
                                        <span className="font-black text-lg">{scoreResult.score}%</span>
                                    </div>
                                    <p className="text-sm font-medium">{scoreResult.feedback}</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay to dismiss tooltip */}
            <AnimatePresence>
                {selectedLetter && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedLetter(null)}
                        className="absolute inset-0 bg-stone-900/10 z-20"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
