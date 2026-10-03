import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Account from './Account';
import { ACCESS } from './access';
import Activity from './Activity';
import GalleryAdmin from './GalleryAdmin';
import Layout from './Layout';
import Login from './Login';
import Mail from './Mail';
import Overview from './Overview';
import Posts from './Posts';
import ProjectsAdmin from './ProjectsAdmin';
import ServicesAdmin from './ServicesAdmin';
import Settings from './Settings';
import { MyDocuments, MyMessages, MyProjects } from './Stakeholder';
import { ToastProvider } from './ui';
import Users from './Users';


function Guard({ path, children }: { path: string; children: JSX.Element }) {
  const { user } = useAuth();
  return user && ACCESS[path].includes(user.role) ? children : <Navigate to="/portal" replace />;
}

export default function PortalApp() {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="boot">Loading…</div>;
  const isLogin = loc.pathname.replace(/\/$/, '') === '/portal/login';
  if (!user && !isLogin) return <Navigate to="/portal/login" replace state={{ from: loc.pathname }} />;
  if (user && isLogin) return <Navigate to="/portal" replace />;

  return (
    <div className="portal">
      <ToastProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="mail" element={<Guard path="mail"><Mail /></Guard>} />
            <Route path="posts" element={<Guard path="posts"><Posts /></Guard>} />
            <Route path="gallery" element={<Guard path="gallery"><GalleryAdmin /></Guard>} />
            <Route path="services" element={<Guard path="services"><ServicesAdmin /></Guard>} />
            <Route path="users" element={<Guard path="users"><Users /></Guard>} />
            <Route path="projects" element={<Guard path="projects">{user?.role === 'admin' ? <ProjectsAdmin /> : <MyProjects />}</Guard>} />
            <Route path="settings" element={<Guard path="settings"><Settings /></Guard>} />
            <Route path="activity" element={<Guard path="activity"><Activity /></Guard>} />
            <Route path="documents" element={<Guard path="documents"><MyDocuments /></Guard>} />
            <Route path="messages" element={<Guard path="messages"><MyMessages /></Guard>} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </div>
  );
}
