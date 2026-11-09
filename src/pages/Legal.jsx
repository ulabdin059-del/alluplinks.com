import { useSeo, useSite } from '../lib/site.jsx';
import { telHref } from '../lib/utils.js';
import { PageHero } from '../components/ui.jsx';

export default function Legal({ kind }) {
  const { business: b } = useSite();
  const privacy = kind === 'privacy';
  useSeo(privacy ? 'Privacy Policy | All Uplinks' : 'Terms of Service | All Uplinks',
    privacy ? 'How All Uplinks collects, uses and protects the personal information you share through bookings, trade-ins and inquiries.' : 'Terms that apply to repairs, bookings, trade-ins and purchases at All Uplinks in Keswick, Ontario.', privacy ? '/privacy' : '/terms');
  return (
    <div>
      <PageHero title={privacy ? 'Privacy policy' : 'Terms of service'} crumbs={[[privacy ? 'Privacy' : 'Terms']]} />
      <div className="container-x prose-au max-w-3xl py-14">
        {privacy ? (<>
          <p>This policy explains how {b.name} (“we”, “us”) handles personal information collected through this website, in line with Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA).</p>
          <h2>What we collect</h2>
          <ul><li>Contact details you provide — name, email address and phone number.</li><li>Device and repair details, including photos you choose to upload.</li><li>Trade-in answers about your device’s condition.</li><li>Basic technical information needed to run the website securely.</li></ul>
          <h2>How we use it</h2>
          <p>We use your information only to schedule and carry out repairs, respond to inquiries, assess trade-ins, and send messages related to your request. We do not sell your personal information.</p>
          <h2>Your device data</h2>
          <p>We only access the data on your device where necessary to test a repair, and we never copy personal content without your permission. We recommend backing up your device before any repair.</p>
          <h2>Retention and security</h2>
          <p>Records are kept only as long as needed for the purposes above and for legal and accounting requirements. Access is restricted to authorized staff.</p>
          <h2>Your rights</h2>
          <p>You may ask to access or correct your personal information, or withdraw consent, by calling us at <a href={telHref(b)}>{b.phone_display}</a> or visiting the store at {b.street}, {b.city}, {b.region_name}.</p>
        </>) : (<>
          <p>These terms apply to services and products provided by {b.name} at {b.street}, {b.city}, {b.region_name}.</p>
          <h2>Prices and estimates</h2>
          <p>Prices on this website are in Canadian dollars and exclude applicable taxes. Online prices and trade-in values are estimates; the final price or offer is confirmed after an in-store inspection and before any work begins or any payment is made.</p>
          <h2>Bookings</h2>
          <p>Booking an appointment reserves a time slot. If you need to change or cancel, please call us as early as possible. Appointment times may occasionally need to be adjusted; we will contact you if so.</p>
          <h2>Repairs</h2>
          <p>Please back up your device before any repair. Devices with prior damage, liquid exposure or previous third-party repairs can develop additional faults during repair; we will discuss any such risks with you before proceeding.</p>
          <h2>Trade-ins</h2>
          <p>Devices offered for trade-in must be legally owned by you, signed out of all accounts, and not reported lost or stolen. Government-issued photo ID is required.</p>
          <h2>Unclaimed devices</h2>
          <p>Please collect repaired devices promptly. We will contact you using the details you provide when your device is ready.</p>
          <h2>Contact</h2>
          <p>Questions? Call <a href={telHref(b)}>{b.phone_display}</a>.</p>
        </>)}
      </div>
    </div>
  );
}
