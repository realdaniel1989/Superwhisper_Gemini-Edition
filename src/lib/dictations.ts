/**
 * Dictation database operations
 * Provides CRUD functions for the dictations table with Supabase
 */

import { supabase } from './supabase';

export interface DictationRow {
  id: string;
  user_id: string;
  text: string;
  timestamp: number;
  duration: number;
  created_at: string;
}

/**
 * Save a new dictation to the database
 */
export async function saveDictation(
  userId: string,
  text: string,
  duration: number
): Promise<{ data: DictationRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('dictations')
    .insert({
      user_id: userId,
      text,
      timestamp: Date.now(),
      duration
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Load all dictations for a user, ordered by timestamp descending
 */
export async function loadDictations(
  userId: string
): Promise<{ data: DictationRow[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('dictations')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  return { data, error };
}

/**
 * Delete a dictation by ID (RLS ensures user can only delete their own)
 */
export async function deleteDictation(
  userId: string,
  id: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('dictations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { error };
}

/**
 * Migrate localStorage dictations to Supabase
 * Checks for duplicates before inserting, clears localStorage only on success
 */
export async function migrateLocalStorage(
  userId: string
): Promise<{ migrated: number; errors: number }> {
  const localData = localStorage.getItem('dictations');

  if (!localData) {
    return { migrated: 0, errors: 0 };
  }

  let localDictations;
  try {
    localDictations = JSON.parse(localData);
    if (!Array.isArray(localDictations)) {
      return { migrated: 0, errors: 0 };
    }
  } catch (e) {
    console.error('Failed to parse localStorage dictations:', e);
    return { migrated: 0, errors: 1 };
  }

  let migrated = 0;
  let errors = 0;

  for (const dictation of localDictations) {
    // Check if dictation already exists (by timestamp + text match)
    const { data: existing, error: queryError } = await supabase
      .from('dictations')
      .select('id')
      .eq('user_id', userId)
      .eq('timestamp', dictation.timestamp)
      .eq('text', dictation.text)
      .maybeSingle();

    if (queryError) {
      console.error('Error checking for duplicate:', queryError);
      errors++;
      continue;
    }

    // Skip if already exists
    if (existing) {
      continue;
    }

    // Insert the dictation
    const { error: insertError } = await supabase.from('dictations').insert({
      user_id: userId,
      text: dictation.text,
      timestamp: dictation.timestamp,
      duration: dictation.duration
    });

    if (insertError) {
      console.error('Failed to migrate dictation:', insertError);
      errors++;
    } else {
      migrated++;
    }
  }

  // Clear localStorage only if all migrations were successful
  if (errors === 0) {
    localStorage.removeItem('dictations');
  }

  return { migrated, errors };
}
