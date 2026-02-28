import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserState } from '../types';

interface AuthState {
    user: UserState | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: UserState, token: string) => void;
    updateUser: (updates: Partial<UserState>) => void;
    logout: () => void;
}

export const useUserStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: 'bahnar-user-storage',
        }
    )
);
