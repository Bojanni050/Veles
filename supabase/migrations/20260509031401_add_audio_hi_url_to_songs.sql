/*
  # Add high-quality audio URL column to songs table

  1. Modified Tables
    - `songs`
      - Added `audio_hi_url` (text) - URL to WAV format audio file

  2. Notes
    - Tempolor API provides both MP3 (audio_url) and WAV (audio_hi_url) downloads
    - This column stores the WAV URL for high-quality download option
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'audio_hi_url'
  ) THEN
    ALTER TABLE songs ADD COLUMN audio_hi_url TEXT;
  END IF;
END $$;
