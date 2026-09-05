import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { AuthPage } from './pages/AuthPage';
import { MainWorkspace } from './components/layout/MainWorkspace';
import { MessageSquare } from 'lucide-react';

function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

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

  return <MainWorkspace />;
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainLayout />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;

