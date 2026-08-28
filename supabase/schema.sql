-- Glory Valley School Management App - Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the synchronization table
CREATE TABLE IF NOT EXISTS public.school_data (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.school_data ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies allowing full read/write access for the school app
CREATE POLICY "Allow public read access" 
ON public.school_data 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.school_data 
FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.school_data 
FOR UPDATE 
TO public 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access" 
ON public.school_data 
FOR DELETE 
TO public 
USING (true);

-- 4. Enable Supabase Realtime for instant multi-device synchronisation
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_data;
