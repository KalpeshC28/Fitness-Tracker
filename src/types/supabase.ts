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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          is_verified: boolean
          role: 'user' | 'admin'
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          is_verified?: boolean
          role?: 'user' | 'admin'
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          is_verified?: boolean
          role?: 'user' | 'admin'
        }
      }
      // Add other table types as needed
    }
  }
} 