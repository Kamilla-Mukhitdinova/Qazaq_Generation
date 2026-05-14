import { pool } from './index.js';

export async function ensureChatSchema() {
  await pool.query(`
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
      ADD COLUMN IF NOT EXISTS file_name text,
      ADD COLUMN IF NOT EXISTS file_path text,
      ADD COLUMN IF NOT EXISTS file_mime_type text,
      ADD COLUMN IF NOT EXISTS file_size integer,
      ADD COLUMN IF NOT EXISTS duration_ms integer
  `);
}
