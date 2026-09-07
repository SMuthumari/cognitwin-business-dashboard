import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedFields {
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
  is_invoice: boolean;
  confidence_score: number;
  fields_needing_review: string[];
}

function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,$]/g, "").replace(/[^\d.-]/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function extractFields(rawText: string): ExtractedFields {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lowerText = text.toLowerCase();
  const lowerLines = lines.map((l) => l.toLowerCase());

  const fields: ExtractedFields = {
    invoice_number: null,
    invoice_date: null,
    due_date: null,
    vendor_name: null,
    customer_name: null,
    gst_number: null,
    subtotal: null,
    tax_amount: null,
    total_amount: null,
    payment_status: null,
    is_invoice: true,
    confidence_score: 0,
    fields_needing_review: [],
  };

  // --- Invoice detection ---
  const invoiceKeywords = ["invoice", "bill", "tax invoice", "receipt", "gst invoice"];
  fields.is_invoice = invoiceKeywords.some((kw) => lowerText.includes(kw));

  if (!fields.is_invoice) {
    fields.confidence_score = 0;
    return fields;
  }

  let confidencePoints = 0;
  let maxPoints = 0;

  // --- Invoice number ---
  maxPoints++;
  for (const line of lines) {
    const m = line.match(/(?:invoice|inv|bill)\s*(?:no|number|#|num\.?)?[:\s]*([A-Z0-9][A-Z0-9\-\/]{2,})/i);
    if (m) { fields.invoice_number = m[1].trim(); confidencePoints++; break; }
  }
  if (!fields.invoice_number) {
    const m2 = text.match(/(?:inv|invoice)\s*(?:no|number|#)?[:\s]*([A-Z]{0,3}[\d]{3,}[\d\-\/]*)/i);
    if (m2) { fields.invoice_number = m2[1].trim(); }
  }
  if (!fields.invoice_number) fields.fields_needing_review.push("invoice_number");
  else confidencePoints++;

  // --- Invoice date ---
  maxPoints++;
  const datePatterns = [
    /(?:invoice\s*date|date\s*of\s*issue|date)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:invoice\s*date|date\s*of\s*issue|date)\s*[:\s]*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
  /(?:invoice\s*date|date)\s*[:\s]*([A-Z][a-z]{2,}\s+\d{1,2},?\s+\d{4})/i,
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/,
    /\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/,
  ];
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) { fields.invoice_date = m[1].trim(); confidencePoints++; break; }
  }
  if (!fields.invoice_date) fields.fields_needing_review.push("invoice_date");

  // --- Due date ---
  maxPoints++;
  const dueDatePatterns = [
    /(?:due\s*date|payment\s*due|due\s*by)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:due\s*date|payment\s*due|due\s*by)\s*[:\s]*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(?:due\s*date|payment\s*due)\s*[:\s]*([A-Z][a-z]{2,}\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const pat of dueDatePatterns) {
    const m = text.match(pat);
    if (m) { fields.due_date = m[1].trim(); confidencePoints++; break; }
  }
  if (!fields.due_date) fields.fields_needing_review.push("due_date");

  // --- Vendor / Supplier name ---
  maxPoints++;
  const vendorPatterns = [
    /(?:vendor|supplier|seller|from|biller|issued\s*by)\s*[:\s]\s*(.+)/i,
    /(?:sold\s*by|supplied\s*by)\s*[:\s]\s*(.+)/i,
  ];
  for (const pat of vendorPatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) { fields.vendor_name = m[1].trim().split("\n")[0].trim(); confidencePoints++; break; }
  }
  if (!fields.vendor_name) {
    // Try first non-trivial line as vendor (often the header)
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && line.length < 60 && !/^(invoice|bill|receipt|tax|date)/i.test(line) && /\b[A-Z]/.test(line)) {
        fields.vendor_name = line;
        break;
      }
    }
  }
  if (!fields.vendor_name) fields.fields_needing_review.push("vendor_name");
  else confidencePoints++;

  // --- Customer name ---
  maxPoints++;
  const customerPatterns = [
    /(?:bill\s*to|customer|client|buyer|ship\s*to)\s*[:\s]\s*(.+)/i,
    /(?:bill\s*to|customer|client|buyer)\s*[:\s]*\n(.+)/i,
  ];
  for (const pat of customerPatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) { fields.customer_name = m[1].trim().split("\n")[0].trim(); confidencePoints++; break; }
  }
  if (!fields.customer_name) fields.fields_needing_review.push("customer_name");

  // --- GST number ---
  maxPoints++;
  const gstPatterns = [
    /\b(GSTIN|GST\s*(?:No|Number|ID|Reg)?)\s*[:\s]*([A-Z0-9]{15})\b/i,
    /\b([A-Z]\d{5}[A-Z]\d{4}[A-Z]\d)\b/,
    /\b(TAX\s*ID|VAT\s*(?:No|Number)?|PAN)\s*[:\s]*([A-Z0-9]{6,})\b/i,
  ];
  for (const pat of gstPatterns) {
    const m = text.match(pat);
    if (m) { fields.gst_number = (m[2] || m[1]).trim().toUpperCase(); confidencePoints++; break; }
  }
  if (!fields.gst_number) fields.fields_needing_review.push("gst_number");

  // --- Subtotal ---
  maxPoints++;
  const subtotalPatterns = [
    /(?:sub\s*total|subtotal|sub\s*total\s*amount)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /(?:net\s*amount|amount\s*before\s*tax)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const pat of subtotalPatterns) {
    const m = text.match(pat);
    if (m) { fields.subtotal = parseAmount(m[1]); if (fields.subtotal !== null) { confidencePoints++; break; } }
  }
  if (fields.subtotal === null) fields.fields_needing_review.push("subtotal");

  // --- Tax amount ---
  maxPoints++;
  const taxPatterns = [
    /(?:tax|gst|vat|sales\s*tax)\s*(?:amount)?\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /(?:tax|gst|vat)\s*\(\s*\d+\.?\d*\s*%\s*\)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const pat of taxPatterns) {
    const m = text.match(pat);
    if (m) { fields.tax_amount = parseAmount(m[1]); if (fields.tax_amount !== null) { confidencePoints++; break; } }
  }
  if (fields.tax_amount === null) fields.fields_needing_review.push("tax_amount");

  // --- Total amount ---
  maxPoints++;
  const totalPatterns = [
    /(?:total|grand\s*total|total\s*amount|amount\s*due|balance\s*due)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /(?:total)\s*[:\s]*\$?\s*([\d,]+\.?\d{2})\s*$/im,
  ];
  for (const pat of totalPatterns) {
    const m = text.match(pat);
    if (m) { fields.total_amount = parseAmount(m[1]); if (fields.total_amount !== null) { confidencePoints++; break; } }
  }
  if (fields.total_amount === null) fields.fields_needing_review.push("total_amount");

  // --- Payment status ---
  maxPoints++;
  if (/paid/i.test(text) && /invoice/i.test(text)) {
    fields.payment_status = "Paid";
    confidencePoints++;
  } else if (/unpaid|outstanding|due/i.test(text)) {
    fields.payment_status = "Unpaid";
    confidencePoints++;
  } else if (/partial/i.test(text)) {
    fields.payment_status = "Partial";
    confidencePoints++;
  } else {
    fields.fields_needing_review.push("payment_status");
  }

  fields.confidence_score = Math.round((confidencePoints / Math.max(maxPoints, 1)) * 100);

  return fields;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { invoiceId, filePath, fileName, fileType } = await req.json();

    if (!invoiceId || !filePath) {
      return new Response(
        JSON.stringify({ error: "Missing invoiceId or filePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("invoice-files")
      .download(filePath);

    if (downloadError || !fileData) {
      await supabase
        .from("processed_invoices")
        .update({
          status: "failed",
          processing_error: `Failed to download file: ${downloadError?.message || "unknown"}`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return new Response(
        JSON.stringify({ error: "File download failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text based on file type
    let extractedText = "";
    const isImage = fileType.startsWith("image/");
    const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

    if (isImage) {
      // Use Tesseract.js for OCR on images
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const { default: Tesseract } = await import("npm:tesseract.js@5.1.0");
        const worker = await Tesseract.createWorker("eng");
        const { data: ocrResult } = await worker.recognize(uint8);
        extractedText = ocrResult.data.text || "";
        await worker.terminate();
      } catch (ocrErr) {
        // Fallback: mark as needs_review with error
        await supabase
          .from("processed_invoices")
          .update({
            status: "needs_review",
            processing_error: `OCR failed: ${ocrErr.message}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        return new Response(
          JSON.stringify({ status: "needs_review", error: ocrErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (isPdf) {
      // For PDFs, try to extract text using pdf-parse
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const { default: PdfParse } = await import("npm:pdf-parse@1.1.1");
        const pdfData = await PdfParse(uint8);
        extractedText = pdfData.text || "";

        // If PDF has no extractable text (scanned PDF), try OCR
        if (extractedText.trim().length < 20) {
          // Render PDF to image and OCR — fallback for scanned PDFs
          // For now, mark as needs_review since we can't easily render PDF pages in edge runtime
          const { default: Tesseract } = await import("npm:tesseract.js@5.1.0");
          // Try OCR on raw bytes as last resort (won't work well for PDF but attempt)
          extractedText = "";
          await supabase
            .from("processed_invoices")
            .update({
              status: "needs_review",
              raw_text: "",
              processing_error: "Scanned PDF detected — no text layer found. Please upload an image or text-based PDF.",
              processed_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);

          return new Response(
            JSON.stringify({ status: "needs_review", message: "Scanned PDF needs manual review" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (pdfErr) {
        await supabase
          .from("processed_invoices")
          .update({
            status: "failed",
            processing_error: `PDF parsing failed: ${pdfErr.message}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        return new Response(
          JSON.stringify({ error: "PDF parsing failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For text files, read directly
      extractedText = await fileData.text();
    }

    // Extract structured fields from OCR text
    const extracted = extractFields(extractedText);

    // Determine final status
    let status: string;
    if (!extracted.is_invoice) {
      status = "failed";
    } else if (extracted.fields_needing_review.length >= 5) {
      status = "needs_review";
    } else if (extracted.fields_needing_review.length === 0) {
      status = "processed";
    } else {
      status = "needs_review";
    }

    // Update the database record
    const { error: updateError } = await supabase
      .from("processed_invoices")
      .update({
        status,
        invoice_number: extracted.invoice_number,
        invoice_date: extracted.invoice_date,
        due_date: extracted.due_date,
        vendor_name: extracted.vendor_name,
        customer_name: extracted.customer_name,
        gst_number: extracted.gst_number,
        subtotal: extracted.subtotal,
        tax_amount: extracted.tax_amount,
        total_amount: extracted.total_amount,
        payment_status: extracted.payment_status,
        raw_text: extractedText,
        fields_needing_review: extracted.fields_needing_review,
        confidence_score: extracted.confidence_score,
        is_invoice: extracted.is_invoice,
        processing_error: extracted.is_invoice ? null : "File does not appear to be an invoice",
        processed_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Database update failed: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status,
        confidence_score: extracted.confidence_score,
        fields_needing_review: extracted.fields_needing_review,
        is_invoice: extracted.is_invoice,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
