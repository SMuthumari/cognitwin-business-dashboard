/*
# AI Invoice Processing - Database Schema

1. New Tables
- `processed_invoices` — stores AI-extracted invoice data from uploaded files
  - id (uuid, primary key)
  - file_name (text) — original uploaded file name
  - file_path (text) — path in Supabase Storage bucket
  - file_type (text) — MIME type of the uploaded file
  - file_size (bigint) — file size in bytes
  - status (text) — processing status: 'processing', 'processed', 'failed', 'needs_review'
  - invoice_number (text) — extracted invoice number, nullable
  - invoice_date (text) — extracted invoice date, nullable
  - due_date (text) — extracted due date, nullable
  - vendor_name (text) — extracted vendor/supplier name, nullable
  - customer_name (text) — extracted customer name, nullable
  - gst_number (text) — extracted GST/tax ID number, nullable
  - subtotal (numeric) — extracted subtotal amount, nullable
  - tax_amount (numeric) — extracted tax/GST amount, nullable
  - total_amount (numeric) — extracted total amount, nullable
  - payment_status (text) — extracted payment status, nullable
  - raw_text (text) — full OCR-extracted text for audit/debugging
  - fields_needing_review (jsonb) — array of field names that AI flagged for human review
  - confidence_score (numeric) — overall AI confidence 0-100
  - is_invoice (boolean) — whether AI confirmed the file is an invoice
  - processing_error (text) — error message if processing failed
  - processed_at (timestamptz) — when AI processing completed
  - created_at (timestamptz) — when record was created
  - updated_at (timestamptz) — when record was last updated

2. Storage
- Creates a private storage bucket `invoice-files` for storing original invoice files
- Files are stored privately and accessed via signed URLs

3. Security
- RLS enabled on `processed_invoices`
- Single-tenant app (no auth): policies use `TO anon, authenticated` with `USING (true)` since data is intentionally shared
- Storage bucket is private — files only accessible via signed URLs generated through the anon key
- All CRUD operations allowed for anon + authenticated roles

4. Indexes
- `idx_processed_invoices_status` — for filtering by processing status
- `idx_processed_invoices_created_at` — for sorting by most recent
*/

CREATE TABLE IF NOT EXISTS processed_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  invoice_number text,
  invoice_date text,
  due_date text,
  vendor_name text,
  customer_name text,
  gst_number text,
  subtotal numeric(12,2),
  tax_amount numeric(12,2),
  total_amount numeric(12,2),
  payment_status text,
  raw_text text,
  fields_needing_review jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric(5,2) DEFAULT 0,
  is_invoice boolean DEFAULT true,
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE processed_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoices" ON processed_invoices;
CREATE POLICY "anon_select_invoices" ON processed_invoices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_invoices" ON processed_invoices;
CREATE POLICY "anon_insert_invoices" ON processed_invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_invoices" ON processed_invoices;
CREATE POLICY "anon_update_invoices" ON processed_invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_invoices" ON processed_invoices;
CREATE POLICY "anon_delete_invoices" ON processed_invoices FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_processed_invoices_status ON processed_invoices(status);
CREATE INDEX IF NOT EXISTS idx_processed_invoices_created_at ON processed_invoices(created_at DESC);

-- Insert storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('invoice-files', 'invoice-files', false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoice-files bucket (private, anon+authenticated access)
DROP POLICY IF EXISTS "anon_upload_invoice_files" ON storage.objects;
CREATE POLICY "anon_upload_invoice_files" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'invoice-files');

DROP POLICY IF EXISTS "anon_read_invoice_files" ON storage.objects;
CREATE POLICY "anon_read_invoice_files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'invoice-files');

DROP POLICY IF EXISTS "anon_delete_invoice_files" ON storage.objects;
CREATE POLICY "anon_delete_invoice_files" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'invoice-files');
