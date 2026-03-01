import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../store/useUserStore';
import { fetchWithMonitor } from '../../lib/monitor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * This page is the OAuth redirect target. Supabase sends the user here with tokens in the URL.
 * We recover the session, sync with the backend, then redirect to the app.
 */
export function AuthCallback() {
    const navigate = useNavigate();
    const { setAuth, isAuthenticated } = useUserStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
            return;
        }

        let cancelled = false;

        const syncWithBackend = async (accessToken: string) => {
            try {
                const response = await fetchWithMonitor<{ isNewUser: boolean; user: Record<string, unknown> }>(
                    `${API_URL}/api/v1/auth/login`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: accessToken }),
                    },
                    undefined,
                    10000
                );

                const dbUser = response.user;
                setAuth(
                    {
                        id: (dbUser.id as string) ?? '',
                        name: (dbUser.name as string) || (dbUser.username as string) || 'Học sinh mới',
                        level: dbUser.level as string | undefined,
                        xp: (dbUser.xp as number) ?? 0,
                        sao_vang: (dbUser.sao_vang as number) ?? 0,
                        gems: (dbUser.gems as number) ?? 0,
                        streak: (dbUser.streak as number) ?? 0,
                        inventory: (dbUser.inventory as string[]) ?? [],
                        equippedItems: (dbUser.equippedItems as Record<string, string>) ?? {},
                        completedLessons: (dbUser.completedLessons as string[]) ?? [],
                        isGuest: false,
                    },
                    accessToken
                );

                if (response.isNewUser || !dbUser.level) {
                    navigate('/survey', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            }
        };

        // If Supabase put tokens in the hash (#access_token=...), set session from it
        const setSessionFromHash = async (): Promise<string | null> => {
            const hash = window.location.hash?.replace(/^#/, '');
            if (!hash) return null;
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
                const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
                if (!setErr) return access_token;
            }
            return null;
        };

        const tryGetSession = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) return null;
            return session?.access_token ?? null;
        };

        const handleSession = async () => {
            // 1) Try to recover from URL hash (implicit flow)
            let token: string | null = await setSessionFromHash();
            if (token && !cancelled) {
                await syncWithBackend(token);
                return true;
            }
            // 2) Session may already be set by client (PKCE or detectSessionInUrl)
            token = await tryGetSession();
            if (token && !cancelled) {
                await syncWithBackend(token);
                return true;
            }
            await new Promise((r) => setTimeout(r, 400));
            token = await tryGetSession();
            if (token && !cancelled) {
                await syncWithBackend(token);
                return true;
            }
            await new Promise((r) => setTimeout(r, 600));
            token = await tryGetSession();
            if (token && !cancelled) {
                await syncWithBackend(token);
                return true;
            }
            return false;
        };

        const timeout = setTimeout(async () => {
            if (cancelled) return;
            const done = await handleSession();
            if (!done && !cancelled) {
                setError('Không nhận được phiên đăng nhập. Thử đăng nhập lại.');
                setTimeout(() => navigate('/welcome', { replace: true }), 2000);
            }
        }, 50);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (cancelled || !session?.access_token) return;
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                await syncWithBackend(session.access_token);
            }
        });

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [navigate, setAuth, isAuthenticated]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
                <p className="text-red-600 text-center mb-4">{error}</p>
                <p className="text-stone-500 text-sm">Đang chuyển về trang đăng nhập...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-stone-600 font-semibold">Đang đăng nhập...</p>
        </div>
    );
}
