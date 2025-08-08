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
-- Users fitness profile
CREATE TABLE user_profiles {
  id UUID REFERENCES users(id) PRIMARY KEY,
  height DECIMAL(5,2),
  weight DECIMAL(5,2), 
  age INTEGER,
  gender VARCHAR(10),
  activity_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
      };

-- Fitness goals
CREATE TABLE fitness_goals {
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  goal_type VARCHAR(50), -- 'weight_loss', 'muscle_gain', 'endurance'
  target_value DECIMAL(8,2),
  current_value DECIMAL(8,2) DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
    };

-- Exercise database
CREATE TABLE exercises {
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- 'cardio', 'strength', 'flexibility'
  muscle_group VARCHAR(100),
  description TEXT,
  calories_per_minute DECIMAL(4,2),
  created_at TIMESTAMP DEFAULT NOW()
};

-- Workout sessions
CREATE TABLE workout_sessions {
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  exercise_id UUID REFERENCES exercises(id),
  duration_minutes INTEGER,
  calories_burned DECIMAL(6,2),
  notes TEXT,
  completed_at TIMESTAMP DEFAULT NOW()
};

-- Nutrition entries  
CREATE TABLE nutrition_entries {
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  food_name VARCHAR(255),
  calories DECIMAL(6,2),
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fat DECIMAL(5,2),
  meal_type VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snack'
  logged_at TIMESTAMP DEFAULT NOW()
};

-- Progress tracking
CREATE TABLE progress_entries {
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  measurement_type VARCHAR(50), -- 'weight', 'body_fat', 'muscle_mass'
  value DECIMAL(6,2),
  recorded_at TIMESTAMP DEFAULT NOW()
{;

      }
      // Add other table types as needed
    }
  }
} 
