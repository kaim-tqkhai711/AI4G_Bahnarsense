import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Volume2, Star, Check, Mic, Loader2 } from 'lucide-react';
import { triggerConfetti } from '../../lib/confetti';
import { useUserStore } from '../../store/useUserStore';
import { fetchWithMonitor } from '../../lib/monitor';
import { supabase } from '../../lib/supabase';

type DictionaryEntry = {
    meaning: string;
    audioUrl: string;
};

export type StoryType = {
    id: number;
    title: string;
    description: string;
    image_url: string;
    tags: string[];
    content_bahnar: string;
    content_viet: string;
    dictionary: Record<string, DictionaryEntry>;
    quizzes: Array<{ type: string, question: string, options: string[], correct_answer: string }>;
};

export function StoriesRoom() {
    const [stories, setStories] = useState<StoryType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStory, setActiveStory] = useState<number | null>(null);

    useEffect(() => {
        async function fetchStories() {
            try {
                const { data, error } = await supabase.from('ReadStoryRoom').select('*').order('id', { ascending: true });
                if (error) throw error;
                if (data) {
                    // Safe parse JSON fields in case they are returned as strings
                    const parsedData = data.map((item: any) => ({
                        ...item,
                        tags: typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags,
                        dictionary: typeof item.dictionary === 'string' ? JSON.parse(item.dictionary) : item.dictionary,
                        quizzes: typeof item.quizzes === 'string' ? JSON.parse(item.quizzes) : item.quizzes
                    }));
                    setStories(parsedData as StoryType[]);
                }
            } catch (err) {
                console.error("Lỗi tải truyện", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStories();
    }, []);

    // Màn hình loading
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-stone-500 font-bold">Đang tải thư viện truyện...</p>
            </div>
        );
    }

    // Màn hình chọn Truyện (Grid view)
    if (activeStory === null) {
        return (
            <div className="flex flex-col h-full w-full bg-white relative">
                <div className="pb-6 pt-2 border-b border-stone-100 flex items-center justify-between mb-8">
                    <div>
                        <h2 className="font-bold text-stone-900 text-2xl tracking-tight">Thư viện Truyện</h2>
                        <p className="text-stone-500 text-sm font-medium">Khám phá văn hóa Ba Na</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                    {stories.map((story) => (
                        <motion.div
                            layoutId={`story-container-${story.id}`}
                            key={story.id}
                            onClick={() => setActiveStory(story.id)}
                            className="relative aspect-video rounded-3xl overflow-hidden cursor-pointer shadow-sm group border border-stone-100"
                        >
                            <img src={story.image_url} alt={story.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent" />

                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {story.tags && story.tags.map(tag => (
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
                    
                    {stories.length === 0 && (
                        <div className="col-span-full text-center py-20 text-stone-500">
                            Chưa có truyện nào trong thư viện.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const story = stories.find(s => s.id === activeStory)!;

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
    const [isPlaying, setIsPlaying] = useState(false);
    const [scoreResult, setScoreResult] = useState<{ score: number, feedback: string, wrong_words?: string[] } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [showQuiz, setShowQuiz] = useState(false);

    if (showQuiz && story.quizzes && story.quizzes.length > 0) {
        return <StoryQuiz quizzes={story.quizzes} onClose={onClose} storyTitle={story.title} />;
    }

    // Tách chuỗi thành mảng các từ, ưu tiên cụm từ trong từ điển (Mock logic: Split by space)
    // Ở bản Real: Ta sẽ map content bằng Regex tìm match key keys(dictionary).
    const words = story.content_bahnar ? story.content_bahnar.split(' ') : [];

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
            const response = await fetchWithMonitor<{ score: number, feedback: string, wrong_words?: string[] } | { data: { score: number, feedback: string, wrong_words?: string[] } }>(
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
            setScoreResult({ score: result.score, feedback: result.feedback, wrong_words: result.wrong_words });
            if (result.score >= 80) triggerConfetti();
        } catch (error) {
            console.error(error);
            setScoreResult({ score: 0, feedback: 'Kết nối kém hoặc có lỗi. Xin thử lại.' });
        } finally {
            setIsScoring(false);
        }
    };

    const handlePlaySample = async () => {
        if (!selectedWord) return;
        setIsPlaying(true);
        try {
            const dictEntry = story.dictionary[selectedWord];
            
            // 1. Nếu từ điển đã có sẵn file âm thanh thật (Phương án 1 - Supabase)
            if (dictEntry && dictEntry.audioUrl && !dictEntry.audioUrl.includes('mock.mp3')) {
                const audio = new Audio(dictEntry.audioUrl);
                await audio.play();
                // Chờ audio phát xong để tắt icon Loading
                await new Promise(resolve => audio.onended = resolve);
                return;
            }

            // 2. Nếu từ chưa được gán file thu âm, gọi chữa cháy bằng AI TTS
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/v1/ai/pronounce?word=${encodeURIComponent(selectedWord)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                throw new Error("Server AI phát âm hiện đang tắt");
            }

            const data = await res.json();
            const base64Audio = data.data?.audio_base64 || data.audio_base64;
            if (base64Audio) {
                const audio = new Audio(base64Audio);
                await audio.play();
                await new Promise(resolve => audio.onended = resolve);
            } else {
                throw new Error("Không có Audio Base64");
            }
        } catch(e) {
            console.error("Lỗi khi nghe mẫu", e);
            alert("⚠️ Âm thanh mẫu chưa sẵn sàng (Vui lòng tự giác luyện đọc).");
        } finally {
            setIsPlaying(false);
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
                            const cleanW = w.replace(/[.,()!?]/g, '');
                            const dictionary = story.dictionary || {};
                            const isLookupable = dictionary[cleanW] || (cleanW === "Bơ" && dictionary["Bơ tơ̆k đe đe"]);

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

                    {/* Tiếng Việt Translation */}
                    {story.content_viet && (
                        <div className="mt-16 p-6 md:p-8 bg-stone-50 rounded-[2rem] border border-stone-200/60 relative">
                            <span className="absolute -top-3 left-6 bg-stone-200 text-stone-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-stone-300/50">
                                Bản dịch Tiếng Việt
                            </span>
                            <p className="text-lg md:text-xl text-stone-600 leading-relaxed italic">
                                {story.content_viet}
                            </p>
                        </div>
                    )}

                    {/* Quiz Button */}
                    {story.quizzes && story.quizzes.length > 0 && (
                        <div className="mt-16 flex justify-center pb-20">
                            <button 
                                onClick={() => setShowQuiz(true)}
                                className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-transform"
                            >
                                Hoàn thành & Làm Bài trắc nghiệm
                            </button>
                        </div>
                    )}
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
                                    <h3 className="text-3xl font-bold text-stone-900 leading-normal flex flex-wrap">
                                        {selectedWord.split(' ').map((wordPart, idx) => {
                                            const cleanPart = wordPart.replace(/[.,()]/g, '').toLowerCase();
                                            const isWrong = scoreResult?.wrong_words?.map((w:string) => w.toLowerCase()).includes(cleanPart);
                                            const colorClass = scoreResult ? (isWrong ? 'text-red-500' : 'text-green-500') : 'text-stone-900';
                                            return <span key={idx} className={`${colorClass} mr-2 transition-colors duration-500`}>{wordPart}</span>
                                        })}
                                    </h3>
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

// Quiz component
function StoryQuiz({ quizzes, onClose, storyTitle }: { quizzes: StoryType['quizzes'], onClose: () => void, storyTitle: string }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);

    const quiz = quizzes[currentIdx];

    const handleNext = (opt: string) => {
        setSelectedOpt(opt);
        setTimeout(() => {
            if (currentIdx < quizzes.length - 1) {
                setCurrentIdx(prev => prev + 1);
                setSelectedOpt(null);
            } else {
                setIsFinished(true);
                triggerConfetti();
            }
        }, 1000);
    };

    if (isFinished) {
         return (
             <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="absolute inset-0 z-50 bg-[#FDFBF7] flex flex-col items-center justify-center font-serif text-center p-8 rounded-[2rem]"
             >
                 <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                     <Star className="w-12 h-12 fill-current" />
                 </div>
                 <h2 className="text-3xl font-bold text-stone-900 mb-4">Tuyệt vời!</h2>
                 <p className="text-stone-500 mb-8 max-w-sm">Bạn đã đọc xong truyện "{storyTitle}" và hoàn thành xuất sắc các bài tập.</p>
                 <button onClick={onClose} className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold border-2 border-stone-900 hover:bg-white hover:text-stone-900 transition-colors">
                     Quay về thư viện Truyện
                 </button>
             </motion.div>
         )
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 bg-[#FDFBF7] flex flex-col font-serif rounded-[2rem] overflow-hidden shadow-2xl"
        >
             <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/50">
                <button onClick={onClose} className="p-2 -ml-2 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                    {quizzes.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentIdx ? 'w-8 bg-emerald-500' : i < currentIdx ? 'w-4 bg-emerald-200' : 'w-4 bg-stone-200'}`} />
                    ))}
                </div>
                <div className="w-9" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-2xl mx-auto w-full">
                <span className="text-emerald-500 font-bold tracking-wider uppercase text-sm mb-4 bg-emerald-50 px-3 py-1 rounded-full">Câu hỏi {currentIdx + 1}/{quizzes.length}</span>
                <h3 className="text-2xl md:text-3xl font-bold text-stone-900 text-center mb-10 leading-tight">
                    {quiz.question}
                </h3>

                <div className="w-full flex flex-col gap-4">
                    {quiz.options.map((opt, idx) => {
                        const isSelected = selectedOpt === opt;
                        const isCorrect = isSelected && opt === quiz.correct_answer;
                        
                        return (
                             <button
                                key={idx}
                                onClick={() => {
                                    if (selectedOpt) return;
                                    if (opt === quiz.correct_answer) {
                                        handleNext(opt); 
                                    } else {
                                        setSelectedOpt(opt);
                                        setTimeout(() => setSelectedOpt(null), 800);
                                    }
                                }}
                                className={`w-full p-5 rounded-2xl border-2 text-left font-bold text-lg transition-all active:scale-95
                                   ${isSelected ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-rose-50 border-rose-500 text-rose-600 translate-x-1') : 'border-stone-200 text-stone-700 hover:border-emerald-200 hover:bg-emerald-50/50'}`}
                             >
                                 {opt}
                             </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
