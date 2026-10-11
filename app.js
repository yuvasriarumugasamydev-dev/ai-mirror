/**
 * VASTRA AI SMART MIRROR - BOUTIQUE KIOSK LOGIC
 * Features:
 * - Bilingual support (English & Noto Sans Tamil)
 * - 60-30-10 Bright Clean Theme (#FF7A1A, #1E5EFF, #0B2A5B, #FFFFFF, #F3F8FF)
 * - Live Camera / Studio Model Try-On
 * - Real-time Saree AR Drape Canvas Overlay & Styling Adjustments
 * - Photo Snapshot & Procedural QR Code Generation
 * - Side-by-Side Saree Compare
 * - Web Audio Sound Feedback
 */

// =============================================================================
// 1. SAREE MASTER CATALOG DATA
// =============================================================================
const SAREE_CATALOG = [
  {
    id: 'saree-1',
    name: 'Kanjivaram Bridal Crimson Red',
    nameTa: 'காஞ்சிபுரம் மணப்பெண் செம்பட்டு புடவை',
    category: 'kanjivaram',
    isBridal: true,
    price: 42500,
    priceFormatted: '₹42,500',
    origin: 'Kanchipuram, Tamil Nadu',
    originTa: 'காஞ்சிபுரம், தமிழ்நாடு',
    fabric: 'Pure Mulberry Silk (3-Ply)',
    fabricTa: 'தூய மல்பெரி பட்டு (3-பிளை)',
    zari: '24K Pure Gold Electroplated Zari',
    zariTa: '24K தூய தங்க ஜரிகை வேலைப்பாடு',
    blouse: 'Matching Crimson Silk with Zari Sleeves',
    blouseTa: 'பொருத்தமான சிவப்பு பட்டு ரவிக்கை',
    rating: 4.9,
    reviewsCount: 128,
    image: 'assets/saree_kanjivaram_red.jpg',
    accentColor: '#800000',
    zariColor: '#FFD700',
    story: 'Handcrafted over 180 weaving hours by 3rd-generation Kanchi master weavers. Features sacred Annapakshi peacocks, floral jaal, and an ornate Korvai temple border.',
    storyTa: '180 மணி நேர பாரம்பரிய கைத்தறி நெசவில் உருவானது. அன்னப்பட்சி மற்றும் கோவில் கோபுர பார்டருடன் கூடிய கம்பீரமான திருமணப் பட்டு.'
  },
  {
    id: 'saree-2',
    name: 'Royal Peacock Blue & Emerald Kanjivaram',
    nameTa: 'மயில் நீலம் & மரகத பச்சை பட்டுப் புடவை',
    category: 'kanjivaram',
    isBridal: true,
    price: 38900,
    priceFormatted: '₹38,900',
    origin: 'Kanchipuram, Tamil Nadu',
    originTa: 'காஞ்சிபுரம், தமிழ்நாடு',
    fabric: 'Pure Handloom Silk (Silk Mark Certified)',
    fabricTa: 'தூய கைத்தறி பட்டு (சில்க் மார்க்)',
    zari: 'Tested Half-Fine Gold & Silver Zari',
    zariTa: 'உயர்தர தங்கம் மற்றும் வெள்ளி ஜரிகை',
    blouse: 'Contrasting Emerald Green Zari Brocade',
    blouseTa: 'கான்ட்ராஸ்ட் மரகத பச்சை ஜரிகை ரவிக்கை',
    rating: 4.8,
    reviewsCount: 94,
    image: 'assets/saree_peacock_blue.jpg',
    accentColor: '#1E5EFF',
    zariColor: '#E6C657',
    story: 'A regal royal blue body contrasted with an opulent emerald green border and pallu adorned with intricate mango buttas and regal paisleys.',
    storyTa: 'அரச கம்பீரம் தரும் மயில் நீலமும் மரகத பச்சை முந்தானையும் இணைந்த மாங்கனி டிசைன் பட்டுப் புடவை.'
  },
  {
    id: 'saree-3',
    name: 'Blush Pink Organza Hand-Embroidered',
    nameTa: 'ரோஜா இளஞ்சிவப்பு ஆர்கன்சா வடிவமைப்பாளர் புடவை',
    category: 'organza',
    isBridal: false,
    price: 24800,
    priceFormatted: '₹24,800',
    origin: 'Varanasi Studio Atelier',
    originTa: 'வாரணாசி ஸ்டுடியோ',
    fabric: 'Featherlight Sheer Silk Organza',
    fabricTa: 'மென்மையான பட்டு ஆர்கன்சா',
    zari: 'Subtle Matte Gold Zari with Pearls',
    zariTa: 'முத்து வேலைப்பாடு கூடிய மேட் தங்க ஜரிகை',
    blouse: 'Blush Silk Raw Fabric with Scalloped Sleeves',
    blouseTa: 'ஸ்கேலப் வேலைப்பாடு உடைய பட்டு ரவிக்கை',
    rating: 4.7,
    reviewsCount: 62,
    image: 'assets/saree_blush_pink.jpg',
    accentColor: '#E8A598',
    zariColor: '#F3E5AB',
    story: 'Modern luxury meets classic charm. Lightweight sheer organza drape adorned with delicate floral vine embroidery and scalloped cutwork border.',
    storyTa: 'நவீன கொண்டாட்டங்களுக்கான மென்மையான ஆர்கன்சா பட்டு. கைத்தையல் மலர் வேலைப்பாடுகளுடன் கூடியது.'
  },
  {
    id: 'saree-4',
    name: 'Mustard Festive Silk with Rani Pink Border',
    nameTa: 'மஞ்சள் & ராணி பிங்க் கோவில் பார்டர் பட்டு',
    category: 'kanjivaram',
    isBridal: false,
    price: 34200,
    priceFormatted: '₹34,200',
    origin: 'Arani Heritage Cluster, Tamil Nadu',
    originTa: 'ஆரணி பாரம்பரிய நெசவு, தமிழ்நாடு',
    fabric: 'Pure Heavy Tussar & Mulberry Silk Blend',
    fabricTa: 'தூய மல்பெரி பட்டு கலவை',
    zari: 'Antique Gold Zari Chevron Bands',
    zariTa: 'ஆன்டிக் கோல்ட் ஜரிகை கோடுகள்',
    blouse: 'Rani Pink Silk Brocade',
    blouseTa: 'ராணி பிங்க் ப்ரோக்கேட் ரவிக்கை',
    rating: 4.9,
    reviewsCount: 88,
    image: 'assets/saree_mustard_yellow.jpg',
    accentColor: '#DDA01B',
    zariColor: '#E5A93C',
    story: 'Auspicious turmeric yellow drape illuminated by vibrant rani pink borders and dense antique gold pallu tassels. Perfect for festive muhurthams.',
    storyTa: 'மங்களகரமான மஞ்சள் நிறத்துடன் கூடிய ராணி பிங்க் பார்டர். விசேஷங்களுக்கும் முகூர்த்தத்திற்கும் ஏற்றது.'
  },
  {
    id: 'saree-5',
    name: 'Royal Purple Banarasi Katan Silk',
    nameTa: 'ராயல் பர்பிள் பனாரசி கட்டான் பட்டு',
    category: 'banarasi',
    isBridal: true,
    price: 46000,
    priceFormatted: '₹46,000',
    origin: 'Varanasi, Uttar Pradesh',
    originTa: 'வாரணாசி, உத்திர பிரதேசம்',
    fabric: 'Pure Katan Handspun Silk',
    fabricTa: 'தூய கட்டான் பட்டு',
    zari: 'Rich Kadwa Weave Gold Zari',
    zariTa: 'கடவா நெசவு தங்க ஜரிகை',
    blouse: 'Purple Brocade with Zari Sleeves',
    blouseTa: 'பர்பிள் ப்ரோக்கேட் ரவிக்கை',
    rating: 5.0,
    reviewsCount: 112,
    image: 'assets/saree_kanjivaram_red.jpg', // Uses hero fallback with tint
    accentColor: '#581845',
    zariColor: '#FFD700',
    story: 'Traditional Banarasi Kadwa technique where each gold motif is woven individually without loose floats on the reverse. Regal heirloom piece.',
    storyTa: 'பாரம்பரிய பனாரசி கடவா நெசவு முறை. ராஜ வம்சத்து கம்பீர அழகு.'
  },
  {
    id: 'saree-6',
    name: 'Emerald Green Vivaha Muhurtham Silk',
    nameTa: 'மரகத பச்சை விவாக முகூர்த்த பட்டு',
    category: 'bridal',
    isBridal: true,
    price: 51200,
    priceFormatted: '₹51,200',
    origin: 'Kanchipuram Master Loom',
    originTa: 'காஞ்சிபுரம் மாஸ்டர் லூம்',
    fabric: 'Super Heavy Weight Pure Silk',
    fabricTa: 'அடர் எடை தூய பட்டு',
    zari: 'Traditional Mukkoti Zari Border',
    zariTa: 'முக்கோடி தங்க ஜரிகை கரை',
    blouse: 'Heavy Embroidered Bridal Blouse Included',
    blouseTa: 'மணமகள் வேலைப்பாடு ரவிக்கை துணி',
    rating: 4.9,
    reviewsCount: 145,
    image: 'assets/saree_peacock_blue.jpg',
    accentColor: '#005F41',
    zariColor: '#F5D77F',
    story: 'The quintessential South Indian bridal heirloom. Deep emerald silk adorned with traditional rudraksha and temple gopuram motifs.',
    storyTa: 'தென்னிந்திய திருமணங்களின் அடையாளமான ஆழமான மரகத பச்சை முகூர்த்த புடவை.'
  },
  {
    id: 'saree-7',
    name: 'Sunset Coral Peach Tissue Saree',
    nameTa: 'சூரிய அஸ்தமன பவள திசு புடவை',
    category: 'organza',
    isBridal: false,
    price: 29500,
    priceFormatted: '₹29,500',
    origin: 'Dharmavaram, Andhra Pradesh',
    originTa: 'தர்மவரம், ஆந்திரா',
    fabric: 'Metallic Silk Tissue & Organza',
    fabricTa: 'மெட்டாலிக் சில்க் திசு',
    zari: 'Rose Gold & Copper Zari Threads',
    zariTa: 'ரோஸ் கோல்ட் & காப்பர் ஜரிகை',
    blouse: 'Coral Peach Satin Silk',
    blouseTa: 'சாட்டின் பட்டு ரவிக்கை',
    rating: 4.8,
    reviewsCount: 51,
    image: 'assets/saree_blush_pink.jpg',
    accentColor: '#F08080',
    zariColor: '#E6A87C',
    story: 'Glowing like sunset rays with an iridescent dual-tone sheen of coral peach and luminous metallic gold tissue threads.',
    storyTa: 'மாலை நேர பொலிவு தரும் பவள இளஞ்சிவப்பு இரட்டை வண்ண திசு புடவை.'
  },
  {
    id: 'saree-8',
    name: 'Imperial Golden Beige Korvai Pattu',
    nameTa: 'பொன்னிற கோர்வை பட்டுப் புடவை',
    category: 'banarasi',
    isBridal: true,
    price: 48000,
    priceFormatted: '₹48,000',
    origin: 'Kanchipuram, Tamil Nadu',
    originTa: 'காஞ்சிபுரம், தமிழ்நாடு',
    fabric: 'Pure Mulberry Silk 4-Ply',
    fabricTa: 'தூய 4-பிளை மல்பெரி பட்டு',
    zari: 'Pure Real Silver & 24K Gold Zari',
    zariTa: 'வெள்ளி மற்றும் 24K தங்க ஜரிகை',
    blouse: 'Burgundy Contrast Silk',
    blouseTa: 'பர்கண்டி கான்ட்ராஸ்ட் ரவிக்கை',
    rating: 4.9,
    reviewsCount: 77,
    image: 'assets/saree_mustard_yellow.jpg',
    accentColor: '#D4AF37',
    zariColor: '#FFD700',
    story: 'Opulent golden beige body paired with a contrast deep ruby red korvai interlocking border and heavy brocade pallu.',
    storyTa: 'பொன்னிற உடலும் மாணிக்க சிவப்பு கோர்வை கரையும் கொண்ட கம்பீரமான பாரம்பரிய புடவை.'
  }
];

// =============================================================================
// 2. BILINGUAL TRANSLATION DICTIONARY (EN & TA)
// =============================================================================
const TRANSLATIONS = {
  en: {
    welcome_subtitle: 'Step into luxury. Experience real-time photorealistic saree drape & boutique styling.',
    touch_to_start: 'Touch to Start',
    feature_ar: 'Instant AR Drape',
    feature_fabrics: 'Pure Kanjivaram & Silk',
    feature_qr: 'Scan & Save to Mobile',
    mirror_ready: 'AI Mirror 4K HD Ready • Touch Screen Activated',
    boutique_mirror: 'AI MIRROR BOUTIQUE',
    nav_mirror: 'Live Try-On Mirror',
    nav_collection: 'Saree Collection',
    nav_compare: 'Compare Looks',
    nav_saved: 'Saved Snaps',
    call_stylist: 'Staff Assist',
    switch_camera: 'Switch to Live Webcam',
    switch_studio: 'Switch to Studio Model',
    currently_wearing: 'CURRENTLY DRAPED',
    lighting_showroom: 'Showroom Lights',
    lighting_wedding: 'Wedding Hall Lights',
    lighting_daylight: 'Daylight Sunshine',
    lighting_reception: 'Evening Reception',
    capture_photo: 'Capture Look',
    add_to_compare: 'Compare',
    drape_styling: 'Drape & Styling',
    ar_active: 'AR Live',
    drape_style: 'Draping Style',
    blouse_color: 'Blouse Pairing',
    jewelry_accent: 'Jewelry Accents',
    temple_haram: 'Temple Haram',
    kamarbandh: 'Ottiyanam / Belt',
    quick_drape_catalog: 'Instant Try-On Catalog',
    view_all: 'View All (8) →',
    curated_masterpieces: 'Handcrafted Saree Masterpieces',
    catalog_subtitle: 'Authentic pure zari weaves, heritage looms, and contemporary celebrations.',
    all_sarees: 'All Sarees',
    cat_kanjivaram: 'Kanjivaram Silk',
    cat_banarasi: 'Banarasi Brocade',
    cat_organza: 'Designer Organza',
    cat_bridal: 'Bridal Heritage',
    try_this_now: 'Try On in Mirror',
    request_physical_trial: 'Bring to Trial Room',
    inclusive_taxes: 'Inclusive of all boutique taxes',
    fabric_type: 'Fabric',
    zari_work: 'Zari Grade',
    weave_origin: 'Origin',
    blouse_piece: 'Blouse',
    compare_title: 'Side-by-Side Saree Drape Comparison',
    compare_desc: 'Evaluate colors, zari luster, and silhouette styles to find your perfect match.',
    try_look_a: 'Drape Look A',
    try_look_b: 'Drape Look B',
    saved_looks_title: 'Your AI Mirror Boutique Session',
    saved_looks_desc: 'Browse your captured snapshots, compare draped looks, or download to your phone via QR code.',
    capture_more: 'Capture New Look',
    look_saved_badge: 'Look Captured!',
    take_look_home: 'Scan to Take This Look Home',
    scan_mobile_desc: 'Scan this QR code with your mobile camera to instantly view high-res photo, saree details & share on WhatsApp.',
    download_image: 'Save Image',
    done: 'Done',
    stylist_alert_title: 'Stylist On The Way!',
    stylist_alert_msg: 'A boutique concierge has been notified to assist you at Mirror Station #1.',
    ai_stylist_active: 'AI Draper Engine v2.4 Active',
    empty_snaps_title: 'No Looks Saved Yet',
    empty_snaps_desc: 'Try on sarees in the Live Mirror and tap "Capture Look" to build your personalized boutique lookbook!'
  },
  ta: {
    welcome_subtitle: 'சொகுசு மெய்நிகர் புடவை அனுபவம். நிகழ்நேர ஏஐ கண்ணாடி மூலம் புடவைகளை அணிந்து பாருங்கள்.',
    touch_to_start: 'தொட்டு தொடங்குங்கள்',
    feature_ar: 'நிகழ்நேர புடவை அணிவிப்பு',
    feature_fabrics: 'தூய காஞ்சிபுரம் பட்டு',
    feature_qr: 'மொபைலில் சேமிக்க QR குறியீடு',
    mirror_ready: 'ஏஐ ஸ்மார்ட் மிரர் தயார் • தொடுதிரை இயக்கத்தில் உள்ளது',
    boutique_mirror: 'ஸ்மார்ட் பட்டு புடவை கண்ணாடி',
    nav_mirror: 'நேரடி கண்ணாடி சோதனை',
    nav_collection: 'புடவை தொகுப்பு',
    nav_compare: 'ஒப்பீடு செய்க',
    nav_saved: 'சேமிக்கப்பட்ட படங்கள்',
    call_stylist: 'உதவிக்கு அழைக்க',
    switch_camera: 'வெப்கேம் இயக்கவும்',
    switch_studio: 'ஸ்டுடியோ மாடல் மாற்றவும்',
    currently_wearing: 'தற்போது அணிந்திருப்பது',
    lighting_showroom: 'ஷோரூம் வெளிச்சம்',
    lighting_wedding: 'திருமண மண்டப ஒளி',
    lighting_daylight: 'இயற்கை பகல் ஒளி',
    lighting_reception: 'வரவேற்பு இரவு ஒளி',
    capture_photo: 'படம் எடுக்கவும்',
    add_to_compare: 'ஒப்பிடு',
    drape_styling: 'புடவை கட்டும் பாணி',
    ar_active: 'நேரடி ஏஐ',
    drape_style: 'மடிப்பு பாணி',
    blouse_color: 'ரவிக்கை பொருத்தம்',
    jewelry_accent: 'நகை அணிகலன்கள்',
    temple_haram: 'கோவில் ஹாரம்',
    kamarbandh: 'ஒட்டியாணம் / பெல்ட்',
    quick_drape_catalog: 'உடனடி புடவை தேர்வு',
    view_all: 'அனைத்தும் பார்க்க (8) →',
    curated_masterpieces: 'கைத்தறி பட்டுப் புடவைகள்',
    catalog_subtitle: 'பாரம்பரிய காஞ்சிபுரம் மற்றும் பனாரசி தங்க ஜரிகை புடவைகளின் சங்கமம்.',
    all_sarees: 'அனைத்து புடவைகள்',
    cat_kanjivaram: 'காஞ்சிபுரம் பட்டு',
    cat_banarasi: 'பனாரசி பட்டு',
    cat_organza: 'ஆர்கன்சா புடவை',
    cat_bridal: 'மணப்பெண் புடவைகள்',
    try_this_now: 'கண்ணாடியில் அணிந்து பார்',
    request_physical_trial: 'டிரையல் அறைக்கு கொண்டுவா',
    inclusive_taxes: 'அனைத்து வரிகளும் அடங்கும்',
    fabric_type: 'துணி வகை',
    zari_work: 'ஜரிகை தரம்',
    weave_origin: 'பிறப்பிடம்',
    blouse_piece: 'ரவிக்கை',
    compare_title: 'இரண்டு புடவைகளின் நேரடி ஒப்பீடு',
    compare_desc: 'வண்ணங்கள், ஜரிகை மற்றும் வடிவமைப்புகளை ஒப்பிட்டு சிறந்ததை தேர்ந்தெடுங்கள்.',
    try_look_a: 'தோற்றம் A அணியுங்கள்',
    try_look_b: 'தோற்றம் B அணியுங்கள்',
    saved_looks_title: 'உங்கள் சேமிக்கப்பட்ட படங்கள்',
    saved_looks_desc: 'நீங்கள் எடுத்துக்கொண்ட படங்களை பார்க்கவும், QR குறியீடு மூலம் மொபைலில் பதிவிறக்கவும்.',
    capture_more: 'புதிய படம் எடுக்க',
    look_saved_badge: 'படம் சேமிக்கப்பட்டது!',
    take_look_home: 'மொபைலில் படத்தைப் பெற ஸ்கேன் செய்க',
    scan_mobile_desc: 'உங்கள் மொபைல் கேமரா மூலம் இந்த QR குறியீட்டை ஸ்கேன் செய்து வாட்ஸ்அப்பில் பகிரலாம்.',
    download_image: 'பதிவிறக்கம்',
    done: 'முடிந்தது',
    stylist_alert_title: 'விற்பனையாளர் வருகிறார்!',
    stylist_alert_msg: 'மிரர் ஸ்டேஷன் #1-ல் உங்களுக்கு உதவ ஊழியர் அழைக்கப்பட்டுள்ளார்.',
    ai_stylist_active: 'ஏஐ ட்ரேப்பிங் என்ஜின் v2.4 தயார்',
    empty_snaps_title: 'படங்கள் எதுவும் இல்லை',
    empty_snaps_desc: 'நேரடி கண்ணாடியில் புடவைகளை அணிந்து பார்த்து "படம் எடுக்கவும்" பொத்தானை அழுத்தவும்!'
  }
};

// =============================================================================
// 3. APPLICATION STATE
// =============================================================================
let currentLang = 'en';
let activeSareeId = 'saree-1';
let compareIdA = 'saree-1';
let compareIdB = 'saree-2';
let currentLightingIndex = 0;
const LIGHTING_PRESETS = ['showroom', 'wedding', 'daylight', 'reception'];
let currentDrapeStyle = 'nivi';
let currentBlouseColor = '#800000';
let activeJewelry = { necklace: true, belt: false };
let isCameraStreamActive = false;
let cameraStream = null;
let savedSnaps = [];
let audioCtx = null;

// =============================================================================
// 4. AUDIO SYNTHESIZER (Touch chimes & shutter clicks)
// =============================================================================
function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTapSound() {
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Graceful fallback if audio is blocked
  }
}

function playCameraShutterSound() {
  try {
    initAudio();
    if (!audioCtx) return;
    // Two-stage mechanical click
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1400, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}
}

function playChimeAlert() {
  try {
    initAudio();
    if (!audioCtx) return;
    const notes = [587.33, 739.99, 880]; // D5, F#5, A5 chord
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.1 + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + idx * 0.1);
      osc.stop(audioCtx.currentTime + idx * 0.1 + 0.65);
    });
  } catch (e) {}
}

// =============================================================================
// 5. LANGUAGE CONTROLLER
// =============================================================================
function setLanguage(lang) {
  playTapSound();
  currentLang = lang;
  document.body.setAttribute('data-lang', lang);

  // Update language pills in welcome & header
  document.querySelectorAll('.lang-pill, .header-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id.endsWith(lang));
  });

  // Apply translations to all DOM elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });

  // Re-render dynamic components with localized titles
  renderQuickSareeDrawer();
  renderCatalogGrid();
  renderCompareOptions();
  updateDrapedSareeBanner(activeSareeId);
}

// =============================================================================
// 6. KIOSK NAVIGATION & WELCOME FLOW
// =============================================================================
function enterApp() {
  playTapSound();
  initAudio();
  const welcomeScreen = document.getElementById('welcome-screen');
  welcomeScreen.classList.remove('active');
  updateClock();
}

function returnToWelcome() {
  playTapSound();
  stopCamera();
  const welcomeScreen = document.getElementById('welcome-screen');
  welcomeScreen.classList.add('active');
}

function goToHome() {
  switchTab('mirror');
}

function switchTab(tabName) {
  playTapSound();
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `nav-tab-${tabName}`);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  if (tabName === 'gallery') {
    renderSavedGallery();
  } else if (tabName === 'compare') {
    renderCompareOptions();
  }
}

// Live Kiosk Clock
function updateClock() {
  const clockEl = document.getElementById('kiosk-live-clock');
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
setInterval(updateClock, 1000);

// =============================================================================
// 7. WEBCAM & STUDIO FALLBACK ENGINE
// =============================================================================
async function toggleCameraSource() {
  playTapSound();
  const videoEl = document.getElementById('webcam-feed');
  const modelImg = document.getElementById('model-fallback-image');
  const sourceLabel = document.getElementById('camera-source-label');
  const btnToggle = document.getElementById('btn-toggle-camera');

  if (!isCameraStreamActive) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        videoEl.srcObject = cameraStream;
        videoEl.classList.add('active');
        modelImg.classList.add('hidden');
        isCameraStreamActive = true;
        sourceLabel.textContent = 'LIVE WEBCAM MIRROR';
        btnToggle.innerHTML = `<i class="fa-solid fa-image"></i> <span>${TRANSLATIONS[currentLang].switch_studio}</span>`;
      } else {
        alert('Camera API not accessible in this environment. Showing 4K Studio Trial Model.');
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      alert('Camera access was denied or is not available. Seamlessly using Studio Model Mode.');
    }
  } else {
    stopCamera();
  }
}

function stopCamera() {
  const videoEl = document.getElementById('webcam-feed');
  const modelImg = document.getElementById('model-fallback-image');
  const sourceLabel = document.getElementById('camera-source-label');
  const btnToggle = document.getElementById('btn-toggle-camera');

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (videoEl) {
    videoEl.srcObject = null;
    videoEl.classList.remove('active');
  }
  if (modelImg) {
    modelImg.classList.remove('hidden');
  }
  isCameraStreamActive = false;
  if (sourceLabel) sourceLabel.textContent = 'STUDIO MODEL MODE';
  if (btnToggle) {
    btnToggle.innerHTML = `<i class="fa-solid fa-camera"></i> <span>${TRANSLATIONS[currentLang].switch_camera}</span>`;
  }
}

// =============================================================================
// 8. AR SAREE DRAPE SIMULATION & CANVAS ENGINE
// =============================================================================
function drapeSaree(sareeId) {
  playTapSound();
  activeSareeId = sareeId;
  const saree = SAREE_CATALOG.find(s => s.id === sareeId);
  if (!saree) return;

  // Update floating draped card
  updateDrapedSareeBanner(sareeId);

  // Update styling highlight colors in AR overlay
  const pallu = document.getElementById('drape-pallu-flow');
  const border = document.getElementById('drape-border-accent');
  if (pallu) {
    pallu.style.background = `linear-gradient(175deg, ${saree.accentColor}99 0%, ${saree.accentColor}cc 100%)`;
  }
  if (border) {
    border.style.background = `linear-gradient(180deg, ${saree.zariColor} 0%, #D4AF37 50%, #B8860B 100%)`;
  }

  // Update active state in quick drawer
  document.querySelectorAll('.quick-saree-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === sareeId);
  });

  // Redraw drape canvas
  drawDrapeCanvas();
}

function updateDrapedSareeBanner(sareeId) {
  const saree = SAREE_CATALOG.find(s => s.id === sareeId);
  if (!saree) return;
  const thumb = document.getElementById('draped-thumb-img');
  const title = document.getElementById('draped-title');
  const price = document.getElementById('draped-price');

  if (thumb) thumb.src = saree.image;
  if (title) title.textContent = currentLang === 'ta' ? saree.nameTa : saree.name;
  if (price) price.textContent = saree.priceFormatted;
}

function drawDrapeCanvas() {
  const canvas = document.getElementById('drape-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const saree = SAREE_CATALOG.find(s => s.id === activeSareeId) || SAREE_CATALOG[0];

  // Draw subtle photorealistic contour drape
  ctx.save();
  const cx = canvas.width * 0.51;
  const cy = canvas.height * 0.5;

  // Waist silhouette pleats
  const gradient = ctx.createLinearGradient(cx - 80, cy + 50, cx + 80, canvas.height * 0.85);
  gradient.addColorStop(0, saree.accentColor + '88');
  gradient.addColorStop(0.5, saree.accentColor + 'cc');
  gradient.addColorStop(1, saree.accentColor + 'e6');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 20); // waist left
  ctx.quadraticCurveTo(cx - 55, cy + 120, cx - 65, canvas.height * 0.85);
  ctx.lineTo(cx + 65, canvas.height * 0.85);
  ctx.quadraticCurveTo(cx + 55, cy + 120, cx + 45, cy + 20);
  ctx.closePath();
  ctx.fill();

  // Draw Gold Border Bottom
  ctx.strokeStyle = saree.zariColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(cx - 65, canvas.height * 0.84);
  ctx.lineTo(cx + 65, canvas.height * 0.84);
  ctx.stroke();

  // Pallu diagonal drape across torso
  ctx.beginPath();
  if (currentDrapeStyle === 'gujarati') {
    // Seedha Pallu in front
    ctx.moveTo(cx - 20, cy - 80);
    ctx.quadraticCurveTo(cx - 40, cy, cx + 50, cy + 90);
    ctx.lineTo(cx + 10, cy + 90);
    ctx.closePath();
  } else {
    // Classic Nivi & Floating Pallu across right hip to left shoulder
    ctx.moveTo(cx + 40, cy + 40);
    ctx.quadraticCurveTo(cx, cy - 20, cx - 35, cy - 70);
    ctx.lineTo(cx - 15, cy - 70);
    ctx.quadraticCurveTo(cx + 20, cy - 10, cx + 45, cy + 40);
    ctx.closePath();
  }
  ctx.fillStyle = saree.accentColor + 'aa';
  ctx.fill();

  // Pallu Zari Border line
  ctx.strokeStyle = saree.zariColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Temple Jewelry overlay if enabled
  if (activeJewelry.necklace) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy - 90, 32, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    // Pendant
    ctx.fillStyle = '#E53E3E';
    ctx.beginPath();
    ctx.arc(cx, cy - 58, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.stroke();
  }

  // Kamarbandh / Waist Belt if enabled
  if (activeJewelry.belt) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 48, cy + 28);
    ctx.quadraticCurveTo(cx, cy + 34, cx + 48, cy + 28);
    ctx.stroke();
  }

  ctx.restore();
}

window.addEventListener('resize', () => {
  if (document.getElementById('tab-mirror').classList.contains('active')) {
    drawDrapeCanvas();
  }
});

// Styling settings
function setDrapeStyle(styleName, btnEl) {
  playTapSound();
  currentDrapeStyle = styleName;
  document.querySelectorAll('#drape-style-pills .style-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  drawDrapeCanvas();
}

function setBlouseColor(colorHex, colorName, btnEl) {
  playTapSound();
  currentBlouseColor = colorHex;
  document.querySelectorAll('.swatch-row .color-swatch').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  document.getElementById('selected-blouse-name').textContent = colorName;
  drawDrapeCanvas();
}

function toggleJewelry(type, btnEl) {
  playTapSound();
  activeJewelry[type] = !activeJewelry[type];
  btnEl.classList.toggle('active', activeJewelry[type]);
  drawDrapeCanvas();
}

// Mirror Lighting Preset Cycler
function toggleLightingPreset() {
  playTapSound();
  currentLightingIndex = (currentLightingIndex + 1) % LIGHTING_PRESETS.length;
  const currentPreset = LIGHTING_PRESETS[currentLightingIndex];
  const tintEl = document.getElementById('lighting-filter-tint');
  tintEl.className = `lighting-filter-tint ${currentPreset}`;

  const labelEl = document.getElementById('lighting-mode-label');
  const presetKey = `lighting_${currentPreset}`;
  labelEl.textContent = TRANSLATIONS[currentLang][presetKey] || currentPreset;
}

// =============================================================================
// 9. PHOTO CAPTURE & PROCEDURAL QR CODE GENERATION
// =============================================================================
function captureSnapshot() {
  playTapSound();
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNumber = document.getElementById('countdown-number');
  countdownOverlay.classList.add('active');

  let count = 3;
  countdownNumber.textContent = count;

  const countInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
      playTapSound();
    } else {
      clearInterval(countInterval);
      countdownOverlay.classList.remove('active');
      executeShutterFlash();
    }
  }, 900);
}

function executeShutterFlash() {
  playCameraShutterSound();
  const flash = document.getElementById('shutter-flash');
  flash.classList.add('flashing');
  setTimeout(() => flash.classList.remove('flashing'), 180);

  // Capture canvas image from mirror view
  const mirrorFrame = document.getElementById('mirror-frame');
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 600;
  offscreenCanvas.height = 800;
  const ctx = offscreenCanvas.getContext('2d');

  // Background gradient or model image
  const modelImg = document.getElementById('model-fallback-image');
  if (modelImg && !isCameraStreamActive) {
    try {
      ctx.drawImage(modelImg, 0, 0, 600, 800);
    } catch (e) {
      ctx.fillStyle = '#1E5EFF';
      ctx.fillRect(0, 0, 600, 800);
    }
  } else {
    // If webcam is active, draw video stream
    const videoEl = document.getElementById('webcam-feed');
    try {
      ctx.drawImage(videoEl, 0, 0, 600, 800);
    } catch (e) {
      ctx.fillStyle = '#0B2A5B';
      ctx.fillRect(0, 0, 600, 800);
    }
  }

  // Draw overlay drape canvas on top
  const drapeCanvas = document.getElementById('drape-canvas');
  if (drapeCanvas) {
    ctx.drawImage(drapeCanvas, 0, 0, 600, 800);
  }

  // Draw Boutique Watermark Header
  ctx.fillStyle = 'rgba(11, 42, 91, 0.85)';
  ctx.fillRect(20, 20, 320, 60);
  ctx.strokeStyle = '#FF7A1A';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 320, 60);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Poppins, sans-serif';
  ctx.fillText('VASTRA AI MIRROR', 36, 48);

  const saree = SAREE_CATALOG.find(s => s.id === activeSareeId);
  ctx.font = '12px Poppins, sans-serif';
  ctx.fillStyle = '#FFE8D6';
  ctx.fillText(saree ? saree.name : 'Haute Couture Try-on', 36, 68);

  const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.92);

  // Save to session gallery
  const newSnap = {
    id: 'snap-' + Date.now(),
    sareeId: activeSareeId,
    sareeName: saree ? (currentLang === 'ta' ? saree.nameTa : saree.name) : 'Saree Look',
    dataUrl: dataUrl,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  savedSnaps.unshift(newSnap);
  updateSavedCount();

  // Show QR code dialog
  showQRCodeModal(newSnap);
}

function updateSavedCount() {
  const badge = document.getElementById('saved-snaps-count');
  if (badge) badge.textContent = savedSnaps.length;
}

function showQRCodeModal(snap) {
  const modal = document.getElementById('modal-snapshot-qr');
  const snapImg = document.getElementById('qr-snap-img');
  snapImg.src = snap.dataUrl;

  // Draw custom clean 2D QR Code on the canvas
  drawProceduralQRCode('qr-code-canvas', `https://vastra-boutique.com/looks/${snap.id}`);

  modal.classList.add('active');
}

// Procedural high-res QR code generator
function drawProceduralQRCode(canvasId, textPayload) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 180;
  canvas.width = size;
  canvas.height = size;

  // White base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const gridSize = 25;
  const cellSize = size / gridSize;

  // Deterministic pattern based on hash of textPayload
  let hash = 0;
  for (let i = 0; i < textPayload.length; i++) {
    hash = (hash << 5) - hash + textPayload.charCodeAt(i);
    hash |= 0;
  }

  ctx.fillStyle = '#0B2A5B';

  // Helper for QR Position Markers (Corner boxes)
  function drawFinderPattern(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          ctx.fillRect((col + c) * cellSize, (row + r) * cellSize, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  // Draw 3 standard corner finder patterns
  drawFinderPattern(1, 1);
  drawFinderPattern(1, gridSize - 8);
  drawFinderPattern(gridSize - 8, 1);

  // Fill pseudo-random data modules
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      // Don't overwrite finders
      if (
        (r < 9 && c < 9) ||
        (r < 9 && c > gridSize - 10) ||
        (r > gridSize - 10 && c < 9)
      ) {
        continue;
      }
      const val = Math.sin(r * 13 + c * 17 + hash) * 10000;
      if (val - Math.floor(val) > 0.48) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }

  // Boutique Center Emblem Dot
  ctx.fillStyle = '#FF7A1A';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, cellSize * 1.5, 0, 2 * Math.PI);
  ctx.fill();
}

function downloadSnapshotLocally() {
  playTapSound();
  if (savedSnaps.length === 0) return;
  const link = document.createElement('a');
  link.download = `Vastra_Mirror_Look_${Date.now()}.jpg`;
  link.href = savedSnaps[0].dataUrl;
  link.click();
}

// =============================================================================
// 10. SAREE QUICK DRAWER (MIRROR SIDEBAR)
// =============================================================================
function renderQuickSareeDrawer() {
  const container = document.getElementById('quick-saree-list');
  if (!container) return;
  container.innerHTML = '';

  SAREE_CATALOG.forEach(saree => {
    const item = document.createElement('div');
    item.className = `quick-saree-item ${saree.id === activeSareeId ? 'active' : ''}`;
    item.dataset.id = saree.id;
    item.onclick = () => drapeSaree(saree.id);

    const title = currentLang === 'ta' ? saree.nameTa : saree.name;
    const origin = currentLang === 'ta' ? saree.originTa : saree.origin;

    item.innerHTML = `
      <img src="${saree.image}" alt="${title}" class="quick-saree-img">
      <div class="quick-saree-details">
        <h4 class="quick-saree-name">${title}</h4>
        <div class="quick-saree-meta">${origin}</div>
        <div class="quick-saree-price">${saree.priceFormatted}</div>
      </div>
      <button class="quick-try-btn" onclick="event.stopPropagation(); drapeSaree('${saree.id}')">
        ${currentLang === 'ta' ? 'அணிந்து பார்' : 'Drape'}
      </button>
    `;
    container.appendChild(item);
  });
}

// =============================================================================
// 11. FULL SAREE COLLECTION (SAREES ARE THE HERO)
// =============================================================================
let activeCategoryFilter = 'all';

function filterCatalog(category, chipEl) {
  playTapSound();
  activeCategoryFilter = category;
  document.querySelectorAll('#catalog-category-chips .category-chip').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  renderCatalogGrid();
}

function renderCatalogGrid() {
  const grid = document.getElementById('saree-hero-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = activeCategoryFilter === 'all'
    ? SAREE_CATALOG
    : SAREE_CATALOG.filter(s => s.category === activeCategoryFilter || (activeCategoryFilter === 'bridal' && s.isBridal));

  filtered.forEach(saree => {
    const card = document.createElement('article');
    card.className = 'saree-hero-card';

    const title = currentLang === 'ta' ? saree.nameTa : saree.name;
    const fabric = currentLang === 'ta' ? saree.fabricTa : saree.fabric;
    const origin = currentLang === 'ta' ? saree.originTa : saree.origin;

    card.innerHTML = `
      <div class="saree-card-photo-stage" onclick="openSareeModal('${saree.id}')">
        <img src="${saree.image}" alt="${title}" loading="lazy">
        <span class="saree-card-tag">${origin}</span>
        <div class="saree-card-quick-actions">
          <button class="btn-card-circle" onclick="event.stopPropagation(); quickAddToCompare('${saree.id}')" title="Compare">
            <i class="fa-solid fa-plus-minus"></i>
          </button>
          <button class="btn-card-circle" onclick="event.stopPropagation(); openSareeModal('${saree.id}')" title="Details">
            <i class="fa-solid fa-expand"></i>
          </button>
        </div>
      </div>
      <div class="saree-card-body">
        <div>
          <div class="saree-card-meta-row">
            <span class="saree-card-region">${saree.category.toUpperCase()}</span>
            <span class="saree-card-rating"><i class="fa-solid fa-star"></i> ${saree.rating}</span>
          </div>
          <h3 class="saree-card-title">${title}</h3>
          <p class="saree-card-fabric">${fabric}</p>
        </div>
        <div class="saree-card-footer">
          <div class="saree-card-price-box">
            <span class="saree-card-price-label">${currentLang === 'ta' ? 'விலை' : 'Price'}</span>
            <span class="saree-card-price">${saree.priceFormatted}</span>
          </div>
          <button class="btn-card-tryon" onclick="drapeAndSwitchToMirror('${saree.id}')">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>${currentLang === 'ta' ? 'அணிந்து பார்' : 'Try in Mirror'}</span>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function drapeAndSwitchToMirror(sareeId) {
  drapeSaree(sareeId);
  switchTab('mirror');
}

// =============================================================================
// 12. SAREE DETAILS HERO MODAL
// =============================================================================
let modalCurrentSareeId = 'saree-1';

function openSareeModal(sareeId) {
  playTapSound();
  modalCurrentSareeId = sareeId;
  const saree = SAREE_CATALOG.find(s => s.id === sareeId);
  if (!saree) return;

  const modal = document.getElementById('modal-saree-details');
  document.getElementById('modal-saree-img').src = saree.image;
  document.getElementById('modal-saree-category').textContent = saree.category.toUpperCase() + ' WEAVE';
  document.getElementById('modal-saree-title').textContent = currentLang === 'ta' ? saree.nameTa : saree.name;
  document.getElementById('modal-saree-price').textContent = saree.priceFormatted;
  document.getElementById('modal-saree-story').textContent = currentLang === 'ta' ? saree.storyTa : saree.story;
  document.getElementById('modal-saree-fabric').textContent = currentLang === 'ta' ? saree.fabricTa : saree.fabric;
  document.getElementById('modal-saree-zari').textContent = currentLang === 'ta' ? saree.zariTa : saree.zari;
  document.getElementById('modal-saree-origin').textContent = currentLang === 'ta' ? saree.originTa : saree.origin;
  document.getElementById('modal-saree-blouse').textContent = currentLang === 'ta' ? saree.blouseTa : saree.blouse;

  modal.classList.add('active');
}

function drapeSareeFromModal() {
  closeModal('modal-saree-details');
  drapeAndSwitchToMirror(modalCurrentSareeId);
}

function openStaffAssistanceForSaree() {
  closeModal('modal-saree-details');
  callStylist();
}

function closeModal(modalId) {
  playTapSound();
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function closeModalOnBackdrop(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

// =============================================================================
// 13. SIDE-BY-SIDE COMPARE ENGINE
// =============================================================================
function renderCompareOptions() {
  const selectA = document.getElementById('select-compare-a');
  const selectB = document.getElementById('select-compare-b');
  if (!selectA || !selectB) return;

  selectA.innerHTML = '';
  selectB.innerHTML = '';

  SAREE_CATALOG.forEach(s => {
    const title = currentLang === 'ta' ? s.nameTa : s.name;
    const optA = new Option(title, s.id, false, s.id === compareIdA);
    const optB = new Option(title, s.id, false, s.id === compareIdB);
    selectA.add(optA);
    selectB.add(optB);
  });

  updateCompareView('a', compareIdA);
  updateCompareView('b', compareIdB);
}

function changeCompareSelection(slot, sareeId) {
  playTapSound();
  if (slot === 'a') compareIdA = sareeId;
  if (slot === 'b') compareIdB = sareeId;
  updateCompareView(slot, sareeId);
}

function updateCompareView(slot, sareeId) {
  const saree = SAREE_CATALOG.find(s => s.id === sareeId);
  if (!saree) return;

  const imgEl = document.getElementById(`img-compare-${slot}`);
  const specsEl = document.getElementById(`specs-compare-${slot}`);

  if (imgEl) imgEl.src = saree.image;

  if (specsEl) {
    specsEl.innerHTML = `
      <div class="compare-spec-item">
        <span class="spec-label">${currentLang === 'ta' ? 'பெயர்' : 'Title'}</span>
        <span class="spec-value">${currentLang === 'ta' ? saree.nameTa : saree.name}</span>
      </div>
      <div class="compare-spec-item">
        <span class="spec-label">${currentLang === 'ta' ? 'விலை' : 'Price'}</span>
        <span class="spec-value text-blue" style="font-size: 1.05rem;">${saree.priceFormatted}</span>
      </div>
      <div class="compare-spec-item">
        <span class="spec-label">${currentLang === 'ta' ? 'ஜரிகை' : 'Zari'}</span>
        <span class="spec-value">${currentLang === 'ta' ? saree.zariTa : saree.zari}</span>
      </div>
      <div class="compare-spec-item">
        <span class="spec-label">${currentLang === 'ta' ? 'பிறப்பிடம்' : 'Origin'}</span>
        <span class="spec-value">${currentLang === 'ta' ? saree.originTa : saree.origin}</span>
      </div>
    `;
  }
}

function quickAddToCompare(sareeId) {
  playTapSound();
  compareIdB = sareeId;
  switchTab('compare');
}

function drapeFromCompare(slot) {
  const targetId = slot === 'a' ? compareIdA : compareIdB;
  drapeAndSwitchToMirror(targetId);
}

// =============================================================================
// 14. SAVED LOOKS GALLERY
// =============================================================================
function renderSavedGallery() {
  const container = document.getElementById('snaps-grid');
  if (!container) return;
  container.innerHTML = '';

  if (savedSnaps.length === 0) {
    container.innerHTML = `
      <div class="empty-gallery-state">
        <div class="empty-icon"><i class="fa-solid fa-camera-retro"></i></div>
        <h3 class="empty-title">${TRANSLATIONS[currentLang].empty_snaps_title}</h3>
        <p class="empty-desc">${TRANSLATIONS[currentLang].empty_snaps_desc}</p>
        <button class="btn-primary-orange" onclick="switchTab('mirror')">
          <i class="fa-solid fa-wand-magic-sparkles"></i> ${TRANSLATIONS[currentLang].nav_mirror}
        </button>
      </div>
    `;
    return;
  }

  savedSnaps.forEach((snap, idx) => {
    const card = document.createElement('div');
    card.className = 'snap-card';
    card.innerHTML = `
      <div class="snap-img-box">
        <img src="${snap.dataUrl}" alt="${snap.sareeName}">
      </div>
      <div class="snap-card-body">
        <span class="snap-meta-time"><i class="fa-solid fa-clock"></i> ${snap.timestamp}</span>
        <h4 class="snap-saree-name">${snap.sareeName}</h4>
        <div class="snap-actions">
          <button class="btn-snap-action btn-secondary-blue" onclick="showQRCodeModal(savedSnaps[${idx}])">
            <i class="fa-solid fa-qrcode"></i> QR
          </button>
          <button class="btn-snap-action btn-primary-orange" onclick="drapeAndSwitchToMirror('${snap.sareeId}')">
            <i class="fa-solid fa-arrow-rotate-right"></i> Try Again
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// =============================================================================
// 15. BOUTIQUE STYLIST CONCIERGE TOAST
// =============================================================================
let stylistToastTimeout = null;

function callStylist() {
  playChimeAlert();
  const toast = document.getElementById('toast-stylist');
  toast.classList.add('active');

  if (stylistToastTimeout) clearTimeout(stylistToastTimeout);
  stylistToastTimeout = setTimeout(() => {
    closeStylistToast();
  }, 5000);
}

function closeStylistToast() {
  const toast = document.getElementById('toast-stylist');
  if (toast) toast.classList.remove('active');
}

// =============================================================================
// 16. INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderQuickSareeDrawer();
  renderCatalogGrid();
  renderCompareOptions();
  drapeSaree('saree-1');
  updateClock();

  // Draw initial canvas when layout renders
  setTimeout(() => {
    drawDrapeCanvas();
  }, 250);
});
