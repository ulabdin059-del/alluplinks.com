import { useSeo } from '../lib/site.jsx';
import { useReveal } from '../lib/utils.js';
import { PageHero } from '../components/ui.jsx';
import ReviewsSection from '../components/Reviews.jsx';

export default function Reviews() {
  useSeo('Customer Reviews | All Uplinks Keswick', 'Read and leave reviews for All Uplinks phone repair in Keswick, Ontario.', '/reviews');
  const ref = useReveal();
  return (
    <div ref={ref}>
      <PageHero eyebrow="Reviews" title="Customer reviews" crumbs={[['Reviews']]}>Real feedback from customers. Reviews are checked before they’re published.</PageHero>
      <div className="container-x py-14"><ReviewsSection limit={60} showForm /></div>
    </div>
  );
}
