
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = 'https://uaxwrnjlttlohwcgwabx.supabase.co';
let supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheHdybmpsdHRsb2h3Y2d3YWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDU1ODQsImV4cCI6MjA4MDgyMTU4NH0.5IZwhbHWTUthEr7UebWg5Fd4RY8krxvJG93CztnQnJc';

try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    const env = import.meta.env;
    // Only overwrite if the environment variable is actually defined
    if (env.VITE_SUPABASE_URL) {
        supabaseUrl = env.VITE_SUPABASE_URL;
    }
    if (env.VITE_SUPABASE_ANON_KEY) {
        supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
    }
  }
} catch (error) {
  console.warn("Error reading environment variables:", error);
}

let supabaseInstance;

if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("Supabase credentials missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel project settings.");
    
    // Create a mock client that prevents crashes but returns errors for all operations
    supabaseInstance = {
        from: (table: string) => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } }),
                    maybeSingle: () => Promise.resolve({ data: null, error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } })
                }),
                then: (cb: any) => Promise.resolve({ data: null, error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } }).then(cb)
            }),
            upsert: () => Promise.resolve({ error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } }),
            insert: () => Promise.resolve({ error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } }),
            update: () => Promise.resolve({ error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } }),
            delete: () => Promise.resolve({ error: { message: "Supabase credentials not configured.", code: "NO_CREDENTIALS" } }),
        })
    } as any;
}

export const supabase = supabaseInstance;
