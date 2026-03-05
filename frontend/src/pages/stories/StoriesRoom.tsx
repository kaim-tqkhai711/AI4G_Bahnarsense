import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Volume2, Star, Check, Mic, Loader2 } from 'lucide-react';
import { triggerConfetti } from '../../lib/confetti';
import { useUserStore } from '../../store/useUserStore';
import { fetchWithMonitor } from '../../lib/monitor';
type DictionaryEntry = {
    meaning: string;
    audioUrl: string;
};

export type StoryType = {
    id: string;
    title: string;
    description: string;
    image: string;
    tags: string[];
    content: string;
    dictionary: Record<string, DictionaryEntry>;
};

const MOCK_STORIES: StoryType[] = [
    {
        id: 's1',
        title: 'Sự tích Hồ Tơ-nưng',
        description: 'Khám phá truyền thuyết về hồ nước đẹp nhất Tây Nguyên.',
        image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=600',
        tags: ['A2', 'Truyền thuyết'],
        content: "Bơ tơ̆k đe đe, đak Tơ-nưng dơng hmă... (Ngày xửa ngày xưa, hồ Tơ-nưng rất đẹp...).",
        dictionary: {
            "Bơ tơ̆k đe đe": { meaning: "Ngày xửa ngày xưa", audioUrl: "https://mock.mp3" },
            "đak": { meaning: "nước / hồ", audioUrl: "https://mock.mp3" },
            "Tơ-nưng": { meaning: "tên riêng (Biển Hồ)", audioUrl: "https://mock.mp3" },
            "hmă": { meaning: "rất đẹp", audioUrl: "https://mock.mp3" }
        }
    }
];

export function StoriesRoom() {
    const [activeStory, setActiveStory] = useState<string | null>(null);

    // Màn hình chọn Truyện (Grid view)
    if (!activeStory) {
        return (
            <div className="flex flex-col h-full w-full bg-white relative">
                <div className="pb-6 pt-2 border-b border-stone-100 flex items-center justify-between mb-8">
                    <div>
                        <h2 className="font-bold text-stone-900 text-2xl tracking-tight">Thư viện Truyện</h2>
                        <p className="text-stone-500 text-sm font-medium">Khám phá văn hóa Ba Na</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                    {MOCK_STORIES.map((story) => (
                        <motion.div
                            layoutId={`story-container-${story.id}`}
                            key={story.id}
                            onClick={() => setActiveStory(story.id)}
                            className="relative aspect-video rounded-3xl overflow-hidden cursor-pointer shadow-sm group border border-stone-100"
                        >
                            <img src={story.image} alt={story.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent" />

                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <div className="flex gap-2 mb-2">
                                    {story.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="text-white font-bold text-lg leading-tight mb-1">{story.title}</h3>
                                <p className="text-stone-300 text-xs line-clamp-2">{story.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    const story = MOCK_STORIES.find(s => s.id === activeStory)!;

    // --- SCREEN: READER VIEW ---
    return <StoryReader story={story} onClose={() => setActiveStory(null)} />;
}

// Reader View Component
function StoryReader({ story, onClose }: { story: StoryType, onClose: () => void }) {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [savedWords, setSavedWords] = useState<string[]>([]);
    const { token } = useUserStore();

    // Audio states
    const [isRecording, setIsRecording] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [scoreResult, setScoreResult] = useState<{ score: number, feedback: string } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Tách chuỗi thành mảng các từ, ưu tiên cụm từ trong từ điển (Mock logic: Split by space)
    // Ở bản Real: Ta sẽ map content bằng Regex tìm match key keys(dictionary).
    const words = story.content.split(' ');

    const handleWordClick = (wordRaw: string) => {
        // Clear punctuation for dictionary lookup
        const cleanWord = wordRaw.replace(/[.,()]/g, '').trim();

        // Lookup
        if (story.dictionary[cleanWord]) {
            setSelectedWord(cleanWord);
            setScoreResult(null); // reset score when clicking a new word
        } else if (story.dictionary["Bơ tơ̆k đe đe"] && wordRaw.includes("Bơ")) {
            // Giả lập click vào cụm từ
            setSelectedWord("Bơ tơ̆k đe đe");
            setScoreResult(null);
        } else {
            setSelectedWord(null);
        }
    };

    const handleSaveWord = () => {
        if (selectedWord && !savedWords.includes(selectedWord)) {
            setSavedWords(prev => [...prev, selectedWord]);
            // Thực tế: POST /review/log_error với word này để vào Spaced Repetition
            triggerConfetti();
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
            const response = await fetchWithMonitor<{ score: number, feedback: string } | { data: { score: number, feedback: string } }>(
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
                        expectedText: selectedWord
                    })
                },
                undefined,
                15000
            );

            const result = 'score' in response ? response : response.data;
            setScoreResult({ score: result.score, feedback: result.feedback });
            if (result.score >= 80) triggerConfetti();
        } catch (error) {
            console.error(error);
            setScoreResult({ score: 0, feedback: 'Kết nối kém hoặc có lỗi. Xin thử lại.' });
        } finally {
            setIsScoring(false);
        }
    };

    return (
        <motion.div
            layoutId={`story-container-${story.id}`}
            className="absolute inset-0 z-50 bg-[#FDFBF7] flex flex-col font-serif overflow-hidden rounded-[2rem] shadow-2xl"
        >
            {/* Header Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#FDFBF7]/90 backdrop-blur-md z-10 border-b border-stone-200/50">
                <button onClick={onClose} className="p-2 -ml-2 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-stone-400 text-xs tracking-widest uppercase">Reader View</span>
                <div className="w-9" /> {/* Spacer */}
            </div>

            {/* Typography Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-16">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl md:text-5xl font-bold text-stone-900 mb-8 leading-tight">{story.title}</h1>

                    <div className="text-xl md:text-2xl leading-loose text-stone-800 space-x-2">
                        {words.map((w: string, i: number) => {
                            const cleanW = w.replace(/[.,()]/g, '');
                            const isLookupable = story.dictionary[cleanW] || (cleanW === "Bơ" && story.dictionary["Bơ tơ̆k đe đe"]);

                            return (
                                <span
                                    key={i}
                                    onClick={() => handleWordClick(w)}
                                    className={`inline-block transition-colors ${isLookupable ? 'cursor-pointer hover:bg-orange-100 hover:text-orange-900 border-b-2 border-orange-200/50' : ''
                                        } ${selectedWord && w.includes(selectedWord.split(' ')[0]) ? 'bg-orange-100 text-orange-900' : ''}`}
                                >
                                    {w}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Dictionary Tooltip Popup (Bottom Sheet) */}
            <AnimatePresence>
                {selectedWord && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.08)] rounded-t-[2rem] border-t border-stone-100 p-6 md:p-8 z-20"
                    >
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-3xl font-bold text-stone-900">{selectedWord}</h3>
                                    <p className="text-lg text-emerald-600 font-medium mt-1">
                                        {story.dictionary[selectedWord]?.meaning}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedWord(null)}
                                    className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-6">
                                <button className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-900 py-3.5 rounded-2xl font-bold hover:bg-stone-200 transition-colors">
                                    <Volume2 className="w-5 h-5" />
                                    Nghe mẫu
                                </button>

                                <button
                                    onMouseDown={handleHoldStart}
                                    onMouseUp={handleHoldEnd}
                                    onTouchStart={handleHoldStart}
                                    onTouchEnd={handleHoldEnd}
                                    disabled={isScoring}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all relative ${isScoring ? 'bg-stone-200 text-stone-400 cursor-not-allowed' :
                                        isRecording ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105' : 'bg-stone-900 text-white hover:bg-stone-800'
                                        }`}
                                >
                                    {isScoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                    {isScoring ? 'Đang chấm...' : isRecording ? 'Đang thu âm' : 'Giữ để đọc'}
                                </button>

                                <button
                                    onClick={handleSaveWord}
                                    className={`w-14 h-14 flex flex-shrink-0 items-center justify-center rounded-2xl border-2 transition-all ${savedWords.includes(selectedWord)
                                        ? 'bg-orange-50 border-orange-500 text-orange-500'
                                        : 'border-stone-200 text-stone-400 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500'
                                        }`}
                                >
                                    {savedWords.includes(selectedWord) ? <Check className="w-6 h-6 stroke-[3]" /> : <Star className="w-6 h-6" />}
                                </button>
                            </div>

                            {/* Kết quả chấm điểm AI */}
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

                            {!savedWords.includes(selectedWord) && !scoreResult && (
                                <p className="text-center text-xs text-stone-400 font-medium mt-4">
                                    *Lưu từ vựng này vào Phòng Củng Cố
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay to dismiss tooltip */}
            <AnimatePresence>
                {selectedWord && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedWord(null)}
                        className="absolute inset-0 bg-stone-900/10 z-10"
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
