import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Spinner from './components/Spinner.jsx';

const Services = lazy(() => import('./pages/Services.jsx'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail.jsx'));
const RepairPrices = lazy(() => import('./pages/RepairPrices.jsx'));
const Book = lazy(() => import('./pages/Book.jsx'));
const Sell = lazy(() => import('./pages/Sell.jsx'));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Faq = lazy(() => import('./pages/Faq.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Reviews = lazy(() => import('./pages/Reviews.jsx'));
const Legal = lazy(() => import('./pages/Legal.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

const Page = ({ children }) => <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>{children}</Suspense>;

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/admin/*" element={<Page><AdminApp /></Page>} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Page><Services /></Page>} />
          <Route path="services/:slug" element={<Page><ServiceDetail /></Page>} />
          <Route path="repair-prices" element={<Page><RepairPrices /></Page>} />
          <Route path="book" element={<Page><Book /></Page>} />
          <Route path="sell" element={<Page><Sell /></Page>} />
          <Route path="shop" element={<Page><Shop /></Page>} />
          <Route path="shop/product/:slug" element={<Page><Product /></Page>} />
          <Route path="shop/:category" element={<Page><Shop /></Page>} />
          <Route path="contact" element={<Page><Contact /></Page>} />
          <Route path="faq" element={<Page><Faq /></Page>} />
          <Route path="about" element={<Page><About /></Page>} />
          <Route path="reviews" element={<Page><Reviews /></Page>} />
          <Route path="privacy" element={<Page><Legal kind="privacy" /></Page>} />
          <Route path="terms" element={<Page><Legal kind="terms" /></Page>} />
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Route>
      </Routes>
    </>
  );
}
