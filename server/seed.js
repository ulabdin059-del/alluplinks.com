// First-run seed content for All Uplinks. Everything here is editable from the admin dashboard.

export const STORE_HOURS = [
  { day: 'Monday', open: '09:00', close: '17:00', closed: false },
  { day: 'Tuesday', open: '09:00', close: '17:00', closed: false },
  { day: 'Wednesday', open: '09:00', close: '17:00', closed: false },
  { day: 'Thursday', open: '09:00', close: '17:00', closed: false },
  { day: 'Friday', open: '09:00', close: '17:00', closed: false },
  { day: 'Saturday', open: '10:00', close: '16:00', closed: false },
  { day: 'Sunday', open: '10:00', close: '16:00', closed: false }
];
// Keys are JS weekday numbers (0 = Sunday).
export const BOOKING_WEEKLY = {
  0: { open: '10:00', close: '16:00' },
  1: { open: '09:00', close: '17:00' }, 2: { open: '09:00', close: '17:00' }, 3: { open: '09:00', close: '17:00' },
  4: { open: '09:00', close: '17:00' }, 5: { open: '09:00', close: '17:00' },
  6: { open: '10:00', close: '16:00' }
};

export const DEFAULT_SETTINGS = {
  business: {
    name: 'All Uplinks',
    legal_name: 'All Uplinks - Phone Repair Keswick',
    street: '443 The Queensway South',
    city: 'Keswick',
    region: 'ON',
    region_name: 'Ontario',
    postal_code: '',
    country: 'CA',
    phone_display: '905-535-9503',
    phone_tel: '+19055359503',
    email: 'alluplinks1@gmail.com',
    site_url: 'https://alluplinks.com',
    maps_query: 'All Uplinks - Phone Repair Keswick, 443 The Queensway South, Keswick, Ontario, Canada',
    google_review_url: 'https://maps.app.goo.gl/aShYzmUiNqCu9nHr8',
    // Direct "write a review" link from Google Business Profile (Ask for reviews → share link). Falls back to google_review_url.
    google_write_review_url: ''
  },
  // Store hours confirmed by the owner: weekdays 9–5, weekends 10–4.
  hours: STORE_HOURS,
  content: {
    announcement: 'Upfront, model-specific repair prices in CAD — book your repair online in under two minutes.',
    announcement_short: 'Upfront prices · Book online',
    hero_eyebrow: 'Keswick, Ontario',
    hero_title: 'Phone repair in Keswick — fixed fast, priced upfront.',
    hero_subtitle: 'Screens, batteries, charging ports and more for iPhone, Samsung, Google Pixel, iPad, laptops and game consoles. See your exact price online, then book a time at our Queensway South store.',
    about_title: 'A local repair shop that respects your time and your device',
    about_body: 'All Uplinks is a Keswick repair store on The Queensway South. We fix phones, tablets, laptops and consoles, buy and trade in used devices, and stock the accessories that keep them protected and charged. Every price on this site is specific to your model, so you know what to expect before you walk in.',
    cta_title: 'Ready to get your device working again?',
    cta_body: 'Check your exact price, pick a time that suits you, and we’ll have everything ready when you arrive.'
  },
  pricing: {
    variance: 60,
    note: 'Final price depends on part availability, part quality and device condition. We always confirm the price with you before any work begins.'
  },
  warranty: { text: '' },
  booking: {
    slot_minutes: 30,
    capacity: 1,
    days_ahead: 14,
    min_lead_minutes: 30,
    // Online booking windows follow store hours: 30-minute slots, last slot 30 minutes before closing.
    weekly: BOOKING_WEEKLY
  },
  seo: {
    default_title: 'Phone Repair Keswick, ON | iPhone & Samsung Repair | All Uplinks',
    default_description: 'Phone repair in Keswick, Ontario. iPhone, Samsung and Pixel screen, battery, charging port and back glass repair with model-specific prices in CAD. Book online at All Uplinks.',
    og_image: '/images/hero-technician-1280.webp'
  }
};

const T = { screen: '30–60 min', battery: '30–45 min', port: '45–60 min', back: '1–2 hours', camera: '45–60 min',
  keyboard: '1–2 hours', hdmi: '2–3 hours', overheat: '1–2 hours', drift: '30–60 min', disc: '1–2 hours' };

// [key, display name, time estimate, diagnose-only]
export const REPAIR_TYPES = {
  Phone: [
    ['screen', 'Screen replacement', T.screen], ['battery', 'Battery replacement', T.battery],
    ['port', 'Charging port repair', T.port], ['back', 'Back glass replacement', T.back],
    ['camera', 'Camera repair', T.camera], ['speaker', 'Speaker / microphone', null, true],
    ['water', 'Water damage', null, true], ['board', 'Motherboard / micro-soldering', null, true],
    ['data', 'Data recovery', null, true], ['software', 'Software troubleshooting', null, true],
    ['other', 'Something else / not sure', null, true]
  ],
  Tablet: [
    ['screen', 'Screen replacement', T.screen], ['battery', 'Battery replacement', T.battery],
    ['port', 'Charging port repair', T.port], ['water', 'Water damage', null, true],
    ['board', 'Motherboard / micro-soldering', null, true], ['software', 'Software troubleshooting', null, true],
    ['other', 'Something else / not sure', null, true]
  ],
  Laptop: [
    ['screen', 'Screen replacement', T.screen], ['battery', 'Battery replacement', T.battery],
    ['keyboard', 'Keyboard replacement', T.keyboard], ['port', 'Charging port repair', T.port],
    ['nopower', 'Won’t turn on', null, true], ['water', 'Liquid damage', null, true],
    ['data', 'Data recovery', null, true], ['software', 'Software / OS troubleshooting', null, true],
    ['other', 'Something else / not sure', null, true]
  ],
  Console: [
    ['hdmi', 'HDMI port repair', T.hdmi], ['overheat', 'Overheating / deep clean', T.overheat],
    ['drift', 'Controller stick drift', T.drift], ['disc', 'Disc drive repair', T.disc],
    ['nopower', 'Won’t power on', null, true], ['other', 'Something else / not sure', null, true]
  ],
  Other: [
    ['screen', 'Screen damage', null, true], ['battery', 'Battery issue', null, true],
    ['port', 'Charging problem', null, true], ['water', 'Water damage', null, true],
    ['software', 'Software issue', null, true], ['other', 'Something else / not sure', null, true]
  ]
};

// brands: [display name, source device type in price data, source brand in price data]
export const CATEGORIES = [
  { slug: 'iphone', name: 'iPhone', device_type: 'Phone', image: 'prod-iphone-blue', blurb: 'iPhone 6 to iPhone 18 Pro Max', brands: [['Apple', 'Phone', 'Apple']] },
  { slug: 'samsung', name: 'Samsung', device_type: 'Phone', image: 'svc-samsung-screen', blurb: 'Galaxy S, Z Fold, Z Flip, Note & A series', brands: [['Samsung', 'Phone', 'Samsung']] },
  { slug: 'google-pixel', name: 'Google Pixel', device_type: 'Phone', image: 'prod-android', blurb: 'Pixel 7, 8 and 9 series', brands: [['Google', 'Phone', 'Google']] },
  { slug: 'ipad', name: 'iPad', device_type: 'Tablet', image: 'svc-ipad', blurb: 'iPad, iPad Air and iPad Pro', brands: [['Apple', 'Tablet', 'Apple']] },
  { slug: 'tablet', name: 'Tablet', device_type: 'Tablet', image: 'svc-tablet', blurb: 'Samsung Galaxy Tab and other tablets', brands: [['Samsung', 'Tablet', 'Samsung'], ['Other tablet brand', null, null]] },
  { slug: 'laptop', name: 'Laptop', device_type: 'Laptop', image: 'svc-laptop', blurb: 'Dell, HP, Lenovo and more', brands: [['Dell', 'Laptop', 'Dell'], ['HP', 'Laptop', 'HP'], ['Lenovo', 'Laptop', 'Lenovo'], ['Other laptop brand', null, null]] },
  { slug: 'macbook', name: 'MacBook', device_type: 'Laptop', image: 'svc-macbook', blurb: 'MacBook Air and MacBook Pro', brands: [['Apple', 'Laptop', 'Apple']] },
  { slug: 'gaming-console', name: 'Gaming Console', device_type: 'Console', image: 'svc-console', blurb: 'PlayStation, Xbox and Nintendo Switch', brands: [['PlayStation', 'Console', 'PlayStation'], ['Xbox', 'Console', 'Xbox'], ['Nintendo', 'Console', 'Nintendo']] },
  { slug: 'other', name: 'Other Devices', device_type: 'Other', image: 'phone-hand', blurb: 'Other phones, smartwatches & electronics', brands: [['Other brand', null, null]] }
];

const diag = 'Quoted after an in-store diagnosis. We explain what we found and confirm the price with you before any repair begins.';

export const SERVICES = [
  {
    slug: 'iphone-screen-replacement', name: 'iPhone Screen Replacement', featured: true,
    short: 'Cracked glass, black spots, lines or a touch screen that stopped responding — replaced while you wait on most models.',
    description: 'A damaged iPhone display is more than cosmetic: cracks spread, touch becomes unreliable and glass splinters can cut. We replace the complete display assembly, transfer your earpiece and sensors, and test True Tone, Face ID, brightness and touch before handing your phone back. Most iPhone screens are completed in a single visit.',
    benefits: ['Model-specific pricing for every iPhone from iPhone 6 to iPhone 18 Pro Max', 'Full display assembly replaced and tested on the bench', 'Face ID, True Tone and touch checked before pickup', 'Your data stays on your phone — no reset required'],
    image: 'svc-iphone-screen', image_alt: 'Technician replacing an iPhone screen at the repair bench',
    price_source: { categories: ['iphone'], repairs: ['screen'] },
    time_estimate: T.screen,
    faqs: [
      { q: 'Will my Face ID still work after a screen replacement?', a: 'Face ID components sit in the notch area and are carefully transferred during the repair. We test Face ID with you before you leave.' },
      { q: 'Why do newer iPhone screens cost more?', a: 'Newer and Pro models use larger, higher-refresh OLED panels that cost more to source. Our calculator shows the exact advertised price for your model.' }
    ],
    meta_title: 'iPhone Screen Replacement Keswick | All Uplinks',
    meta_description: 'iPhone screen replacement in Keswick, ON. Exact prices for iPhone 6 to iPhone 18 Pro Max in CAD, most repairs done in 30–60 minutes. Book online at All Uplinks.'
  },
  {
    slug: 'iphone-battery-replacement', name: 'iPhone Battery Replacement', featured: true,
    short: 'Phone dying by mid-afternoon, shutting off at 20% or showing “Service” in Battery Health? A new battery fixes it.',
    description: 'Lithium-ion batteries wear with every charge cycle. When yours drops below about 80% capacity you will notice shorter battery life, slower performance and unexpected shutdowns. We remove the old cell safely, fit a new battery with fresh adhesive, and check charging and health readings before you go.',
    benefits: ['Restores full-day battery life', 'Fixes random shutdowns and throttled performance', 'Swollen batteries removed safely', 'Typically completed in 30–45 minutes'],
    image: 'svc-iphone-battery', image_alt: 'iPhone on a desk ready for a battery replacement',
    price_source: { categories: ['iphone'], repairs: ['battery'] },
    time_estimate: T.battery,
    faqs: [
      { q: 'How do I know my iPhone battery needs replacing?', a: 'Go to Settings → Battery → Battery Health & Charging. A maximum capacity under about 80%, or a “Service” message, means it is time for a new battery.' },
      { q: 'Is a swollen battery dangerous?', a: 'Yes. If your screen is lifting or the back is bulging, stop charging the phone and bring it in as soon as possible.' }
    ],
    meta_title: 'iPhone Battery Replacement Keswick | All Uplinks',
    meta_description: 'iPhone battery replacement in Keswick, Ontario. Model-specific prices in CAD and a typical 30–45 minute turnaround. Book your battery replacement at All Uplinks.'
  },
  {
    slug: 'samsung-screen-replacement', name: 'Samsung Screen Replacement', featured: true,
    short: 'Galaxy S, Z Fold, Z Flip, Note and A series screens — including curved and foldable displays.',
    description: 'Samsung AMOLED displays are bonded to the frame, so a cracked or bleeding screen needs careful heating, separation and re-sealing. We replace Galaxy displays with the right part for your exact model, re-seal the device and verify touch, fingerprint reader and display quality before pickup.',
    benefits: ['Prices for Galaxy S, Note, A series and foldables', 'In-display fingerprint reader tested after repair', 'Curved and foldable panels handled with care', 'Device re-sealed with new adhesive'],
    image: 'svc-samsung-screen', image_alt: 'Samsung Galaxy S21 Ultra smartphone for screen replacement',
    price_source: { categories: ['samsung'], repairs: ['screen'] },
    time_estimate: T.screen,
    faqs: [
      { q: 'My Samsung screen has a green line but still works. Should I fix it?', a: 'Lines and colour bleeding usually mean the OLED panel is damaged and will worsen over time. Replacing the screen is the reliable fix.' },
      { q: 'Do you repair Galaxy Z Fold and Z Flip screens?', a: 'Yes. Foldable screen prices are listed in our calculator for each supported model.' }
    ],
    meta_title: 'Samsung Screen Replacement Keswick | All Uplinks',
    meta_description: 'Samsung Galaxy screen repair in Keswick, ON — S series, Z Fold, Z Flip, Note and A series. Exact model prices in CAD. Book online at All Uplinks.'
  },
  {
    slug: 'samsung-battery-replacement', name: 'Samsung Battery Replacement', featured: true,
    short: 'Bring back all-day battery life on your Galaxy S, Note, A series or foldable.',
    description: 'If your Galaxy drains quickly, gets hot while charging or shuts down unexpectedly, the battery is usually to blame. We open the device safely, replace the battery, re-seal the back and confirm charging behaviour before you leave.',
    benefits: ['Model-specific Galaxy battery pricing', 'Back panel re-sealed after the repair', 'Charging and drain checked before pickup', 'Typically completed in 30–45 minutes'],
    image: 'svc-samsung-battery', image_alt: 'Samsung Galaxy S21 Ultra and box on a dark surface',
    price_source: { categories: ['samsung'], repairs: ['battery'] },
    time_estimate: T.battery,
    faqs: [{ q: 'Can I check my Samsung battery health?', a: 'Open the Samsung Members app → Support → Phone diagnostics → Battery status. A “weak” or “bad” result means a replacement will help.' }],
    meta_title: 'Samsung Battery Replacement Keswick | All Uplinks',
    meta_description: 'Samsung Galaxy battery replacement in Keswick, Ontario. See your exact price in CAD and book online with All Uplinks.'
  },
  {
    slug: 'charging-port-repair', name: 'Charging Port Repair', featured: true,
    short: 'Cable feels loose, only charges at an angle, or not at all? We clean or replace the port.',
    description: 'Most charging problems are caused by compacted lint or a worn connector. We start by inspecting and cleaning the port. If the connector itself is damaged, we replace the charging port assembly and confirm both charging and data transfer work properly.',
    benefits: ['Inspection and cleaning first — no unnecessary parts', 'Lightning and USB-C ports replaced when worn', 'Charging and data connection tested', 'Pricing for iPhone, Samsung and Pixel models'],
    image: 'svc-charging-port', image_alt: 'Smartphone lying on a wooden table, ready for charging port repair',
    price_source: { categories: ['iphone', 'samsung', 'google-pixel'], repairs: ['port'] },
    time_estimate: T.port,
    faqs: [{ q: 'Could my charging problem just be the cable?', a: 'Sometimes. We test with a known-good cable and charger first so you only pay for a repair if the port is actually the problem.' }],
    meta_title: 'Charging Port Repair Keswick | iPhone & Samsung | All Uplinks',
    meta_description: 'Phone charging port repair in Keswick, ON for iPhone, Samsung Galaxy and Google Pixel. Exact model prices in CAD. Book online at All Uplinks.'
  },
  {
    slug: 'back-glass-replacement', name: 'Back Glass Replacement', featured: true,
    short: 'Shattered back glass replaced cleanly so your phone looks — and seals — like it should.',
    description: 'Cracked back glass can cut fingers, let in moisture and interfere with wireless charging. We remove the broken glass, clean the frame and fit new back glass for your model, then confirm wireless charging and camera lenses are clear.',
    benefits: ['Restores a clean, safe finish', 'Wireless and MagSafe charging tested', 'Camera lens area inspected', 'Pricing for iPhone, Samsung and Pixel models'],
    image: 'svc-back-glass', image_alt: 'Back of a black iPhone showing the glass panel and dual cameras',
    price_source: { categories: ['iphone', 'samsung', 'google-pixel'], repairs: ['back'] },
    time_estimate: T.back,
    meta_title: 'Back Glass Replacement Keswick | All Uplinks',
    meta_description: 'iPhone and Samsung back glass replacement in Keswick, Ontario. Model-specific prices in CAD, typically 1–2 hours. Book online at All Uplinks.'
  },
  {
    slug: 'camera-repair', name: 'Camera Repair', featured: false,
    short: 'Blurry photos, a black camera screen, shaking lens or cracked camera glass — fixed.',
    description: 'Camera faults range from a cracked lens cover to a failed camera module or stabiliser. We diagnose which component is affected and replace the camera or lens as needed, then test focus, stabilisation, flash and every lens on your phone.',
    benefits: ['Rear camera module replacement', 'Focus, stabilisation and flash tested', 'Every lens checked, including ultra-wide and telephoto', 'Model-specific pricing'],
    image: 'svc-camera', image_alt: 'Close-up of a triple-lens smartphone camera',
    price_source: { categories: ['iphone', 'samsung', 'google-pixel'], repairs: ['camera'] },
    time_estimate: T.camera,
    meta_title: 'Phone Camera Repair Keswick | All Uplinks',
    meta_description: 'iPhone, Samsung and Pixel camera repair in Keswick, ON. Exact prices in CAD by model. Book online at All Uplinks.'
  },
  {
    slug: 'water-damage-repair', name: 'Water Damage Repair', featured: true,
    short: 'Dropped in water, coffee or the lake? Act fast — corrosion starts within hours.',
    description: 'Liquid damage gets worse with time as minerals corrode the logic board. We disassemble the device, clean affected components, inspect the board under magnification and repair or replace damaged parts. Because every case is different, we diagnose first and explain your options — repair, data recovery, or both.',
    benefits: ['Full disassembly and board cleaning', 'Inspection under magnification', 'Data recovery options if the phone can’t be saved', 'Clear explanation and price before repair'],
    image: 'svc-water-damage', image_alt: 'Close-up of a circuit board being inspected for liquid damage',
    price_note: diag,
    faqs: [
      { q: 'Should I put my wet phone in rice?', a: 'No. Rice does not remove moisture from inside the phone and can leave starch dust in the ports. Power the phone off, don’t charge it, and bring it in as soon as you can.' },
      { q: 'Can you guarantee a water-damaged phone will work again?', a: 'No one can guarantee that, but the sooner a device is cleaned, the better the chances. We will tell you honestly what we find.' }
    ],
    meta_title: 'Water Damage Phone Repair Keswick | All Uplinks',
    meta_description: 'Water damaged phone? All Uplinks in Keswick, ON cleans, diagnoses and repairs liquid-damaged iPhone, Samsung and other devices. Call 905-535-9503.'
  },
  {
    slug: 'motherboard-repair', name: 'Motherboard Repair', featured: false,
    short: 'No power, boot loops, no service or no audio? Board-level faults need board-level repair.',
    description: 'When a phone won’t turn on or a feature fails even after the obvious parts are replaced, the fault is often on the logic board. We trace power rails and components to find the failed part, then repair the board rather than replacing the whole device wherever possible.',
    benefits: ['Diagnosis of no-power and boot-loop faults', 'Component-level repair instead of board swaps', 'Often saves devices other shops call unrepairable', 'Price confirmed before work starts'],
    image: 'svc-motherboard', image_alt: 'Close-up of an electronic logic board with chips and components',
    price_note: diag,
    meta_title: 'Phone Motherboard Repair Keswick | All Uplinks',
    meta_description: 'Logic board and motherboard repair for phones and tablets in Keswick, Ontario. No-power, boot loop and board faults diagnosed at All Uplinks.'
  },
  {
    slug: 'micro-soldering', name: 'Micro Soldering', featured: false,
    short: 'Precision soldering for charging ICs, backlight circuits, connectors and more.',
    description: 'Micro soldering is the repair of tiny surface-mount components on a device’s logic board. It is how faults such as a failed charging IC, a torn display connector or a damaged backlight circuit are repaired properly. Each job is quoted after inspection.',
    benefits: ['Replacement of failed ICs and connectors', 'Repair of torn pads and traces', 'Fixes faults that part swaps can’t', 'Quoted after inspection'],
    image: 'svc-micro-soldering', image_alt: 'Technician soldering components on a circuit board',
    price_note: diag,
    meta_title: 'Micro Soldering Repair Keswick | All Uplinks',
    meta_description: 'Board-level micro soldering in Keswick, ON — charging IC, connector and circuit repair for phones and tablets at All Uplinks.'
  },
  {
    slug: 'data-recovery', name: 'Data Recovery', featured: false,
    short: 'Phone dead, dropped or water-damaged? Your photos and contacts may still be recoverable.',
    description: 'Your photos, messages and contacts are often worth more than the device itself. When a phone won’t boot, we focus on getting it running long enough to safely retrieve your data. We assess the device first and tell you the likelihood of success before starting.',
    benefits: ['Recovery from phones that won’t power on', 'Water-damaged device recovery attempts', 'Your data is handled privately', 'Honest assessment before you commit'],
    image: 'svc-data-recovery', image_alt: 'Open hard drive platter used to illustrate data recovery',
    price_note: diag,
    meta_title: 'Phone Data Recovery Keswick | All Uplinks',
    meta_description: 'Recover photos and data from dead or water-damaged phones in Keswick, Ontario. Assessment first, then a clear quote from All Uplinks.'
  },
  {
    slug: 'ipad-repair', name: 'iPad Repair', featured: false,
    short: 'iPad screen, battery and charging port repair with model-specific prices.',
    description: 'From cracked glass on a kid’s iPad to a worn battery on an iPad Pro, we repair the most common iPad faults. Prices below are for the models we stock parts for; other iPad models are welcome — book an assessment and we’ll quote you.',
    benefits: ['iPad, iPad Air and iPad Pro', 'Screen, battery and charging port repairs', 'Touch and Apple Pencil response tested', 'Clear model-specific pricing'],
    image: 'svc-ipad', image_alt: 'iPad Pro with Apple Pencil on a dark surface',
    price_source: { categories: ['ipad'], repairs: ['screen', 'battery', 'port'] },
    time_estimate: T.screen,
    meta_title: 'iPad Repair Keswick | Screen & Battery | All Uplinks',
    meta_description: 'iPad screen, battery and charging port repair in Keswick, ON. Prices in CAD for iPad, iPad Air and iPad Pro. Book online at All Uplinks.'
  },
  {
    slug: 'tablet-repair', name: 'Tablet Repair', featured: false,
    short: 'Samsung Galaxy Tab and Android tablet screens, batteries and charging ports.',
    description: 'We repair Samsung Galaxy Tab models and many other Android tablets. For listed models you can see the exact price now; for anything else, book an assessment and we’ll confirm parts and pricing.',
    benefits: ['Galaxy Tab screen, battery and port repair', 'Other tablet brands assessed', 'Touch and charging tested before pickup', 'Price confirmed before work begins'],
    image: 'svc-tablet', image_alt: 'Hand holding a tablet showing its home screen',
    price_source: { categories: ['tablet'], repairs: ['screen', 'battery', 'port'] },
    time_estimate: T.screen,
    meta_title: 'Tablet Repair Keswick | Samsung Galaxy Tab | All Uplinks',
    meta_description: 'Samsung Galaxy Tab and Android tablet repair in Keswick, Ontario. Screen, battery and charging port prices in CAD at All Uplinks.'
  },
  {
    slug: 'laptop-repair', name: 'Laptop Repair', featured: false,
    short: 'Dell, HP and Lenovo screens, batteries, keyboards and charging ports.',
    description: 'A cracked laptop screen, a battery that won’t hold charge, sticky keys or a loose charging port — we repair common Windows laptop faults. Laptop prices are grouped by model family; we confirm the exact part for your machine when you book.',
    benefits: ['Screen, battery, keyboard and port repair', 'Dell Inspiron, Latitude and XPS', 'HP Pavilion and ProBook, Lenovo IdeaPad and ThinkPad', 'No-power faults diagnosed in store'],
    image: 'svc-laptop', image_alt: 'Dell laptop on a white surface',
    price_source: { categories: ['laptop'], repairs: ['screen', 'battery', 'keyboard', 'port'] },
    time_estimate: '1–2 hours',
    meta_title: 'Laptop Repair Keswick | Dell, HP, Lenovo | All Uplinks',
    meta_description: 'Laptop screen, battery, keyboard and charging port repair in Keswick, ON for Dell, HP and Lenovo. Prices in CAD at All Uplinks.'
  },
  {
    slug: 'macbook-repair', name: 'MacBook Repair', featured: false,
    short: 'MacBook Air and MacBook Pro screen, battery, keyboard and port repair.',
    description: 'We repair MacBook Air (M1, M2 and M3) and 14-inch MacBook Pro screens, batteries, keyboards and charging ports. If your Mac has another fault or model, book an assessment and we’ll quote before any work starts.',
    benefits: ['MacBook Air M1, M2/M3 and MacBook Pro 14"', 'Screen, battery, keyboard and port repairs', 'Battery cycle count and health verified', 'Your files stay on your Mac'],
    image: 'svc-macbook', image_alt: 'MacBook Air open on a wooden desk',
    price_source: { categories: ['macbook'], repairs: ['screen', 'battery', 'keyboard', 'port'] },
    time_estimate: '1–2 hours',
    meta_title: 'MacBook Repair Keswick | Screen & Battery | All Uplinks',
    meta_description: 'MacBook Air and MacBook Pro repair in Keswick, Ontario. Screen, battery, keyboard and port prices in CAD at All Uplinks.'
  },
  {
    slug: 'gaming-console-repair', name: 'Gaming Console Repair', featured: true,
    short: 'PS5, Xbox and Nintendo Switch — HDMI ports, overheating, stick drift and disc drives.',
    description: 'No picture on the TV, a console that sounds like a jet engine, or a controller that moves on its own? We repair HDMI ports, deep-clean and re-paste overheating consoles, fix joystick drift and repair disc drives on PlayStation, Xbox and Nintendo Switch.',
    benefits: ['HDMI port replacement', 'Deep clean and thermal service', 'Controller and Joy-Con stick drift repair', 'Disc drive repair for PS5, PS4 and Xbox'],
    image: 'svc-console', image_alt: 'PlayStation 5 console with DualSense controller',
    price_source: { categories: ['gaming-console'], repairs: ['hdmi', 'overheat', 'drift', 'disc'] },
    time_estimate: '30 min – 3 hours',
    meta_title: 'Game Console Repair Keswick | PS5, Xbox, Switch | All Uplinks',
    meta_description: 'PS5, PS4, Xbox and Nintendo Switch repair in Keswick, ON. HDMI port, overheating, stick drift and disc drive prices in CAD at All Uplinks.'
  },
  {
    slug: 'speaker-microphone-repair', name: 'Speaker & Microphone Repair', featured: false,
    short: 'People can’t hear you, audio is muffled, or the speaker crackles? We find and fix the cause.',
    description: 'Audio problems can come from debris in the speaker mesh, a failed speaker or microphone, liquid exposure or a board-level audio fault. We test each speaker and microphone individually, clean or replace the faulty part, and confirm call and recording quality before you leave.',
    benefits: ['Earpiece, loudspeaker and microphone testing', 'Cleaning of blocked speaker grilles', 'Component replacement where needed', 'Call and recording quality verified'],
    image: 'svc-speaker-mic', image_alt: 'iPhone next to wireless earbuds on a wooden table',
    price_note: diag,
    meta_title: 'Phone Speaker & Microphone Repair Keswick | All Uplinks',
    meta_description: 'Phone speaker, earpiece and microphone repair in Keswick, Ontario. Diagnosis and repair for iPhone, Samsung and Pixel at All Uplinks.'
  },
  {
    slug: 'software-troubleshooting', name: 'Software Troubleshooting', featured: false,
    short: 'Boot loops, stuck updates, storage full, slow performance or setup and data transfer help.',
    description: 'Not every problem needs a part. We help with failed updates, boot loops, storage clean-ups, account and setup issues, and moving your data to a new phone. We will always tell you if a problem is hardware-related before recommending a repair.',
    benefits: ['Failed update and boot loop recovery', 'New phone setup and data transfer', 'Performance and storage clean-up', 'Honest advice — no unnecessary repairs'],
    image: 'svc-software', image_alt: 'Smartphone showing a lock screen on a yellow background',
    price_note: diag,
    meta_title: 'Phone Software Troubleshooting Keswick | All Uplinks',
    meta_description: 'Phone and tablet software help in Keswick, ON — boot loops, failed updates, data transfer and setup at All Uplinks.'
  }
];

const P = (o) => ({ condition: 'new', price: null, featured: false, ...o });
export const PRODUCTS = [
  P({ slug: 'new-iphone-special-order', name: 'New Apple iPhone (Unlocked)', category: 'new-phones', brand: 'Apple', featured: true,
    images: ['prod-iphones-hand'], short: 'Current-generation iPhone models, unlocked for any Canadian carrier.',
    description: 'Looking for a new iPhone? Tell us the model, storage and colour you want and we’ll confirm current pricing and availability. We can also transfer your data from your old phone and give you a trade-in estimate on it.',
    specs: [['Condition', 'Brand new'], ['Carrier', 'Unlocked'], ['Pricing', 'Confirmed at time of order'], ['Trade-in', 'Available on your old device']] }),
  P({ slug: 'new-samsung-galaxy-special-order', name: 'New Samsung Galaxy (Unlocked)', category: 'new-phones', brand: 'Samsung',
    images: ['prod-galaxy-s20'], short: 'Galaxy S, Z and A series phones, unlocked for any Canadian carrier.',
    description: 'From the Galaxy A series to the latest S and Z models, ask us about the Samsung phone you’re after. We’ll confirm current pricing and availability and can move your contacts, photos and apps across.',
    specs: [['Condition', 'Brand new'], ['Carrier', 'Unlocked'], ['Pricing', 'Confirmed at time of order'], ['Trade-in', 'Available on your old device']] }),
  P({ slug: 'pre-owned-iphone-13-pro', name: 'Pre-owned iPhone 13 Pro', category: 'pre-owned-phones', brand: 'Apple', condition: 'pre-owned', featured: true,
    images: ['prod-iphone-blue'], short: '6.1" Super Retina XDR ProMotion display, triple 12MP camera system.',
    description: 'A pre-owned iPhone 13 Pro, inspected and tested in store. Ask us about available storage sizes, colours, cosmetic grade and battery health.',
    specs: [['Display', '6.1" Super Retina XDR with ProMotion'], ['Chip', 'A15 Bionic'], ['Cameras', '12MP Main, Ultra Wide and Telephoto'], ['Condition', 'Pre-owned, inspected in store']] }),
  P({ slug: 'pre-owned-iphone-14-pro', name: 'Pre-owned iPhone 14 Pro', category: 'pre-owned-phones', brand: 'Apple', condition: 'pre-owned',
    images: ['prod-iphone-purple'], short: '6.1" Always-On display with Dynamic Island, 48MP Main camera.',
    description: 'A pre-owned iPhone 14 Pro, inspected and tested in store. Ask us about available storage sizes, colours, cosmetic grade and battery health.',
    specs: [['Display', '6.1" Super Retina XDR, Always-On'], ['Chip', 'A16 Bionic'], ['Cameras', '48MP Main, Ultra Wide and Telephoto'], ['Condition', 'Pre-owned, inspected in store']] }),
  P({ slug: 'pre-owned-iphone-12-pro', name: 'Pre-owned iPhone 12 Pro', category: 'pre-owned-phones', brand: 'Apple', condition: 'pre-owned',
    images: ['tradein-iphones'], short: '6.1" Super Retina XDR display, 5G, triple 12MP camera system.',
    description: 'A pre-owned iPhone 12 Pro — a great-value way into the Pro lineup. Inspected and tested in store; ask us about storage, colour, grade and battery health.',
    specs: [['Display', '6.1" Super Retina XDR'], ['Chip', 'A14 Bionic'], ['Connectivity', '5G'], ['Condition', 'Pre-owned, inspected in store']] }),
  P({ slug: 'pre-owned-samsung-galaxy-s21-plus', name: 'Pre-owned Samsung Galaxy S21+ 5G', category: 'pre-owned-phones', brand: 'Samsung', condition: 'pre-owned', featured: true,
    images: ['prod-galaxy-s21plus'], short: '6.7" Dynamic AMOLED 2X, 120Hz, triple camera, 5G.',
    description: 'A pre-owned Galaxy S21+ 5G, inspected and tested in store. Ask us about storage, colour, cosmetic grade and battery condition.',
    specs: [['Display', '6.7" Dynamic AMOLED 2X, 120Hz'], ['Connectivity', '5G'], ['Cameras', 'Triple rear camera'], ['Condition', 'Pre-owned, inspected in store']] }),
  P({ slug: 'protective-phone-case', name: 'Protective Phone Case', category: 'cases', brand: 'Assorted',
    images: ['prod-case'], short: 'Slim and rugged cases for current iPhone and Samsung Galaxy models.',
    description: 'Cases in slim, clear and rugged styles for popular iPhone and Galaxy models. Bring your phone in and we’ll help you find one that fits properly — including camera and button cut-outs.',
    specs: [['Fits', 'Popular iPhone and Samsung models'], ['Styles', 'Slim, clear and rugged'], ['Fitting', 'Checked on your phone in store']] }),
  P({ slug: 'tempered-glass-screen-protector', name: 'Tempered Glass Screen Protector', category: 'screen-protectors', brand: 'Assorted', featured: true,
    images: ['prod-screen-protector'], short: 'Edge-to-edge tempered glass for iPhone, Samsung and Pixel.',
    description: 'Tempered glass protectors that absorb impacts and scratches before your screen does. Ask us about privacy and full-coverage options for your model, and we can apply it for you bubble-free.',
    specs: [['Material', 'Tempered glass'], ['Fits', 'iPhone, Samsung Galaxy and Google Pixel'], ['Options', 'Clear and privacy']] }),
  P({ slug: 'usb-c-fast-wall-charger', name: 'USB-C Fast Wall Charger', category: 'chargers', brand: 'Assorted',
    images: ['prod-charger'], short: 'Compact USB-C Power Delivery charger for fast charging phones and tablets.',
    description: 'A compact USB-C wall charger that supports fast charging on iPhone, Samsung, Pixel and iPad. Ask us which wattage suits your device.',
    specs: [['Output', 'USB-C Power Delivery'], ['Compatible with', 'iPhone, Samsung, Pixel, iPad'], ['Plug', 'North American']] }),
  P({ slug: 'usb-c-charging-cable', name: 'Charging & Data Cables', category: 'cables', brand: 'Assorted',
    images: ['prod-cable'], short: 'USB-C to USB-C and USB-C to Lightning cables in multiple lengths.',
    description: 'Durable charging and data cables for current and older devices — USB-C to USB-C, USB-C to Lightning and more. Ask in store for available lengths.',
    specs: [['Connectors', 'USB-C, Lightning'], ['Use', 'Charging and data sync']] }),
  P({ slug: 'magsafe-compatible-wireless-charger', name: 'MagSafe-Compatible Wireless Charger', category: 'wireless', brand: 'Assorted',
    images: ['prod-magsafe'], short: 'Magnetic wireless charging pad for iPhone 12 and newer.',
    description: 'A magnetic wireless charger that snaps onto the back of iPhone 12 and newer models. Ask us about compatible cases and power adapters.',
    specs: [['Compatible with', 'iPhone 12 and newer, Qi devices'], ['Mount', 'Magnetic']] }),
  P({ slug: 'apple-airpods-pro', name: 'Apple AirPods Pro', category: 'wireless', brand: 'Apple',
    images: ['prod-airpods-pro'], short: 'Active Noise Cancellation, Transparency mode and MagSafe charging case.',
    description: 'Apple AirPods Pro with Active Noise Cancellation and Transparency mode. Ask in store about the current generation and pricing.',
    specs: [['Noise control', 'Active Noise Cancellation, Transparency'], ['Case', 'Wireless charging case'], ['Pairs with', 'iPhone, iPad, Mac']] }),
  P({ slug: 'wireless-earbuds', name: 'Wireless Earbuds', category: 'wireless', brand: 'Assorted',
    images: ['prod-earbuds'], short: 'True wireless Bluetooth earbuds with charging case.',
    description: 'Everyday Bluetooth earbuds that work with iPhone and Android. Ask us which options are in store today.',
    specs: [['Connectivity', 'Bluetooth'], ['Works with', 'iPhone and Android'], ['Case', 'Charging case included']] })
];

export const FAQS = [
  { q: 'Do I need to book an appointment?', a: 'Booking online reserves a time and lets us prepare the right part for your model, so your repair can start as soon as you arrive. If you’d rather drop by, call us at 905-535-9503 first so we can confirm parts are in stock.' },
  { q: 'How accurate are the prices on your website?', a: 'Every price is specific to your device model and repair type. The final price can vary slightly depending on part availability, part quality and the condition of your device, and we always confirm it with you before any work begins.' },
  { q: 'How long does a repair take?', a: 'Most screen, battery and charging port repairs take under an hour. Back glass, laptop and console repairs take longer. Our price calculator shows the estimated time for each repair; board-level and water damage repairs are timed after diagnosis.' },
  { q: 'Will I lose my photos and data?', a: 'Screen, battery and charging port repairs do not erase your data. We still recommend backing up to iCloud or Google before any repair, just in case.' },
  { q: 'Do you repair water-damaged phones?', a: 'Yes. Turn the phone off, don’t charge it, skip the rice, and bring it in as quickly as you can. We’ll clean and inspect the board and explain your options.' },
  { q: 'Do you buy used or broken phones?', a: 'Yes. Use our Sell / Trade-In tool for an instant estimate, then bring the device in. The final offer is confirmed after a physical inspection.' },
  { q: 'What kinds of devices do you repair?', a: 'iPhone, Samsung Galaxy, Google Pixel, iPad and Android tablets, Windows laptops, MacBooks, and PlayStation, Xbox and Nintendo Switch consoles.' },
  { q: 'Where is All Uplinks located?', a: 'We’re at 443 The Queensway South in Keswick, Ontario, serving Keswick, Georgina and the surrounding York Region communities.' }
];
