import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { MessageSquare, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from './components/common/Button';

function MainLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#f4f6fb] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 animate-pulse">
          <MessageSquare className="w-6 h-6 fill-current" />
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          Loading Connectly...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Once authenticated, display confirmation while we move to Screen 2
  return (
    <div className="min-h-screen w-full bg-[#f4f6fb] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-900/5 border border-slate-200/80 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Authenticated Successfully!</h2>
          <p className="text-xs text-slate-500">
            You are logged in and your session is active.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-left space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-medium">Username:</span>
            <span className="text-slate-900 font-semibold">{user?.username}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-medium">Email:</span>
            <span className="text-slate-900 font-semibold">{user?.email}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-medium">User ID:</span>
            <span className="text-slate-600 font-mono text-[11px] truncate max-w-[200px]">{user?.id}</span>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={logout}
            className="w-full text-slate-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;

