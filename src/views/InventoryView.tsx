import { useState, useMemo } from 'react';
import { Package, Search, Filter, Download } from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { StockStatus } from '@/lib/warehouse-types';

const statusConfig: Record<StockStatus, { color: string; bg: string; border: string; label: string }> = {
  normal: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Normal' },
  low: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Low Stock' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
  overstock: { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Overstock' },
};

export function InventoryView({ state }: { state: WarehouseState }) {
  const { products, zones } = state;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.rfidId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesZone = zoneFilter === 'all' || p.storageZone === zoneFilter;
      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [products, search, statusFilter, zoneFilter]);

  const exportCSV = () => {
    const headers = ['Product ID', 'Name', 'Category', 'Quantity', 'Min Stock', 'Max Stock', 'Zone', 'RFID ID', 'Weight (kg)', 'Unit Price', 'Status'];
    const rows = filtered.map((p) => [p.id, p.name, p.category, p.quantity, p.minStock, p.maxStock, p.storageZone, p.rfidId, p.weight, p.unitPrice, p.status]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Inventory Management</h2>
            <p className="text-sm text-slate-400">{products.length} products across {zones.length} storage zones</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, ID, or RFID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'all')}
            className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="normal">Normal</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="overstock">Overstock</option>
          </select>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Product ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Min</th>
                <th className="px-4 py-3 font-medium text-right">Max</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">RFID ID</th>
                <th className="px-4 py-3 font-medium text-right">Weight</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cfg = statusConfig[p.status];
                return (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-300">{p.category}</td>
                    <td className="px-4 py-3 text-right text-white">{p.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{p.minStock}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{p.maxStock}</td>
                    <td className="px-4 py-3 text-slate-300">Zone {p.storageZone}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.rfidId}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{p.weight} kg</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No products match the current filters.</div>
        )}
      </div>
    </div>
  );
}
