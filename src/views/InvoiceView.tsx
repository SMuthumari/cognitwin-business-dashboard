import { useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Download, User, Package } from 'lucide-react';
import type { BusinessDataPoint, InvoiceItem, Invoice } from '@/lib/types';
import { aggregateByProduct } from '@/lib/analytics';

const formatCurrency = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let invoiceCounter = 1001;

export function InvoiceView({
  data,
  onDataUpdate,
}: {
  data: BusinessDataPoint[];
  onDataUpdate: (data: BusinessDataPoint[]) => void;
}) {
  const products = useMemo(() => aggregateByProduct(data), [data]);
  const [customer, setCustomer] = useState('');
  const [taxRate, setTaxRate] = useState(10);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', product: '', quantity: 1, price: 0, discount: 0 },
  ]);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), product: '', quantity: 1, price: 0, discount: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price * (1 - i.discount / 100), 0);
  const discountAmount = items.reduce((s, i) => s + i.quantity * i.price * (i.discount / 100), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const generateInvoice = () => {
    if (!customer.trim()) return;
    const invoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${invoiceCounter++}`,
      customer,
      date: new Date().toISOString().slice(0, 10),
      items: items.filter((i) => i.product && i.quantity > 0),
      taxRate,
      notes,
      subtotal,
      taxAmount,
      discountAmount,
      total,
    };
    setGeneratedInvoice(invoice);

    // Add invoice items as sales data
    const newEntries: BusinessDataPoint[] = invoice.items.map((item) => ({
      date: invoice.date,
      product: item.product,
      sales: item.quantity,
      revenue: item.quantity * item.price * (1 - item.discount / 100),
      expenses: 0,
      inventory: 0,
      demand: item.quantity,
      production: 0,
      cashFlow: item.quantity * item.price * (1 - item.discount / 100),
    }));
    onDataUpdate([...data, ...newEntries]);
  };

  const downloadInvoice = () => {
    if (!generatedInvoice) return;
    const text = `
COGNITWIN INVOICE
==================
Invoice #: ${generatedInvoice.invoiceNumber}
Date: ${generatedInvoice.date}
Customer: ${generatedInvoice.customer}

ITEMS:
${generatedInvoice.items.map((i) => `${i.product} | Qty: ${i.quantity} | Price: ${formatCurrency(i.price)} | Discount: ${i.discount}% | Total: ${formatCurrency(i.quantity * i.price * (1 - i.discount / 100))}`).join('\n')}

Subtotal: ${formatCurrency(generatedInvoice.subtotal)}
Tax (${generatedInvoice.taxRate}%): ${formatCurrency(generatedInvoice.taxAmount)}
Discount: ${formatCurrency(generatedInvoice.discountAmount)}
------------------
TOTAL: ${formatCurrency(generatedInvoice.total)}

${generatedInvoice.notes ? `Notes: ${generatedInvoice.notes}` : ''}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedInvoice.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Invoice Generation</h2>
            <p className="text-sm text-slate-400">Create invoices and record transactions as sales data</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Invoice Details</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Invoice Items</label>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <select
                        value={item.product}
                        onChange={(e) => {
                          updateItem(item.id, 'product', e.target.value);
                          const prod = products.find((p) => p.product === e.target.value);
                          if (prod) updateItem(item.id, 'price', prod.revenue / Math.max(prod.sales, 1));
                        }}
                        className="col-span-2 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.product} value={p.product}>{p.product}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Qty"
                        className="px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={generateInvoice}
              disabled={!customer.trim()}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Invoice
            </button>
          </div>
        </div>

        {/* Invoice preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Invoice Preview</h3>
            {generatedInvoice && (
              <button
                onClick={downloadInvoice}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
          </div>

          {generatedInvoice ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="text-lg font-bold text-white">CogniTwin</div>
                  <div className="text-xs text-slate-500">AI-Powered Business Solutions</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-cyan-400">{generatedInvoice.invoiceNumber}</div>
                  <div className="text-xs text-slate-500">{generatedInvoice.date}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">BILL TO</div>
                <div className="text-sm font-medium text-white">{generatedInvoice.customer}</div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Price</th>
                    <th className="pb-2 font-medium text-right">Disc</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedInvoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/50">
                      <td className="py-2 text-slate-300">{item.product}</td>
                      <td className="py-2 text-right text-slate-300">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-300">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-right text-slate-400">{item.discount}%</td>
                      <td className="py-2 text-right text-white">{formatCurrency(item.quantity * item.price * (1 - item.discount / 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-300">{formatCurrency(generatedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Discount</span>
                  <span className="text-slate-400">-{formatCurrency(generatedInvoice.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tax ({generatedInvoice.taxRate}%)</span>
                  <span className="text-slate-300">{formatCurrency(generatedInvoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-800">
                  <span className="text-white">Total</span>
                  <span className="text-cyan-400">{formatCurrency(generatedInvoice.total)}</span>
                </div>
              </div>

              {generatedInvoice.notes && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-500 mb-1">NOTES</div>
                  <div className="text-sm text-slate-400">{generatedInvoice.notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Fill in the form and generate an invoice to see the preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
