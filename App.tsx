import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginScreen from './components/LoginScreen';
import { Asset, UserRole } from './types';
import { saveAsset, deleteAsset, getStats, logoutUser, getCurrentUserProfile, canManageOperations, isReadOnlyRole, hasInternalConsoleAccess } from './services/storageService';
import { AppDataProvider, useAppData } from './context/AppDataContext';

// Route-level code splitting for fast mobile loads
const Dashboard = lazy(() => import('./components/Dashboard'));
const ExecutiveDashboard = lazy(() => import('./components/ExecutiveDashboard'));
const AssetList = lazy(() => import('./components/AssetList'));
const AssetForm = lazy(() => import('./components/AssetForm'));
const Planner = lazy(() => import('./components/Planner'));
const Settings = lazy(() => import('./components/Settings'));
const StaffView = lazy(() => import('./components/StaffView'));
const SignHandover = lazy(() => import('./components/SignHandover'));
const AssetRequests = lazy(() => import('./components/AssetRequests'));
const PublicReportIssue = lazy(() => import('./components/PublicReportIssue'));
const PublicAssetRequest = lazy(() => import('./components/PublicAssetRequest'));
const PublicStatusTracker = lazy(() => import('./components/PublicStatusTracker'));
const Invoices = lazy(() => import('./components/Invoices'));
const TicketsAndTasks = lazy(() => import('./components/TicketsAndTasks'));
const Venues = lazy(() => import('./components/Venues'));
const Reports = lazy(() => import('./components/Reports'));

const RouteLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="animate-spin text-[#0052CC]" size={26} />
  </div>
);

const ProtectedRoute = ({ children, requiredRole }: { children?: React.ReactNode, requiredRole?: UserRole }) => {
    const user = getCurrentUserProfile();
    if (!user) return <Navigate to="/" replace />;
    if (requiredRole && user.role !== requiredRole && user.role !== 'admin' && user.role !== 'sandbox_user') {
         return <div className="p-8 text-center text-[#5E6C84] dark:text-[#94A3B8] text-sm">Access Denied. You do not have permission to view this page.</div>;
    }
    return <>{children}</>;
};

const AssetRegistryWrapper = ({ assets, view, setView, editingAsset, setEditingAsset, handleSaveAsset, handleDuplicate, handleDeleteAsset, loading, canEdit }: any) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const deepLinkId = searchParams.get('id');
    const isNewParam = searchParams.get('new');

    useEffect(() => {
        if (isNewParam === '1' && canEdit) {
            setEditingAsset(null);
            setView('form');
            setSearchParams({}, { replace: true });
            return;
        }
        if (deepLinkId && assets.length > 0 && !editingAsset) {
            const asset = assets.find((a: Asset) => a.id === deepLinkId);
            if (asset) { setEditingAsset(asset); setView('form'); }
        }
    }, [deepLinkId, isNewParam, assets]);

    return view === 'list' ? (
        <div className="space-y-5">
            <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-[20px] font-semibold tracking-tight text-[#172B4D] dark:text-[#E6EDF5]">Asset Inventory</h1>
                  <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">Centralized hardware inventory across EATX venues and offices.</p>
                </div>
                {canEdit && (
                    <button onClick={() => { setEditingAsset(null); setView('form'); }} className="bg-[#0052CC] hover:bg-[#0043A8] text-white px-3.5 py-2 rounded flex items-center gap-2 font-medium transition-colors text-[13px]">
                        <PlusCircle size={15} /> <span className="hidden sm:inline">Add Asset</span><span className="sm:hidden">Add</span>
                    </button>
                )}
            </div>
            {loading ? <RouteLoader /> :
                <AssetList assets={assets} onEdit={(a) => { setEditingAsset(a); setView('form'); }} onDuplicate={handleDuplicate} onDelete={handleDeleteAsset} />
            }
        </div>
    ) : (
        <AssetForm initialData={editingAsset} onSave={handleSaveAsset} onCancel={() => { setView('list'); setEditingAsset(null); setSearchParams({}); }} />
    );
};

const AppShell = () => {
  const { user, assets, notifications, overdueCount, loading } = useAppData();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('eatx_theme') === 'dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('eatx_sidebar_collapsed') === 'true');

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('eatx_theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('eatx_theme', 'light'); }
  }, [isDarkMode]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('eatx_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  const handleSaveAsset = async (asset: Asset) => { await saveAsset(asset); setView('list'); setEditingAsset(null); };
  const handleDeleteAsset = async (id: string) => { try { await deleteAsset(id); } catch (e) { console.error(e); } };

  const handleDuplicate = (asset: Asset) => {
    setEditingAsset({ ...asset, id: 'ast-' + Math.random().toString(36).substr(2, 9), name: `${asset.name} (Copy)`, assetTag: '', serialNumber: '', assignedEmployee: '', lastUpdated: '' });
    setView('form');
  };

  const canEdit = canManageOperations(user);

  return (
    <Router>
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] font-sans overflow-x-hidden">
        <Suspense fallback={<RouteLoader />}>
          <Routes>
              {/* Staff Portal & Signing Routes */}
              <Route path="/sign/:id" element={<SignHandover />} />
              <Route path="/report-issue" element={<PublicReportIssue />} />
              <Route path="/request-asset" element={<PublicAssetRequest />} />
              <Route path="/track" element={<PublicStatusTracker />} />

              {/* Internal Console Shell Routes */}
              <Route path="/*" element={
                  !user ? <LoginScreen /> : !hasInternalConsoleAccess(user) ? <Navigate to="/report-issue" replace /> : (
                  <div className="flex h-screen overflow-hidden">
                      <Sidebar
                        notificationCount={overdueCount}
                        isOpen={isSidebarOpen}
                        isCollapsed={isSidebarCollapsed}
                        onClose={() => setIsSidebarOpen(false)}
                      />
                      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-out h-full ${isSidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-[236px]'}`}>
                          <TopBar
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                            isSidebarCollapsed={isSidebarCollapsed}
                            onToggleCollapse={toggleSidebarCollapse}
                            isDarkMode={isDarkMode}
                            toggleTheme={() => setIsDarkMode(!isDarkMode)}
                            user={user}
                            notifications={notifications}
                            onLogout={logoutUser}
                          />
                          <main className="flex-1 overflow-y-auto p-4 md:p-6">
                              <div className="max-w-[1440px] mx-auto pb-10">
                                  <Suspense fallback={<RouteLoader />}>
                                    <Routes>
                                        <Route path="/" element={isReadOnlyRole(user) ? <ExecutiveDashboard /> : <Dashboard stats={getStats(assets)} allAssets={assets} />} />
                                        <Route path="/executive" element={<ExecutiveDashboard />} />
                                        <Route path="/assets" element={<AssetRegistryWrapper assets={assets} view={view} setView={setView} editingAsset={editingAsset} setEditingAsset={setEditingAsset} handleSaveAsset={handleSaveAsset} handleDuplicate={handleDuplicate} handleDeleteAsset={handleDeleteAsset} loading={loading} canEdit={canEdit} />} />
                                        <Route path="/requests" element={<AssetRequests />} />
                                        <Route path="/tickets" element={<TicketsAndTasks />} />
                                        <Route path="/repairs" element={<Navigate to="/tickets" replace />} />
                                        <Route path="/tasks" element={<Navigate to="/tickets" replace />} />
                                        <Route path="/invoices" element={<Invoices />} />
                                        <Route path="/planner" element={<Planner />} />
                                        <Route path="/venues" element={<Venues />} />
                                        <Route path="/reports" element={<Reports />} />
                                        <Route path="/staff" element={<ProtectedRoute requiredRole="technician"><StaffView /></ProtectedRoute>} />
                                        <Route path="/settings" element={<ProtectedRoute requiredRole="technician"><Settings /></ProtectedRoute>} />
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </Routes>
                                  </Suspense>
                              </div>
                          </main>
                      </div>
                  </div>
                  )
              } />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
};

const App = () => (
  <AppDataProvider>
    <AppShell />
  </AppDataProvider>
);

export default App;
