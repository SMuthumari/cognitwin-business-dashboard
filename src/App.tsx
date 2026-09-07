import { useState, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, Box, TrendingUp, AlertTriangle, Sliders, Lightbulb, FileText, Upload, Brain, Menu, ScanLine,
} from 'lucide-react';
import { generateBusinessData } from './lib/data';
import type { BusinessDataPoint } from './lib/types';
import { DashboardView } from './views/DashboardView';
import { BusinessTwinView } from './views/BusinessTwinView';
import { ForecastingView } from './views/ForecastingView';
import { RiskAnalysisView } from './views/RiskAnalysisView';
import { WhatIfView } from './views/WhatIfView';
import { RecommendationsView } from './views/RecommendationsView';
import { InvoiceView } from './views/InvoiceView';
import { InvoiceProcessingView } from './views/InvoiceProcessingView';
import { DataUploadView } from './views/DataUploadView';

type ViewId = 'dashboard' | 'twin' | 'forecast' | 'risk' | 'whatif' | 'recommendations' | 'invoice' | 'ai-invoice' | 'data';

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'twin', label: 'Business Twin', icon: Brain },
  { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
  { id: 'risk', label: 'Risk Analysis', icon: AlertTriangle },
  { id: 'whatif', label: 'What-If Simulator', icon: Sliders },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'invoice', label: 'Invoice Generation', icon: FileText },
  { id: 'ai-invoice', label: 'AI Invoice Processing', icon: ScanLine },
  { id: 'data', label: 'Data Upload', icon: Upload },
];

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessDataPoint[]>(() => generateBusinessData(12));

  const handleDataUpdate = useCallback((newData: BusinessDataPoint[]) => {
    setBusinessData(newData);
  }, []);

  const currentNav = useMemo(() => NAV_ITEMS.find((n) => n.id === activeView), [activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView data={businessData} />;
      case 'twin': return <BusinessTwinView data={businessData} />;
      case 'forecast': return <ForecastingView data={businessData} />;
      case 'risk': return <RiskAnalysisView data={businessData} />;
      case 'whatif': return <WhatIfView data={businessData} />;
      case 'recommendations': return <RecommendationsView data={businessData} />;
      case 'invoice': return <InvoiceView data={businessData} onDataUpdate={handleDataUpdate} />;
      case 'ai-invoice': return <InvoiceProcessingView />;
      case 'data': return <DataUploadView data={businessData} onDataUpdate={handleDataUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">CogniTwin</h1>
            <p className="text-[10px] text-slate-500">Cognitive Digital Twin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="text-[10px] text-slate-500 text-center">
            CogniTwin v1.0 · AI-Powered<br />Business Decision Engine
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 lg:px-8 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          {currentNav && (
            <div className="flex items-center gap-3">
              <currentNav.icon className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold">{currentNav.label}</h2>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Data
            </span>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
