import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Download, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BusinessDataPoint } from '@/lib/types';
import { parseCSV, downloadCSV, toCSV, generateBusinessData } from '@/lib/data';

export function DataUploadView({
  data,
  onDataUpdate,
}: {
  data: BusinessDataPoint[];
  onDataUpdate: (data: BusinessDataPoint[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [recordCount, setRecordCount] = useState(data.length);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setStatus('error');
          setMessage('No valid records found in the file');
          return;
        }
        onDataUpdate(parsed);
        setRecordCount(parsed.length);
        setFileName(file.name);
        setStatus('success');
        setMessage(`Successfully loaded ${parsed.length} records`);
      } catch {
        setStatus('error');
        setMessage('Failed to parse the file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = `Date,Product,Sales,Revenue,Expenses,Inventory,Demand,Production,CashFlow
2024-01-15,Widget Alpha,100,12000,6500,300,90,105,5500
2024-02-15,Widget Beta,150,12750,6300,280,140,160,6450`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business_data_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadCSV(data, 'business_data.csv');
  };

  const handleRegenerate = () => {
    const newData = generateBusinessData(12);
    onDataUpdate(newData);
    setRecordCount(newData.length);
    setStatus('success');
    setMessage(`Regenerated ${newData.length} demo records`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Database className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Business Data</h2>
            <p className="text-sm text-slate-400">Upload, export, or manage your business dataset</p>
          </div>
        </div>
      </div>

      {/* Current data summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Total Records</div>
          <div className="text-2xl font-bold text-white">{recordCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Products</div>
          <div className="text-2xl font-bold text-white">{new Set(data.map((d) => d.product)).size}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Date Range</div>
          <div className="text-sm font-bold text-white">
            {data.length > 0 ? `${data[0].date.slice(0, 7)} - ${data[data.length - 1].date.slice(0, 7)}` : '-'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Data Source</div>
          <div className="text-sm font-bold text-white">{fileName || 'Demo Data'}</div>
        </div>
      </div>

      {/* Upload area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-cyan-500/50 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <Upload className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">Upload CSV File</p>
            <p className="text-xs text-slate-500 mt-1">Click to browse or drag and drop</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Status */}
          {status !== 'idle' && (
            <div className={`rounded-xl p-4 flex items-center gap-3 ${status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {status === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
              <span className="text-sm text-slate-300">{message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              Download CSV Template
            </button>

            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
            >
              <Download className="w-5 h-5 text-emerald-400" />
              Export Current Data ({data.length} records)
            </button>

            <button
              onClick={handleRegenerate}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
            >
              <Database className="w-5 h-5 text-amber-400" />
              Regenerate Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* CSV format info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-3">Expected CSV Format</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                {['Date', 'Product', 'Sales', 'Revenue', 'Expenses', 'Inventory', 'Demand', 'Production', 'CashFlow'].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-500">
                <td className="py-2 pr-4">2024-01-15</td>
                <td className="py-2 pr-4">Widget Alpha</td>
                <td className="py-2 pr-4">100</td>
                <td className="py-2 pr-4">12000</td>
                <td className="py-2 pr-4">6500</td>
                <td className="py-2 pr-4">300</td>
                <td className="py-2 pr-4">90</td>
                <td className="py-2 pr-4">105</td>
                <td className="py-2 pr-4">5500</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
