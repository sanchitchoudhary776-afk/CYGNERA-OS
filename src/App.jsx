import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { AppProvider } from '@context/AppContext';
import { ThemeProvider } from '@context/ThemeContext';
import { NetworkProvider } from '@context/NetworkContext';
import { FocusShieldProvider } from '@context/FocusShieldContext';
import { isCapacitor, isTauri } from '@utils/platform';
import { PremiumUIProvider } from '@components/ui/PremiumUI';
import { AudioProvider } from '@context/AudioContext';
import OfflineBanner from '@components/ui/OfflineBanner';
import FocusShield from '@components/ui/FocusShield';

const WebShell     = lazy(() => import('@components/layout/WebShell'));
const MobileShell  = lazy(() => import('@components/layout/MobileShell'));
const DesktopShell = lazy(() => import('@components/layout/DesktopShell'));

function PlatformShell({ children }) {
  if (isCapacitor) return <MobileShell>{children}</MobileShell>;
  if (isTauri) return <DesktopShell>{children}</DesktopShell>;
  return <WebShell>{children}</WebShell>;
}

// Auth & pre-login pages (eager — needed before authentication)
import Login         from '@pages/auth/Login';
import Signup        from '@pages/auth/Signup';
import Landing       from '@pages/Landing';

// Pages — lazy-loaded for code-splitting (cuts initial bundle from ~1.1MB to ~200KB)
const Dashboard     = lazy(() => import('@pages/Dashboard'));
const Notes         = lazy(() => import('@pages/Notes'));
const Tasks         = lazy(() => import('@pages/Tasks'));
const Progress      = lazy(() => import('@pages/Progress'));
const FocusTimer    = lazy(() => import('@pages/FocusTimer'));
const Schedule      = lazy(() => import('@pages/Schedule'));
const LearningPaths = lazy(() => import('@pages/LearningPaths'));
const Videos        = lazy(() => import('@pages/Videos'));
const Settings      = lazy(() => import('@pages/Settings'));
const Network       = lazy(() => import('@pages/Network'));

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

function RootRedirect() {
  const loc = useLocation();
  const { isAuth } = useAuth();
  if (isAuth) {
    return <Navigate to={`/dashboard${loc.hash || ''}`} replace={true} />;
  }
  return <Landing />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect/>}/>

      <Route path="/login"  element={<GuestRoute><Login/></GuestRoute>}/>
      <Route path="/signup" element={<GuestRoute><Signup/></GuestRoute>}/>
      <Route path="/*" element={
        <ProtectedRoute>
          <Suspense fallback={<Loader/>}>
            <PlatformShell>
              <Routes>
                <Route path="dashboard"    element={<Dashboard/>}/>
                <Route path="notes"        element={<Notes/>}/>
                <Route path="tasks"        element={<Tasks/>}/>
                <Route path="progress"     element={<Progress/>}/>
                <Route path="focus"        element={<FocusTimer/>}/>
                <Route path="schedule"     element={<Schedule/>}/>
                <Route path="checkin"      element={<Navigate to="/progress" replace state={{ tab: 'calibration' }}/>}/>
                <Route path="paths"        element={<LearningPaths/>}/>
                <Route path="videos"       element={<Videos/>}/>
                <Route path="network"      element={<Network/>}/>
                <Route path="settings"     element={<Settings/>}/>
                <Route path="*"            element={<Navigate to="/dashboard" replace/>}/>
              </Routes>
            </PlatformShell>
          </Suspense>
        </ProtectedRoute>
      }/>
    </Routes>
  );
}

import { ErrorBoundary } from '@components/ui/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <NetworkProvider>
            <FocusShieldProvider>
              <AppProvider>
                <AudioProvider>
                  <PremiumUIProvider>
                    <ErrorBoundary>
                      <OfflineBanner />
                      <FocusShield />
                      <AppRoutes/>
                      <Toaster
                        position="top-right"
                        toastOptions={{
                          duration:3000,
                          style:{
                            background:'var(--s3)',color:'var(--t1)',
                            border:'1px solid var(--glass-b)',borderRadius:12,
                            fontSize:13.5,fontFamily:"'Inter', sans-serif",fontWeight:600,
                            boxShadow:'var(--sh-lg)',
                          },
                          success:{ iconTheme:{ primary:'var(--success)', secondary:'var(--bg-deep)' } },
                          error:  { iconTheme:{ primary:'var(--danger)', secondary:'var(--t1)' } },
                        }}
                      />
                    </ErrorBoundary>
                  </PremiumUIProvider>
                </AudioProvider>
              </AppProvider>
            </FocusShieldProvider>
          </NetworkProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
