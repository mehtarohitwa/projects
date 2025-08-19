import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
let supabase = null;

export function initializeSupabase() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    return true;
  }
  return false;
}

export function getSupabaseClient() {
  return supabase;
}

// User management functions
export async function createUser(userData) {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        full_name: userData.fullName,
        email: userData.email,
        instagram_id: userData.instagramId,
        instagram_password: userData.instagramPassword,
        password_hash: userData.password, // In production, hash this
        food_interest: userData.foodInterest,
        instagram_linked: true,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUserByEmail(email) {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function getAllUsers() {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

export async function authenticateUser(email, password) {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', password) // In production, compare hashed passwords
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}