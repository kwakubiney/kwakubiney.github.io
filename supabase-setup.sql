-- Supabase SQL Setup for Private Notes Access Control
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Access Requests Table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  note_slug TEXT -- optional: request for specific note
);

-- 2. Approved Users Table  
CREATE TABLE IF NOT EXISTS approved_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_users ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Anyone can insert access requests
CREATE POLICY "Anyone can request access" ON access_requests
  FOR INSERT WITH CHECK (true);

-- 5. Policies: Only authenticated users can read their own requests
CREATE POLICY "Users can read own requests" ON access_requests
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- 6. Policies: Approved users can see they're approved (for auth check)
CREATE POLICY "Users can check if approved" ON approved_users
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- 7. Create function to notify you of new requests (optional webhook)
-- You'll set up the actual webhook in Supabase Dashboard > Database > Webhooks

-- ========================================
-- NOTES STORAGE (private note content)
-- ========================================

-- 8. Private Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable RLS on notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 10. Only approved users can read notes
CREATE POLICY "Approved users can read notes" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM approved_users 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- 11. Insert a sample note
INSERT INTO notes (slug, title, content) VALUES (
  'welcome',
  'Welcome to My Private Notes',
  '# Welcome!

This is my private corner of the internet. Thanks for being here.

## What you''ll find

- Personal reflections
- Work-in-progress ideas  
- Things I''m learning

Feel free to reach out if anything resonates!'
);
