import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { AppProvider } from '@context/AppContext';
import { ThemeProvider } from '@context/ThemeContext';
import AppLayout from '@components/layout/AppLayout';
import { PremiumUIProvider } from '@components/ui/PremiumUI';
import { AudioProvider } from '@context/AudioContext';

// Pages
import Login         from '@pages/auth/Login';
import Signup        from '@pages/auth/Signup';
import Dashboard     from '@pages/Dashboard';
import Notes         from '@pages/Notes';
import Tasks         from '@pages/Tasks';
import Progress      from '@pages/Progress';
import FocusTimer    from '@pages/FocusTimer';
import Schedule      from '@pages/Schedule';
import CheckIn       from '@pages/CheckIn';
import LearningPaths from '@pages/LearningPaths';
import Videos        from '@pages/Videos';
import Settings      from '@pages/Settings';
import Network       from '@pages/Network';

function Loader() {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40,height:40,borderRadius:'50%',border:'2px solid rgba(9,205,131,0.2)',borderTop:'2px solid #09cd83',animation:'spin 1s linear infinite',margin:'0 auto 12px' }}/>
        <p style={{ fontSize:12,color:'var(--t4)' }}>Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuth, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loader/>;
  if (!isAuth) return <Navigate to="/login" state={{ from:loc }} replace/>;
  return children;
}

function GuestRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) return <Loader/>;
  if (isAuth) return <Navigate to="/dashboard" replace/>;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
      <Route path="/login"  element={<GuestRoute><Login/></GuestRoute>}/>
      <Route path="/signup" element={<GuestRoute><Signup/></GuestRoute>}/>
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/dashboard"    element={<Dashboard/>}/>
              <Route path="/notes"        element={<Notes/>}/>
              <Route path="/tasks"        element={<Tasks/>}/>
              <Route path="/progress"     element={<Progress/>}/>
              <Route path="/focus"        element={<FocusTimer/>}/>
              <Route path="/schedule"     element={<Schedule/>}/>
              <Route path="/checkin"      element={<CheckIn/>}/>
              <Route path="/paths"        element={<LearningPaths/>}/>
              <Route path="/videos"       element={<Videos/>}/>
              <Route path="/network"      element={<Network/>}/>
              <Route path="/settings"     element={<Settings/>}/>
              <Route path="*"             element={<Navigate to="/dashboard" replace/>}/>
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      }/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <AudioProvider>
              <PremiumUIProvider>
                <AppRoutes/>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration:3000,
                    style:{
                      background:'var(--s3)',color:'var(--t1)',
                      border:'1px solid var(--glass-b)',borderRadius:12,
                      fontSize:13.5,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,
                      boxShadow:'var(--sh-lg)',
                    },
                    success:{ iconTheme:{ primary:'var(--success)', secondary:'var(--bg-deep)' } },
                    error:  { iconTheme:{ primary:'var(--danger)', secondary:'var(--t1)' } },
                  }}
                />
              </PremiumUIProvider>
            </AudioProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
