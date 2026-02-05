import { supabase } from './supabase';

export interface UserStats {
    total_uploaded: number;
    last_30_days_uploaded: number;
    last_reset_date: string;
}

const TABLE_NAME = 'user_stats';

export async function getUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        // If not found, try to initialize (or return empty default)
        if (error.code === 'PGRST116') { // Code for no rows found
            return {
                total_uploaded: 0,
                last_30_days_uploaded: 0,
                last_reset_date: new Date().toISOString()
            };
        }
        console.error('Error fetching user stats:', error);
        return null;
    }

    // Check for reset logic on read (optional, but good for display accuracy)
    if (shouldReset(data.last_reset_date)) {
        return {
            ...data,
            last_30_days_uploaded: 0,
            last_reset_date: new Date().toISOString() // We don't save this read-only reset unless we write back, but good for UI
        };
    }

    return data;
}

export async function incrementUserStats(userId: string, bytes: number) {
    // 1. Get current stats to determine logic
    let { data: current, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch stats for update:', error);
        return;
    }

    const now = new Date();
    let total = 0;
    let last30 = 0;
    let resetDate = now.toISOString();

    if (current) {
        // Exists
        total = (current.total_uploaded || 0);
        last30 = (current.last_30_days_uploaded || 0);
        resetDate = current.last_reset_date || now.toISOString();

        if (shouldReset(resetDate)) {
            last30 = 0;
            resetDate = now.toISOString();
        }
    } else {
        // Create new record logic implicitly handled by upsert values below
    }

    total += bytes;
    last30 += bytes;

    const { error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert({
            user_id: userId,
            total_uploaded: total,
            last_30_days_uploaded: last30,
            last_reset_date: resetDate,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (upsertError) {
        console.error('Failed to update user stats:', upsertError);
    }
}

function shouldReset(lastResetDateStr: string): boolean {
    if (!lastResetDateStr) return true;
    const lastReset = new Date(lastResetDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastReset.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
}
