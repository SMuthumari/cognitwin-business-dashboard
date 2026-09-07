import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScanLine, FileText, CheckCircle2, AlertCircle, Clock, Upload, Download,
  Eye, RefreshCw, Trash2, FileImage, FileSpreadsheet, X, AlertTriangle,
  Sparkles, ShieldCheck, Loader2, Inbox,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ProcessedInvoice, InvoiceStatus, InvoiceField } from '@/lib/invoice-types';
import { INVOICE_FIELDS, FIELD_LABELS } from '@/lib/invoice-types';

const statusConfig: Record<InvoiceStatus, { icon: typeof Clock; color: string; bg: string; border: string; label: string }> = {
  processing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Processing' },
  processed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Processed' },
  failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Failed' },
  needs_review: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Needs Review' },
};

const formatCurrency = (v: number | null) => {
  if (v === null || v === undefined) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function getFileIcon(fileType: string, fileName: string) {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) return FileText;
  return FileSpreadsheet;
}

export function InvoiceProcessingView() {
  const [invoices, setInvoices] = useState<ProcessedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ProcessedInvoice | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from('processed_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data as ProcessedInvoice[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Poll for processing invoices
  useEffect(() => {
    const processingInvoices = invoices.filter((inv) => inv.status === 'processing');
    if (processingInvoices.length === 0) return;

    const interval = setInterval(async () => {
      const ids = processingInvoices.map((inv) => inv.id);
      const { data, error } = await supabase
        .from('processed_invoices')
        .select('*')
        .in('id', ids);

      if (!error && data) {
        setInvoices((prev) =>
          prev.map((inv) => {
            const updated = (data as ProcessedInvoice[]).find((d) => d.id === inv.id);
            return updated || inv;
          })
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [invoices]);

  const processFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('invoice-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data: record, error: dbError } = await supabase
        .from('processed_invoices')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          status: 'processing',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger edge function for OCR processing
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-invoice`;
      const { data: funcData, error: funcError } = await supabase.functions.invoke('process-invoice', {
        body: {
          invoiceId: record.id,
          filePath,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        },
      });

      // Refresh list
      await fetchInvoices();
    } catch (err) {
      console.error('Processing failed:', err);
      await fetchInvoices();
    } finally {
      setUploading(false);
    }
  }, [fetchInvoices]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'];
      return validTypes.includes(f.type) || f.name.toLowerCase().match(/\.(png|jpe?g|webp|gif|pdf)$/);
    });
    fileArray.forEach(processFile);
  }, [processFile]);

  const handleRetry = useCallback(async (invoice: ProcessedInvoice) => {
    await supabase
      .from('processed_invoices')
      .update({ status: 'processing', processing_error: null })
      .eq('id', invoice.id);

    await supabase.functions.invoke('process-invoice', {
      body: {
        invoiceId: invoice.id,
        filePath: invoice.file_path,
        fileName: invoice.file_name,
        fileType: invoice.file_type,
      },
    });

    await fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = useCallback(async (invoice: ProcessedInvoice) => {
    await supabase.storage.from('invoice-files').remove([invoice.file_path]);
    await supabase.from('processed_invoices').delete().eq('id', invoice.id);
    await fetchInvoices();
    if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
  }, [fetchInvoices, selectedInvoice]);

  const handleDownload = useCallback(async (invoice: ProcessedInvoice) => {
    const { data, error } = await supabase.storage
      .from('invoice-files')
      .createSignedUrl(invoice.file_path, 60);
    if (!error && data) {
      window.open(data.signedUrl, '_blank');
    }
  }, []);

  const handleUpdateField = useCallback(async (invoiceId: string, field: string, value: string) => {
    const { error } = await supabase
      .from('processed_invoices')
      .update({ [field]: value || null, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (!error) {
      setInvoices((prev) => prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, [field]: value || null, fields_needing_review: inv.fields_needing_review.filter((f) => f !== field) }
          : inv
      ));
      setSelectedInvoice((prev) => prev?.id === invoiceId
        ? { ...prev, [field]: value || null, fields_needing_review: prev.fields_needing_review.filter((f) => f !== field) }
        : prev
      );
    }
  }, []);

  const handleApproveReview = useCallback(async (invoiceId: string) => {
    const { error } = await supabase
      .from('processed_invoices')
      .update({ status: 'processed', fields_needing_review: [], updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (!error) {
      setInvoices((prev) => prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: 'processed', fields_needing_review: [] } : inv
      ));
      setSelectedInvoice((prev) => prev?.id === invoiceId
        ? { ...prev, status: 'processed', fields_needing_review: [] }
        : prev
      );
    }
  }, []);

  // Stats
  const stats = {
    total: invoices.length,
    processed: invoices.filter((i) => i.status === 'processed').length,
    needsReview: invoices.filter((i) => i.status === 'needs_review').length,
    processing: invoices.filter((i) => i.status === 'processing').length,
    failed: invoices.filter((i) => i.status === 'failed').length,
    totalAmount: invoices
      .filter((i) => i.status === 'processed' || i.status === 'needs_review')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <ScanLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Invoice Processing</h2>
            <p className="text-sm text-slate-400">Automatic OCR extraction, validation, and storage</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Invoices', value: stats.total, icon: FileText, color: 'text-slate-300' },
          { label: 'Processed', value: stats.processed, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Needs Review', value: stats.needsReview, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Processing', value: stats.processing, icon: Loader2, color: 'text-blue-400', spin: stats.processing > 0 },
          { label: 'Failed', value: stats.failed, icon: AlertCircle, color: 'text-red-400' },
          { label: 'Total Value', value: formatCurrency(stats.totalAmount), icon: ShieldCheck, color: 'text-cyan-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <Icon className={`w-5 h-5 ${s.color} ${s.spin ? 'animate-spin' : ''} mb-2`} />
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[11px] text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Upload area */}
      <div
        className={`bg-slate-900 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
          dragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 hover:border-slate-600'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className={`w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center ${uploading ? 'animate-pulse' : ''}`}>
          {uploading ? <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /> : <Upload className="w-8 h-8 text-cyan-400" />}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-200">
            {uploading ? 'Processing invoices...' : 'Drop invoice files here or click to upload'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Supports PDF, PNG, JPG, WEBP — AI will extract data automatically</p>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-200">Processed Invoices</h3>
          <button
            onClick={fetchInvoices}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Inbox className="w-12 h-12 text-slate-600" />
            <p className="text-sm text-slate-500">No invoices yet. Upload a file to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th className="px-6 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-center">Confidence</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const config = statusConfig[invoice.status];
                  const StatusIcon = config.icon;
                  const FileIcon = getFileIcon(invoice.file_type, invoice.file_name);
                  return (
                    <tr key={invoice.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-slate-200 truncate max-w-[200px]">{invoice.file_name}</div>
                            <div className="text-[10px] text-slate-500">{formatFileSize(invoice.file_size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${config.bg} ${config.color} ${config.border}`}>
                          <StatusIcon className={`w-3 h-3 ${invoice.status === 'processing' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{invoice.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-300 truncate max-w-[150px]">{invoice.vendor_name || '—'}</td>
                      <td className="px-4 py-3 text-right text-cyan-400 font-medium">{formatCurrency(invoice.total_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        {invoice.status === 'processing' ? (
                          <span className="text-slate-500 text-xs">—</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  invoice.confidence_score >= 75 ? 'bg-emerald-500' :
                                  invoice.confidence_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${invoice.confidence_score}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{invoice.confidence_score}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(invoice.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {invoice.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(invoice)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Retry processing"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(invoice)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Download original file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdateField={handleUpdateField}
          onApproveReview={handleApproveReview}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

function InvoiceDetailModal({
  invoice,
  onClose,
  onUpdateField,
  onApproveReview,
  onDownload,
}: {
  invoice: ProcessedInvoice;
  onClose: () => void;
  onUpdateField: (invoiceId: string, field: string, value: string) => void;
  onApproveReview: (invoiceId: string) => void;
  onDownload: (invoice: ProcessedInvoice) => void;
}) {
  const [editField, setEditField] = useState<InvoiceField | null>(null);
  const [editValue, setEditValue] = useState('');
  const config = statusConfig[invoice.status];
  const StatusIcon = config.icon;

  const handleSave = () => {
    if (editField) {
      onUpdateField(invoice.id, editField, editValue);
      setEditField(null);
      setEditValue('');
    }
  };

  const fieldValue = (field: InvoiceField): string => {
    const val = invoice[field];
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return String(val);
    return String(val);
  };

  const isNumericField = (field: InvoiceField) =>
    field === 'subtotal' || field === 'tax_amount' || field === 'total_amount';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{invoice.file_name}</h3>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border ${config.bg} ${config.color} ${config.border} mt-1`}>
                <StatusIcon className={`w-2.5 h-2.5 ${invoice.status === 'processing' ? 'animate-spin' : ''}`} />
                {config.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Confidence banner */}
          {invoice.status !== 'processing' && invoice.is_invoice && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              invoice.confidence_score >= 75 ? 'bg-emerald-500/5 border-emerald-500/20' :
              invoice.confidence_score >= 50 ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <Sparkles className={`w-5 h-5 ${
                invoice.confidence_score >= 75 ? 'text-emerald-400' :
                invoice.confidence_score >= 50 ? 'text-amber-400' : 'text-red-400'
              }`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  AI Confidence: {invoice.confidence_score}%
                </div>
                <div className="text-xs text-slate-400">
                  {invoice.fields_needing_review.length > 0
                    ? `${invoice.fields_needing_review.length} field(s) need human review`
                    : 'All fields extracted with high confidence'}
                </div>
              </div>
            </div>
          )}

          {/* Processing error */}
          {invoice.processing_error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-300">Processing Error</div>
                <div className="text-xs text-slate-400">{invoice.processing_error}</div>
              </div>
            </div>
          )}

          {/* Not an invoice */}
          {!invoice.is_invoice && invoice.status === 'failed' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-300">Not an Invoice</div>
                <div className="text-xs text-slate-400">The AI could not confirm this file is an invoice. Please verify and try again.</div>
              </div>
            </div>
          )}

          {/* Extracted fields */}
          {invoice.is_invoice && (
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-cyan-400" /> Extracted Fields
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INVOICE_FIELDS.map((field) => {
                  const value = fieldValue(field);
                  const needsReview = invoice.fields_needing_review.includes(field);
                  const isEditing = editField === field;
                  return (
                    <div
                      key={field}
                      className={`p-3 rounded-lg border ${
                        needsReview ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-400">{FIELD_LABELS[field]}</span>
                        <div className="flex items-center gap-1.5">
                          {needsReview && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              REVIEW
                            </span>
                          )}
                          {!isEditing && invoice.status !== 'processing' && (
                            <button
                              onClick={() => { setEditField(field); setEditValue(value); }}
                              className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            type={isNumericField(field) ? 'number' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditField(null); }}
                            className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:border-cyan-500 focus:outline-none"
                          />
                          <button onClick={handleSave} className="px-2 py-1 bg-cyan-500 text-white rounded text-xs hover:bg-cyan-400">Save</button>
                          <button onClick={() => setEditField(null)} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <div className={`text-sm font-medium ${value ? 'text-white' : 'text-slate-500 italic'}`}>
                          {isNumericField(field) && value ? formatCurrency(parseFloat(value)) : value || 'Not detected'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Raw OCR text */}
          {invoice.raw_text && (
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Raw OCR Text</h4>
              <pre className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                {invoice.raw_text}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
            {invoice.status === 'needs_review' && (
              <button
                onClick={() => onApproveReview(invoice.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as Reviewed
              </button>
            )}
            <button
              onClick={() => onDownload(invoice)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Download Original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
