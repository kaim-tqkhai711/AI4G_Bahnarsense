import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { trackDropOff, trackEvent, fetchWithMonitor } from '../../lib/monitor';
import { auth, googleProvider, facebookProvider, signInWithPopup, fetchSignInMethodsForEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { useUserStore } from '../../store/useUserStore';
import { Loader2, Mail, ArrowRight, User, Lock } from 'lucide-react';

const FUN_FACTS = [
    "Bạn có biết: Nhà rông là trái tim của làng Ba Na?",
    "Người Ba Na rất yêu âm nhạc, đặc biệt là cồng chiêng!",
    "Học thêm một ngôn ngữ là sống thêm một cuộc đời mới.",
    "Cùng KơRai khám phá núi rừng Tây Nguyên qua từng từ vựng nhé!"
];

export function WelcomeScreen() {
    const navigate = useNavigate();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { setAuth } = useUserStore();
    const [funFact, setFunFact] = useState(FUN_FACTS[0]);

    // Unified Email Flow state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'login' | 'signup'>('idle');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const start = Date.now();
        setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
        return () => {
            const timeSpent = Date.now() - start;
            if (timeSpent < 10000 && !useUserStore.getState().isAuthenticated) {
                trackDropOff('WelcomeScreen', timeSpent);
            }
        };
    }, []);

    const processLoginResponse = async (user: FirebaseUser, provider: string) => {
        try {
            const token = await user.getIdToken();
            const response = await fetchWithMonitor<{ isNewUser: boolean; user: Record<string, unknown> }>(
                'http://localhost:8000/api/v1/auth/login',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                },
                'auth_login',
                6000
            );

            const dbUser = response.user;

            setAuth({
                id: (dbUser.id as string) || user.uid,
                name: (dbUser.name as string) || user.displayName || 'Học sinh mới',
                level: dbUser.level as string | undefined,
                xp: (dbUser.xp as number) || 0,
                sao_vang: (dbUser.sao_vang as number) || 0,
                gems: (dbUser.gems as number) || 0,
                streak: (dbUser.streak as number) || 0,
                inventory: (dbUser.inventory as string[]) || [],
                equippedItems: (dbUser.equippedItems as Record<string, string>) || {},
                completedLessons: (dbUser.completedLessons as string[]) || [],
                isGuest: false,
            }, token);

            if (response.isNewUser || !dbUser.level) {
                navigate('/survey');
            } else {
                navigate('/');
            }
        } catch (err: unknown) {
            console.error("Sync API failed", err);
            setAuthError(err instanceof Error ? err.message : String(err));
            trackEvent('login_error', { provider, msg: String(err) });
        }
    };

    const handleSocialLogin = async (providerName: 'google' | 'facebook') => {
        setIsLoggingIn(true);
        setAuthError('');
        trackEvent('welcome_action_click', { action: `${providerName}_login` });

        try {
            const provider = providerName === 'google' ? googleProvider : facebookProvider;
            const result = await signInWithPopup(auth, provider);
            await processLoginResponse(result.user, providerName);
        } catch (error: unknown) {
            console.error("Login failed", error);
            setAuthError('Đăng nhập thất bại.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleGuestLogin = () => {
        trackEvent('welcome_action_click', { action: 'guest_login' });
        setAuth({
            id: 'guest-1',
            name: 'Học sinh Ba Na',
            level: 'A1',
            xp: 1250,
            sao_vang: 450,
            gems: 25,
            streak: 5,
            inventory: ['item_hat_1', 'item_glasses_1'],
            equippedItems: { accessory: 'item_hat_1' },
            completedLessons: ['l-1', 'l-2'],
            isGuest: true,
        }, 'mock-token');

        navigate('/');
    };

    const checkEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoggingIn(true);
        setAuthError('');
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length > 0) {
                setEmailStatus('login');
            } else {
                setEmailStatus('signup');
            }
        } catch (err) {
            console.error(err);
            setAuthError('Email không hợp lệ.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setAuthError('');
        try {
            if (emailStatus === 'login') {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await processLoginResponse(userCredential.user, 'email_login');
            } else if (emailStatus === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Optionally update profile with Name here via Firebase updateProfile
                await processLoginResponse(userCredential.user, 'email_signup');
            }
        } catch (err: unknown) {
            console.error(err);
            setAuthError(err instanceof Error ? err.message : 'Lỗi đăng nhập/đăng ký.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="absolute top-[-10%] -left-[10%] w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-[-10%] -right-[10%] w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-50" />

            {/* Emotional Mascot Section */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="mb-8 relative z-10 w-full max-w-sm"
            >
                <div className="relative w-full h-40 mx-auto flex justify-center items-end">
                    {/* Speech Bubble */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute -top-6 right-0 bg-white border border-stone-200 shadow-lg rounded-2xl rounded-br-none p-4 max-w-[200px] text-xs font-medium text-stone-600 text-left z-20"
                    >
                        {funFact}
                    </motion.div>

                    {/* Simple CSS Mascot Placeholder */}
                    <motion.div
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="w-28 h-28 bg-orange-400 rounded-[40%] flex justify-center items-center shadow-lg relative z-10"
                    >
                        <div className="absolute top-8 left-6 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-stone-900 rounded-full" />
                        </div>
                        <div className="absolute top-8 right-6 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-stone-900 rounded-full" />
                        </div>
                        <div className="absolute bottom-6 w-8 h-4 bg-red-500 rounded-b-full overflow-hidden" />
                    </motion.div>
                </div>
                <h1 className="text-4xl font-extrabold text-primary tracking-tight mt-6">Ba Na Học</h1>
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full max-w-sm space-y-4 relative z-10"
            >
                {/* Error Message */}
                <AnimatePresence>
                    {authError && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-sm mb-4">
                            {authError}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SSO Priority */}
                {emailStatus === 'idle' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => handleSocialLogin('google')}
                            disabled={isLoggingIn}
                            className="w-full flex justify-center items-center gap-3 bg-white border-2 border-stone-200 text-stone-700 font-bold py-4 rounded-2xl shadow-sm hover:bg-stone-50 active:scale-95 transition-all text-[16px]"
                        >
                            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                            )}
                            Tiếp tục với Google
                        </button>

                        <button
                            onClick={() => handleSocialLogin('facebook')}
                            disabled={isLoggingIn}
                            className="w-full flex justify-center items-center gap-3 bg-[#1877F2] text-white font-bold py-4 rounded-2xl shadow-sm hover:bg-[#166FE5] active:scale-95 transition-all text-[16px]"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            Tiếp tục với Facebook
                        </button>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-stone-200"></div>
                            <span className="flex-shrink-0 mx-4 text-stone-400 text-sm font-semibold">Hoặc dùng Email</span>
                            <div className="flex-grow border-t border-stone-200"></div>
                        </div>

                        <form onSubmit={checkEmail} className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                                <input
                                    type="email"
                                    placeholder="Nhập email của bạn..."
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-[15px] font-medium placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoggingIn || !email}
                                className="bg-stone-800 text-white p-3.5 rounded-xl hover:bg-stone-900 active:scale-95 transition-transform disabled:opacity-50"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                )}

                {/* Email Login/Signup Form */}
                {emailStatus !== 'idle' && (
                    <motion.form
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        onSubmit={handleEmailAuth}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between text-left mb-2">
                            <button type="button" onClick={() => setEmailStatus('idle')} className="text-sm font-bold text-stone-500 hover:text-stone-800">
                                ← Quay lại
                            </button>
                            <span className="text-sm font-bold text-stone-400 border border-stone-200 px-3 py-1 rounded-full">{email}</span>
                        </div>

                        {emailStatus === 'signup' && (
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="Họ và Tên"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input
                                type="password"
                                placeholder={emailStatus === 'signup' ? "Tạo mật khẩu" : "Nhập mật khẩu"}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {emailStatus === 'login' && (
                            <div className="text-right">
                                <button type="button" className="text-primary text-sm font-bold">Quên mật khẩu?</button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn || !password}
                            className="w-full bg-primary hover:bg-[#438a66] text-white py-4 rounded-2xl font-bold text-[16px] flex justify-center items-center gap-2 transition-all"
                        >
                            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (emailStatus === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập')}
                        </button>
                    </motion.form>
                )}

                {/* Guest Mode fallback */}
                {emailStatus === 'idle' && (
                    <div className="pt-6">
                        <button
                            onClick={handleGuestLogin}
                            className="text-stone-400 font-bold text-sm hover:text-stone-600 transition-colors"
                        >
                            Chơi thử không cần tài khoản
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
