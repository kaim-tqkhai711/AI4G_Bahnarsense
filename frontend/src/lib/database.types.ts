export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string
                    avatar_url: string | null
                    role: 'student' | 'admin'
                    level: number
                    xp: number
                    gongs: number
                    gems: number
                    streak: number
                    last_study_date: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    username: string
                    avatar_url?: string | null
                    role?: 'student' | 'admin'
                    level?: number
                    xp?: number
                    gongs?: number
                    gems?: number
                    streak?: number
                    last_study_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    username?: string
                    avatar_url?: string | null
                    role?: 'student' | 'admin'
                    level?: number
                    xp?: number
                    gongs?: number
                    gems?: number
                    streak?: number
                    last_study_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            topics: {
                Row: {
                    id: string
                    title_vn: string
                    title_bana: string
                    theme_color: string
                    order_index: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title_vn: string
                    title_bana: string
                    theme_color: string
                    order_index?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title_vn?: string
                    title_bana?: string
                    theme_color?: string
                    order_index?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            lessons: {
                Row: {
                    id: string
                    topic_id: string
                    type: 'vocab' | 'grammar' | 'culture'
                    difficulty: number
                    xp_reward: number
                    title: string
                    is_published: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    topic_id: string
                    type: 'vocab' | 'grammar' | 'culture'
                    difficulty: number
                    xp_reward?: number
                    title: string
                    is_published?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    topic_id?: string
                    type?: 'vocab' | 'grammar' | 'culture'
                    difficulty?: number
                    xp_reward?: number
                    title?: string
                    is_published?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            user_role: 'student' | 'admin'
            lesson_type: 'vocab' | 'grammar' | 'culture'
        }
    }
}
