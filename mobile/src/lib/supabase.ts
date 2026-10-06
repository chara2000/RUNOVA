import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://zoywwhhpipswfpigdlnb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveXd3aGhwaXBzd2ZwaWdkbG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzQ1NjksImV4cCI6MjEwNTg1MDU2OX0.qfoiBREQ1Q9DGJuG0RcxktBQFUtIJQFwfIWrlY18txA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
