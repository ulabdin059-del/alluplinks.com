import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import { loaders } from './routes.js';

const Services = lazy(loaders.services);
const ServiceDetail = lazy(loaders.serviceDetail);
const RepairPrices = lazy(loaders.repairPrices);
const Book = lazy(loaders.book);
const Sell = lazy(loaders.sell);
const Shop = lazy(loaders.shop);
const Product = lazy(loaders.product);
const Contact = lazy(loaders.contact);
const Faq = lazy(loaders.faq);
const About = lazy(loaders.about);
const Reviews = lazy(loaders.reviews);
const Legal = lazy(loaders.legal);
const NotFound = lazy(loaders.notFound);
const AdminApp = lazy(loaders.admin);

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, hash]);
  return null;
}

// Navigation runs as a React transition (see main.jsx), so while the next page's code loads the current
// page stays on screen. The page boundary lives in Layout; the fallback below only covers the admin area.
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-mist-50" aria-busy="true" />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="services/:slug" element={<ServiceDetail />} />
            <Route path="repair-prices" element={<RepairPrices />} />
            <Route path="book" element={<Book />} />
            <Route path="sell" element={<Sell />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/product/:slug" element={<Product />} />
            <Route path="shop/:category" element={<Shop />} />
            <Route path="contact" element={<Contact />} />
            <Route path="faq" element={<Faq />} />
            <Route path="about" element={<About />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="privacy" element={<Legal kind="privacy" />} />
            <Route path="terms" element={<Legal kind="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
