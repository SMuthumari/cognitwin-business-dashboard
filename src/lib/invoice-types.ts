export type InvoiceStatus = 'processing' | 'processed' | 'failed' | 'needs_review';

export interface ProcessedInvoice {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: InvoiceStatus;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  vendor_name: string | null;
  customer_name: string | null;
  gst_number: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  payment_status: string | null;
  raw_text: string | null;
  fields_needing_review: string[];
  confidence_score: number;
  is_invoice: boolean;
  processing_error: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const INVOICE_FIELDS = [
  'invoice_number',
  'invoice_date',
  'due_date',
  'vendor_name',
  'customer_name',
  'gst_number',
  'subtotal',
  'tax_amount',
  'total_amount',
  'payment_status',
] as const;

export type InvoiceField = (typeof INVOICE_FIELDS)[number];

export const FIELD_LABELS: Record<InvoiceField, string> = {
  invoice_number: 'Invoice Number',
  invoice_date: 'Invoice Date',
  due_date: 'Due Date',
  vendor_name: 'Vendor / Supplier',
  customer_name: 'Customer Name',
  gst_number: 'GST Number',
  subtotal: 'Subtotal',
  tax_amount: 'Tax / GST Amount',
  total_amount: 'Total Amount',
  payment_status: 'Payment Status',
};
