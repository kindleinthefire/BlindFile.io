import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables');
}

// Fallback to avoid crash if env vars are missing
// Note: In Cloudflare Pages, import.meta.env might be empty if not exposed at build time.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

console.log('Supabase Config:', {
    hasUrl: !!url,
    isPlaceholder: url.includes('placeholder'),
    urlExcerpt: url.substring(0, 20)
});

export const supabase = createClient(url, key);
