import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, CheckCircle2, ChevronRight, X, Volume2, Mic, Loader2, BookOpen } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { fetchWithMonitor } from '../../lib/monitor';
import { triggerConfetti } from '../../lib/confetti';
import { Lesson } from '../../types';

interface VocabWord {
    word: string;
    meaning: string;
    audio_api?: string;
    image_url?: string;
}

export function VocabularyRoom() {
    const navigate = useNavigate();
    const { user, token } = useUserStore();
    const [completedLessons, setCompletedLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selected Topic State
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [topicWords, setTopicWords] = useState<VocabWord[]>([]);
    const [isLoadingWords, setIsLoadingWords] = useState(false);
    
    // Voice Practice State
    const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [scoreResult, setScoreResult] = useState<{ score: number, feedback: string } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const fetchCompletedTopics = async () => {
            setIsLoading(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                if (!token) return;

                const response = await fetchWithMonitor<{ data: Lesson[] } | Lesson[]>(
                    `${API_URL}/api/v1/lessons`,
                    { headers: { Authorization: `Bearer ${token}` } },
                    'ziczac_lessons_cache_v2',
                    10000
                );

                const list = Array.isArray(response) ? response : (response?.data ?? []);
                const completedIds = user?.completedLessons || [];
                const completed = list.filter(l => completedIds.includes(l.id));
                
                setCompletedLessons(completed);
            } catch (err) {
                console.warn('Fallback cache for vocabulary', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCompletedTopics();
    }, [token, user?.completedLessons]);

    const openLessonTopic = async (lesson: Lesson) => {
        setSelectedLesson(lesson);
        setIsLoadingWords(true);
        setTopicWords([]);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetchWithMonitor<any[] | { data: any[] }>(
                `${API_URL}/api/v1/lessons/${lesson.id}/steps`,
                { headers: { Authorization: `Bearer ${token}` } },
                `lesson_steps_${lesson.id}`
            );

            const list = Array.isArray(response) ? response : (response?.data ?? []);
            
            const wordsMap = new Map<string, VocabWord>();

            list.forEach((s: any) => {
                const raw = typeof s.content === 'string' ? JSON.parse(s.content) : s.content || {};
                
                // Extract from flashcards
                if (raw.word && typeof raw.word === 'string') {
                    wordsMap.set(raw.word.toLowerCase(), {
                        word: raw.word,
                        meaning: raw.meaning || '',
                        audio_api: raw.audio_api,
                        image_url: raw.image_url
                    });
                }
                
                // Extract from quizzes if they have words/meaning pairs
                if (raw.words && Array.isArray(raw.words) && raw.meaning) {
                    // Usually quizzes don't map 1:1, but if correct_answer exists
                    if (s.correct_answer && typeof s.correct_answer === 'string') {
                         if (!wordsMap.has(s.correct_answer.toLowerCase())) {
                             wordsMap.set(s.correct_answer.toLowerCase(), {
                                 word: s.correct_answer,
                                 meaning: raw.meaning || s.hint || 'Từ vựng ôn tập'
                             });
                         }
                    }
                }
            });

            setTopicWords(Array.from(wordsMap.values()));
        } catch (error) {
            console.error("Failed to load topic words", error);
        } finally {
            setIsLoadingWords(false);
        }
    };

    const handlePlaySample = async (word: VocabWord) => {
        setIsPlaying(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            
            // Dùng audio có sẵn nếu có, ngược lại gọi Edge TTS
            if (word.audio_api) {
                const audio = new Audio(`${API_URL}${word.audio_api}`);
                await audio.play();
                await new Promise(resolve => audio.onended = resolve);
            } else {
                const res = await fetch(`${API_URL}/api/v1/ai/pronounce?word=${encodeURIComponent(word.word)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                const base64Audio = data.data?.audio_base64 || data.audio_base64;
                if (base64Audio) {
                    const audio = new Audio(base64Audio);
                    await audio.play();
                    await new Promise(resolve => audio.onended = resolve);
                }
            }
        } catch(e) {
            console.error("Lỗi khi nghe mẫu", e);
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
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
            console.error('Mic error:', error);
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
                reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.readAsDataURL(blob);
            });

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetchWithMonitor<{ data: any } | any>(
                `${API_URL}/api/v1/ai/score-pronunciation`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type, expectedText: selectedWord?.word || '' })
                },
                undefined,
                15000
            );

            const result = 'score' in response ? response : response.data;
            setScoreResult({ score: result.score, feedback: result.feedback });
            if (result.score >= 80) triggerConfetti();
        } catch (error) {
            setScoreResult({ score: 0, feedback: 'Kết nối kém hoặc có lỗi. Xin thử lại.' });
        } finally {
            setIsScoring(false);
        }
    };


    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                        <Library className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-stone-800 tracking-tight">Từ vựng & Ngữ âm</h1>
                        <p className="text-stone-500 font-medium">Luyện tập những từ bạn đã học</p>
                    </div>
                </div>
            </div>

            {/* Grid of Topics */}
            {isLoading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12 w-full">
                    
                    {/* Special Alphabet Card */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/alphabet')}
                        className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-5 flex flex-col cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white text-indigo-500 flex items-center justify-center mb-4 shadow-sm">
                            <span className="text-2xl font-black font-serif">A</span>
                        </div>
                        <h3 className="font-bold text-lg text-indigo-900 mb-1">Bảng chữ cái</h3>
                        <p className="text-indigo-600/80 text-sm font-medium">Luyện 88 chữ cái và tổ hợp âm Ba Na nền tảng.</p>
                        
                        <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 text-[100px] opacity-5 pointer-events-none font-serif font-black text-indigo-900">
                            A
                        </div>
                    </motion.div>

                    {/* Lesson Topics */}
                    {completedLessons.map((lesson, idx) => (
                        <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openLessonTopic(lesson)}
                            className="bg-white border-2 border-stone-100 rounded-3xl p-5 flex flex-col cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md hover:border-emerald-100 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="font-bold text-lg text-stone-800 mb-1">{lesson.topic}</h3>
                            <p className="text-stone-500 text-sm font-medium line-clamp-1">Từ vựng đã học trong bài Cấp độ {lesson.difficulty || 1}</p>
                            
                            <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </motion.div>
                    ))}
                    
                    {completedLessons.length === 0 && (
                        <div className="col-span-full py-10 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
                            <p className="text-stone-500 font-medium text-center max-w-sm">
                                Bạn chưa hoàn thành bài học nào. Hãy học ở Phòng Học để mở khóa các chủ đề từ vựng ở đây nhé!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Topic Vocabulary Modal */}
            <AnimatePresence>
                {selectedLesson && (
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[60] flex flex-col bg-[#FDFBF7]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-stone-100 sticky top-0 z-10 shadow-sm">
                            <button onClick={() => setSelectedLesson(null)} className="p-2 -ml-2 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <span className="font-bold text-stone-900 text-lg">{selectedLesson.topic}</span>
                            <div className="w-9" />
                        </div>

                        {/* Words List */}
                        <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
                            {isLoadingWords ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                </div>
                            ) : topicWords.length === 0 ? (
                                <div className="text-center py-20 text-stone-500">
                                    <p className="font-medium text-lg mb-2">Không tìm thấy từ vựng rõ ràng trong bài này!</p>
                                    <p className="text-sm">Bài học này có thể thiên về luyện ngữ pháp hoặc mẫu câu.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {topicWords.map((word, idx) => (
                                        <motion.div
                                            key={idx}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { setSelectedWord(word); setScoreResult(null); }}
                                            className="bg-white border-2 border-stone-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-emerald-200 hover:shadow-sm"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-black text-lg text-stone-800">{word.word}</span>
                                                <span className="text-sm font-medium text-stone-500">{word.meaning}</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                                <Mic className="w-5 h-5" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pronunciation Practice Modal (Bottom Sheet over the Topic Modal) */}
            <AnimatePresence>
                {selectedWord && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.1)] rounded-t-[2rem] border-t border-stone-200 p-6 md:p-8 z-[70]"
                    >
                        <div className="max-w-2xl mx-auto relative">
                            <button
                                onClick={() => setSelectedWord(null)}
                                className="absolute right-0 top-0 p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="flex flex-col items-center mb-6 pt-2">
                                {selectedWord.image_url ? (
                                    <img src={selectedWord.image_url} alt={selectedWord.word} className="w-32 h-32 object-contain mb-4 rounded-2xl" />
                                ) : (
                                    <div className="w-20 h-20 mb-4 rounded-[2rem] bg-emerald-50 flex items-center justify-center">
                                        <BookOpen className="w-8 h-8 text-emerald-500" />
                                    </div>
                                )}
                                <h2 className="text-4xl font-black text-stone-800 tracking-tight text-center">{selectedWord.word}</h2>
                                <p className="text-lg font-bold text-stone-500 mt-1">{selectedWord.meaning}</p>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-6">
                                <button 
                                    onClick={() => handlePlaySample(selectedWord)} 
                                    disabled={isPlaying || isScoring}
                                    className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-900 py-3.5 rounded-2xl font-bold hover:bg-stone-200 transition-colors">
                                    {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                                    Nghe mẫu
                                </button>

                                <button
                                    onMouseDown={handleHoldStart}
                                    onMouseUp={handleHoldEnd}
                                    onTouchStart={handleHoldStart}
                                    onTouchEnd={handleHoldEnd}
                                    disabled={isPlaying || isScoring}
                                    className={`flex-1 flex max-w-[200px] items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all relative ${isScoring ? 'bg-stone-200 text-stone-400 cursor-not-allowed' :
                                        isRecording ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105' : 'bg-stone-900 text-white hover:bg-stone-800'
                                    }`}
                                >
                                    {isScoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                    {isScoring ? 'Đang chấm...' : isRecording ? 'Đang đọc' : 'Giữ để đọc'}
                                </button>
                            </div>

                            {scoreResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mt-6 p-4 rounded-2xl border ${scoreResult.score >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
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

            {/* Overlays */}
            <AnimatePresence>
                {selectedWord && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-stone-900/20 z-[65]" onClick={() => setSelectedWord(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
