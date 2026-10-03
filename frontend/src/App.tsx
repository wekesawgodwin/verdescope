import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PwaStatus from './components/PwaStatus';
import About from './site/About';
import Blog from './site/Blog';
import Contact from './site/Contact';
import Gallery from './site/Gallery';
import Home from './site/Home';
import NotFound from './site/NotFound';
import PostPage from './site/PostPage';
import Services from './site/Services';
import SiteLayout from './site/SiteLayout';

// The portal is code-split so public visitors never download it
const Portal = lazy(() => import('./portal/PortalApp'));

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<PostPage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="portal/*" element={<Suspense fallback={<div className="boot">Loading portal…</div>}><Portal /></Suspense>} />
      </Routes>
      <PwaStatus />
    </>
  );
}
