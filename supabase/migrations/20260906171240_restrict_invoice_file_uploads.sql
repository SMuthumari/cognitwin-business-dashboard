/*
# Restrict invoice file uploads

1. Storage changes
- `invoice-files` remains private.
- Limit uploads to PDF and common image formats used for invoices.
- Limit each original invoice file to 10 MB.

2. Security
- The storage service enforces MIME type and size limits server-side.
- This complements the browser checks and prevents unsupported or oversized files from being stored.

3. Data safety
- No existing invoice records or files are removed.
- Existing files remain available; the restriction applies to new uploads.
*/

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]::text[],
  updated_at = now()
WHERE id = 'invoice-files';
