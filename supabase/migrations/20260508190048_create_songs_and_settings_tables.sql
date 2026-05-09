/*
  # Create songs and settings tables for Veles AI Song Generator

  1. New Tables
    - `songs`
      - `id` (bigint, primary key, auto-generated)
      - `title` (text, not null) - song title
      - `genre` (text, not null) - genre/style description
      - `lyrics` (text, not null) - song lyrics
      - `model` (text, not null) - AI model used
      - `language` (text, not null) - song language
      - `status` (text, not null, default 'pending') - generation status
      - `item_ids` (text) - JSON stringified array of Tempolor item IDs
      - `audio_url` (text) - URL to generated audio
      - `created_at` (timestamptz, default now())
    - `settings`
      - `key` (text, primary key) - setting identifier
      - `value` (text, not null) - setting value

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated access (single-user app uses anon key)
*/

CREATE TABLE IF NOT EXISTS songs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'TemPolor v3.5',
  language TEXT NOT NULL DEFAULT 'English',
  status TEXT NOT NULL DEFAULT 'pending',
  item_ids TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select songs"
  ON songs FOR SELECT
  TO anon
  USING (auth.role() = 'anon');

CREATE POLICY "Allow anon insert songs"
  ON songs FOR INSERT
  TO anon
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow anon update songs"
  ON songs FOR UPDATE
  TO anon
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow anon delete songs"
  ON songs FOR DELETE
  TO anon
  USING (auth.role() = 'anon');

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select settings"
  ON settings FOR SELECT
  TO anon
  USING (auth.role() = 'anon');

CREATE POLICY "Allow anon insert settings"
  ON settings FOR INSERT
  TO anon
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow anon update settings"
  ON settings FOR UPDATE
  TO anon
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow anon delete settings"
  ON settings FOR DELETE
  TO anon
  USING (auth.role() = 'anon');
