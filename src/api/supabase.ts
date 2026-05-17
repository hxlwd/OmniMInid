import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      })
    : null;

export async function signInWithPassword(email: string, password: string): Promise<string> {
  if (!supabase) {
    throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY。');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('登录成功但没有拿到 access token。');
  }

  localStorage.setItem('omnimind.access_token', token);
  return token;
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('omnimind.access_token');
  await supabase?.auth.signOut();
}
