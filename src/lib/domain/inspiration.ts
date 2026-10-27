import type { EventArchetype, IdeaItemEntity } from "./schemas";
import { formatCentsToCurrency } from "./money";

export interface ColorSwatch {
  name: string;
  hex: string;
  role: string;
}

export interface CostRange {
  minCents: number;
  maxCents: number;
}

export interface InspirationTheme {
  id: string;
  archetype: EventArchetype;
  category: string;
  title: string;
  tagline: string;
  description: string;
  whyItFits: string;
  heroImage: string;
  heroAlt: string;
  galleryImages: { url: string; alt: string; caption?: string }[];
  colorPalette: ColorSwatch[];
  atmosphere: string;
  budgetTier: "BUDGET_FRIENDLY" | "BALANCED" | "LUXURY";
  estimatedCostRange?: CostRange;
  inclusions: string[];
  optionalUpgrades?: { title: string; costCents: number }[];
  budgetFriendlyAlternative?: string;
  arrangementsChecklist: string[];
  foodIdeas?: string[];
  outfitSuggestions?: string[];
  photographyTips?: string[];
  tags: string[];
}

export const INSPIRATION_CATEGORIES = [
  "All Ideas",
  "Themes & Decor",
  "Cakes & Desserts",
  "Food & Catering",
  "Outfits & Styling",
  "Gifts & Return Gifts",
  "Photography",
  "Entertainment",
  "Family Activities",
  "My Favourites",
] as const;

export type InspirationCategory = (typeof INSPIRATION_CATEGORIES)[number];

// High-resolution curated celebration inspiration themes grounded in Indian celebration traditions
export const CURATED_INSPIRATION_THEMES: InspirationTheme[] = [
  // 1. FIRST BIRTHDAY / KIDS CELEBRATION
  {
    id: "theme-bday-pastel-garden",
    archetype: "BIRTHDAY",
    category: "Themes & Decor",
    title: "Pastel Garden & Butterfly Fairytale",
    tagline: "Soft macarons, blooming sweet peas, and whimsical archways",
    description:
      "A dreamy, tender aesthetic tailored for a first birthday. Delicate sage greens, blush roses, and muted champagne ribbons frame a sunlit celebration with baby-friendly soft play zones.",
    whyItFits:
      "Gentle pastel tones photograph beautifully without overwhelming baby or grandparents, creating serene heirloom portraits.",
    heroImage:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Pastel floral tablescape with soft macaron and flower decor",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
        alt: "Festive pastel confetti and gentle party balloons",
        caption: "Organic pastel balloon garland with fairy lights",
      },
      {
        url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80",
        alt: "Artisan berry and cream single-tier celebration cake",
        caption: "Low-sugar smash cake with fresh chamomile blooms",
      },
      {
        url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80",
        alt: "Pastel dessert table with mini dessert cups and blossoms",
        caption: "Dessert grazing bar with eggless berry mousse cups",
      },
    ],
    colorPalette: [
      { name: "Blush Peach", hex: "#F7B299", role: "Primary Accent" },
      { name: "Sage Meadow", hex: "#9CAF88", role: "Secondary Flora" },
      { name: "Warm Ivory", hex: "#FAF6F0", role: "Base Canvas" },
      { name: "Champagne Gold", hex: "#C6A66B", role: "Highlight Shimmer" },
      { name: "Muted Coral", hex: "#D97768", role: "Focal Contrast" },
    ],
    atmosphere:
      "Gentle acoustic nursery instrumental music, fragrant tuberose and eucalyptus, airy sun-dappled lighting, and relaxed family seating.",
    budgetTier: "BALANCED",
    estimatedCostRange: { minCents: 1800000, maxCents: 3500000 }, // ₹18,000 - ₹35,000
    inclusions: [
      "Custom 7-foot circular arch with organic biodegradable pastel balloons and faux florals",
      "Personalized wooden name cut-out with back-lit warm halo",
      "Low wooden picnic table with floor cushions for cousins & toddlers",
      "Entrance welcome easel with dried floral bouquet",
    ],
    optionalUpgrades: [
      { title: "Fresh Imported Hydrangeas & Baby's Breath Upgrade", costCents: 650000 },
      { title: "Custom Acrylic Milestone Chalkboard (12 Months Milestones)", costCents: 220000 },
    ],
    budgetFriendlyAlternative:
      "Opt for self-installed balloon kit with local florist baby's breath sprigs to save ~₹10,000.",
    arrangementsChecklist: [
      "Confirm venue allows free-standing backdrop frames without wall nails",
      "Arrange foam-matted play zone for crawling infants away from cables",
      "Order custom eggless pastel smash cake 10 days in advance",
      "Set up baby changing and quiet nursing corner for visiting mothers",
    ],
    foodIdeas: [
      "Finger-friendly baby fruit skewers (banana, soft melon, grapes quartered)",
      "Mini vegetable sandwiches with mint-coriander spread (crustless)",
      "Tender coconut water coolers & fresh mango lassi in mini clay kulhads",
      "Assorted eggless mini cupcakes and pistachio cookies",
    ],
    outfitSuggestions: [
      "Celebrant: Soft organic cotton peach kurta-pajama or pastel rompers with suspenders",
      "Parents: Complementary sage green linen kurta and ivory chanderi saree",
      "Guests: Garden-chic pastels and breathable silks",
    ],
    photographyTips: [
      "Golden hour shoot 45 minutes before guest arrival while baby is well-rested",
      "Candid shots of grandparents feeding baby the first bite of kheer/cake",
      "Eye-level perspective shots from baby's crawling height",
    ],
    tags: ["First Birthday", "Pastel", "Garden", "Floral", "Gentle", "Smash Cake"],
  },

  // 2. JUNGLE SAFARI ADVENTURE
  {
    id: "theme-bday-safari-expedition",
    archetype: "BIRTHDAY",
    category: "Themes & Decor",
    title: "Golden Safari & Tropical Jungle Adventure",
    tagline: "Lush botanical fronds, friendly wooden animal silhouettes, and warm earth tones",
    description:
      "An adventurous, nature-inspired safari world. Deep emerald monstera leaves, natural rattan textures, and warm mustard accents create an exhilarating playground for curious little explorers.",
    whyItFits:
      "Engages older siblings and young cousins with animal treasure hunts while looking modern and photogenic.",
    heroImage:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Festive celebration backdrop with warm party lighting and balloon installations",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80",
        alt: "Outdoor garden setting with greenery and sun umbrellas",
        caption: "Natural garden pavilion styling with rustic cane furniture",
      },
      {
        url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
        alt: "Children party activities and vibrant celebration decor",
        caption: "Junior explorer craft activity table with animal masks",
      },
      {
        url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80",
        alt: "Artisan return gift bags with natural jute ties",
        caption: "Safari explorer kits and terracotta potted succulent favors",
      },
    ],
    colorPalette: [
      { name: "Forest Emerald", hex: "#2A7942", role: "Primary Foliage" },
      { name: "Warm Ochre", hex: "#E58E26", role: "Safari Earth" },
      { name: "Natural Cane", hex: "#D6C7A1", role: "Rattan Texture" },
      { name: "Deep Auburn", hex: "#4B2E1E", role: "Bark Anchor" },
      { name: "Linen Cream", hex: "#FAF8F5", role: "Canvas Background" },
    ],
    atmosphere:
      "Acoustic jungle rhythm ambient sounds, live caricature or face painter, leafy photo booth corner, and wooden crates overflowing with treats.",
    budgetTier: "BALANCED",
    estimatedCostRange: { minCents: 2000000, maxCents: 4200000 }, // ₹20,000 - ₹42,000
    inclusions: [
      "Custom double-layer jungle archway with faux tropical monstera & palm fronds",
      "Life-sized wooden cutout animal mascots (baby elephant, giraffe, lion cub)",
      "Rustic wooden crate display stands for party favors and birthday cake",
      "Custom safari signposts ('Watering Hole', 'Wilderness Trail', 'Snack Camp')",
    ],
    optionalUpgrades: [
      { title: "Live Puppet Show & Animal Storyteller (45 mins)", costCents: 500000 },
      { title: "Mini Animal Ride-On Toddler Track", costCents: 400000 },
    ],
    budgetFriendlyAlternative:
      "Rent potted palm trees from a local plant nursery rather than building artificial floral arches.",
    arrangementsChecklist: [
      "Book animal safari props with local event decorator 14 days ahead",
      "Assemble safari explorer hats and magnifying glasses for kids",
      "Verify battery-operated ambient lighting for evening hall setting",
    ],
    foodIdeas: [
      "Watering hole juice dispenser: Fresh Watermelon cooler & Pineapple ginger fizz",
      "Safari trail mix bags: Roasted cashews, cranberries, puffed lotus seeds (makhana)",
      "Jungle sliders: Mini paneer tikka burgers and potato corn cutlets",
      "Green coconut malai dessert cups",
    ],
    outfitSuggestions: [
      "Celebrant: Khaki linen romper with tiny embroidered safari animals or lion suspenders",
      "Family: Earthy olive green, mustard yellow, and beige matching ensemble",
    ],
    photographyTips: [
      "Capture toddlers exploring the animal cutouts with magnifying glasses",
      "Wide shot of the tropical arch before cake-cutting chaos",
    ],
    tags: ["Jungle", "Safari", "Adventure", "Kids Activities", "Botanical", "Birthday"],
  },

  // 3. TRADITIONAL INDIAN FESTIVE STYLING (MARIGOLD & BRASS)
  {
    id: "theme-festive-marigold-brass",
    archetype: "BIRTHDAY",
    category: "Themes & Decor",
    title: "Heritage Marigold & Handcrafted Brass Utsav",
    tagline: "Fragrant yellow genda phool, glowing brass urlis, and festive temple bells",
    description:
      "A soulful, culturally grounded celebration steeped in Indian festive warmth. Fresh orange and yellow marigold cascades, floating oil diyas in brass urlis, and handloom textile drapery honor family traditions.",
    whyItFits:
      "Cherished by elders and grandparents, perfect for religious pujas, Annaprashan, or traditional Odia/Indian first birthday blessings.",
    heroImage:
      "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Fresh Indian festive marigold flower garlands and traditional celebratory lights",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80",
        alt: "Traditional Indian floral mandap with marigold and brass lamps",
        caption: "Brass urlis with floating rose petals and fragrant marigold drops",
      },
      {
        url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80",
        alt: "Traditional Indian sweets and mithai display",
        caption: "Heritage sweet table: fresh Chhena Poda, Rasagolas, and Kaju katli",
      },
      {
        url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        alt: "Warm glowing evening lanterns and celebration lights",
        caption: "Warm incandescent fairy lights paired with brass temple lamps",
      },
    ],
    colorPalette: [
      { name: "Marigold Yellow", hex: "#E58E26", role: "Primary Floral" },
      { name: "Auspicious Kumkum", hex: "#C0392B", role: "Sacred Accent" },
      { name: "Heritage Brass", hex: "#C6A66B", role: "Metallic Warmth" },
      { name: "Forest Betel Leaf", hex: "#1B4D3E", role: "Leaf Contrast" },
      { name: "Unbleached Cotton", hex: "#FAF6F0", role: "Drape Foundation" },
    ],
    atmosphere:
      "Subtle live flute / shehnai or classical instrumental raga, lingering aroma of pure sandalwood incense and fresh jasmine, soft brass lamp glow.",
    budgetTier: "BALANCED",
    estimatedCostRange: { minCents: 1500000, maxCents: 2800000 }, // ₹15,000 - ₹28,000
    inclusions: [
      "Traditional wooden frame backdrop with suspended marigold tassel strings & brass bells",
      "Two large 24-inch brass urlis with floating lotus flowers and tea-light diyas",
      "Traditional chowki (low wooden seating stool) with embroidered silk aasan for puja/cake",
      "Fresh mango leaf and jasmine toran at main entryway",
    ],
    optionalUpgrades: [
      { title: "Live Flautist (Bansuri) during puja & arrival (90 mins)", costCents: 450000 },
      { title: "Artisan Clay Diya Painting Activity Corner for Cousins", costCents: 180000 },
    ],
    budgetFriendlyAlternative:
      "Source fresh marigold strings directly from the morning flower mandi (wholesale market) to reduce florist markup by 50%.",
    arrangementsChecklist: [
      "Order fresh genda phool strings from local flower market one evening prior",
      "Arrange brass vessels and polish with pitambari 2 days in advance",
      "Prepare pure ghee diyas and incense holders away from drapery fabrics",
      "Confirm Brahmin pandit puja samagri list with family elders",
    ],
    foodIdeas: [
      "Traditional Odia Chhena Poda baked cheesecake & hot Chenna Gaja",
      "Live Puri Sabji & Dalma counter with fragrant ghee rice",
      "Aged basmati Kheer / Payasam infused with saffron and cardamom",
      "Cold badam milk and rose sharbat in clay matkas",
    ],
    outfitSuggestions: [
      "Celebrant: Traditional silk dhoti-kurta set with golden zari borders or kanjivaram pavada",
      "Mother: Sambalpuri / Ikkat silk saree in yellow and temple red",
      "Father: Tussar silk kurta with churidar",
    ],
    photographyTips: [
      "Capture the aarti flame reflecting in baby's eyes",
      "Three-generation family portrait: grandparents, parents, and baby around the brass urli",
    ],
    tags: ["Traditional", "Heritage", "Marigold", "Festive", "Indian", "Puja", "Family"],
  },

  // 4. BOLLYWOOD RETRO CARNIVAL
  {
    id: "theme-bday-bollywood-carnival",
    archetype: "BIRTHDAY",
    category: "Themes & Decor",
    title: "Retro Bollywood & Colorful Mela Carnival",
    tagline: "Vibrant pinwheels, popcorn carts, live bangle makers, and lively music",
    description:
      "A joyful, nostalgic carnival celebration infused with Bollywood flair. Bright candy stripes, vintage movie poster cutouts, live street food stations, and irresistible festive beats ensure every cousin, auntie, and uncle joins the dance floor.",
    whyItFits:
      "High energy and unforgettable entertainment value where kids and elders mingle and celebrate with zero stiffness.",
    heroImage:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Lively carnival style party tablescape with colorful treats and decorations",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
        alt: "Vibrant party layout and celebration atmosphere",
        caption: "Colorful fabric canopy with carnival lights and streamers",
      },
      {
        url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80",
        alt: "Family celebration with sparkles and laughter",
        caption: "Live instant Polaroid station with vintage Bollywood sunglasses & props",
      },
      {
        url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
        alt: "Curated celebration gifts and colorful carnival favors",
        caption: "Carnival return gift hampers with wooden spinning tops and sweet boxes",
      },
    ],
    colorPalette: [
      { name: "Electric Vermillion", hex: "#D97768", role: "Dynamic Pop" },
      { name: "Royal Aubergine", hex: "#342238", role: "Midnight Anchor" },
      { name: "Sunflower Yellow", hex: "#F5B041", role: "Carnival Gold" },
      { name: "Teal Peacock", hex: "#16A085", role: "Retro Vibrant" },
      { name: "Ivory Silk", hex: "#FAF6F0", role: "Neutral Ground" },
    ],
    atmosphere:
      "Upbeat 80s & 90s Bollywood family classics, popcorn aroma wafting through the hall, laughter at game stalls, and lively dhol beats during cake cutting.",
    budgetTier: "BALANCED",
    estimatedCostRange: { minCents: 2200000, maxCents: 4500000 }, // ₹22,000 - ₹45,000
    inclusions: [
      "Custom retro Bollywood photo-booth with auto-rickshaw cutout & polarized goggles",
      "Carnival game stalls (Ring Toss, Balloon Darts, Feed the Elephant)",
      "Live Fresh Butter Popcorn & Cotton Candy (Candy Floss) Machine counter",
      "Dynamic DJ sound system with wireless mic for family games and announcements",
    ],
    optionalUpgrades: [
      { title: "Live Magic Show & Interactive Balloon Twister (60 mins)", costCents: 600000 },
      { title: "Live Bangle Maker (Chudi Wala) for Aunties & Female Guests", costCents: 350000 },
    ],
    budgetFriendlyAlternative:
      "Play curated Spotify Bollywood retro playlist via venue Bluetooth speaker system instead of hiring a full DJ console.",
    arrangementsChecklist: [
      "Verify venue electric power load for popcorn & cotton candy machines",
      "Order custom retro movie tickets as entrance badges or invites",
      "Prepare curated prize basket for carnival game winners",
    ],
    foodIdeas: [
      "Live Chaat counter: Sev Puri, Pani Puri with sweet and tangy waters, Papdi Chaat",
      "Pav Bhaji & Chole Kulche station with diced onions and butter cubes",
      "Freshly spun pink strawberry cotton candy & caramel popcorn cones",
      "Kulfi falooda with rabri and rose drizzle",
    ],
    outfitSuggestions: [
      "Celebrant: Vibrant embroidered retro waist-coat with churidar or polka-dot frock",
      "Parents: Retro glam fusion — bright kurta with statement bandhgala jacket",
    ],
    photographyTips: [
      "Action shots of kids tossing rings at carnival stalls",
      "Group photo of the entire family wearing funky vintage Bollywood sunglasses",
    ],
    tags: ["Bollywood", "Carnival", "Retro", "Games", "Popcorn", "High Energy"],
  },

  // 5. CAKES & DESSERTS: ARTISAN PATISSERIE DISPLAY
  {
    id: "theme-cakes-dessert-parlour",
    archetype: "BIRTHDAY",
    category: "Cakes & Desserts",
    title: "Artisan Dessert Atelier & Custom 2-Tier Cake",
    tagline: "Handcrafted eggless cake, chocolate ganache tiers, and French macarons",
    description:
      "A stunning centerpiece dessert installation. A tiered custom cake surrounded by artisan dessert shooter cups, gold-dusted chocolate truffles, and delicate macarons displayed on stepped marble and brass platters.",
    whyItFits:
      "The cake cutting is the single most photographed moment of a first birthday; a curated table elevates every album shot.",
    heroImage:
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Artisan berry celebration cake with fresh floral toppings",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80",
        alt: "Delicate individual pastries and macarons",
        caption: "Individual eggless dessert shooters: Belgian chocolate & mango passionfruit",
      },
      {
        url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
        alt: "Dessert table centerpiece with floral bouquets",
        caption: "Elevated acrylic cake plinth with fairy light under-glow",
      },
    ],
    colorPalette: [
      { name: "Cream Buttercream", hex: "#FFF8EA", role: "Cake Canvas" },
      { name: "Belgian Truffle", hex: "#3E2723", role: "Rich Contrast" },
      { name: "Dusty Coral", hex: "#D97768", role: "Berry Bloom" },
      { name: "Champagne Gold", hex: "#C6A66B", role: "Foil Highlights" },
    ],
    atmosphere: "Sweet chocolate and vanilla bakery aroma, sparkling cake candles, and cheerful happy birthday sing-along.",
    budgetTier: "BALANCED",
    estimatedCostRange: { minCents: 700000, maxCents: 1600000 }, // ₹7,000 - ₹16,000
    inclusions: [
      "Custom 3 kg 2-tier designer cake (Eggless Belgian Chocolate Truffle or Raspberry Vanilla)",
      "Complementary 500g baby smash cake (low sugar, natural fruit sweetener)",
      "Set of 30 mini dessert cups (Tiramisu, Mango Panna Cotta, Red Velvet)",
      "Designer acrylic cake knife set and sparkler candles",
    ],
    optionalUpgrades: [
      { title: "Custom Fondant 3D Baby Figurine Topper", costCents: 200000 },
      { title: "Box of 24 Gold-Dusted Macarons in Matching Palette", costCents: 180000 },
    ],
    budgetFriendlyAlternative:
      "Opt for a single-tier designer cake for photos accompanied by fresh sheet cake sliced from the pantry.",
    arrangementsChecklist: [
      "Confirm eggless / nut-free allergies with bakery 10 days prior",
      "Arrange air-conditioned delivery 1.5 hours before cake cutting",
      "Ensure cake stand and table knife are polished and ready",
    ],
    foodIdeas: [
      "Belgian Chocolate Truffle with sea salt crunch",
      "Rasmalai fusion cake jars",
      "Vanilla bean cupcakes with pastel buttercream rosettes",
    ],
    tags: ["Cakes", "Desserts", "Bakery", "Artisan", "Sweet Table"],
  },

  // 6. FOOD & CATERING: REGIONAL INDIAN FEAST ATELIER
  {
    id: "theme-catering-royal-dawat",
    archetype: "BIRTHDAY",
    category: "Food & Catering",
    title: "Interactive Live Counters & Regional Tasting Feast",
    tagline: "Live chaat, hot jalebis with rabri, artisanal mocktails, and separate pure veg kitchens",
    description:
      "A culinary showcase designed for diverse Indian guest palates. Fresh live stations where steaming hot kulchas, tossed pastas, crisp dosas, and delicate kebabs are made to order, accompanied by a dedicated sattvic/Jain counter.",
    whyItFits:
      "Food is what guests remember most fondly; live interactive counters keep lines moving and guarantee piping hot food.",
    heroImage:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Gourmet banquet buffet with warm chafing dishes and elegant setup",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80",
        alt: "Artisan Indian mithai and sweets display",
        caption: "Live jalebi counter with rabri and pistachios",
      },
      {
        url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80",
        alt: "Outdoor garden dining arrangement",
        caption: "Shaded dining pergola with family table seating",
      },
    ],
    colorPalette: [
      { name: "Saffron Gold", hex: "#F39C12", role: "Spice Flame" },
      { name: "Deep Aubergine", hex: "#342238", role: "Table Cloth" },
      { name: "Warm Parchment", hex: "#FAF6F0", role: "Platter Base" },
      { name: "Copper Burnish", hex: "#B87333", role: "Chafing Dish" },
    ],
    atmosphere: "Sizzling tawa sounds, warm cardamom and ghee aromas, and attentive uniformed steward service.",
    budgetTier: "LUXURY",
    estimatedCostRange: { minCents: 4500000, maxCents: 9500000 }, // ₹45,000 - ₹95,000 (scaled by guests)
    inclusions: [
      "3 Live cooking stations (Street Chaat, Tawa Kulcha / Pasta, and Hot Desserts)",
      "Full buffet spread with 4 starters, 5 main courses, dal makhani, and 3 breads",
      "Dedicated separate Jain / No Onion No Garlic counter for elders",
      "Full cutlery, bone china plates, cloth napkins, and uniformed steward staff",
    ],
    optionalUpgrades: [
      { title: "Artisan Mocktail & Cold Brew Coffee Bar with Bartender", costCents: 850000 },
      { title: "Live Stone-Ice Cream & Rolled Pan Counter", costCents: 600000 },
    ],
    budgetFriendlyAlternative:
      "Select a fixed 3-course sit-down thali or buffet without live stations to reduce chef staffing costs.",
    arrangementsChecklist: [
      "Conduct menu tasting session with caterer 3 weeks before celebration",
      "Confirm water dispenser / bottled water logistics and ice storage",
      "Verify caterer brings own waste disposal bins and clean-up crew",
    ],
    foodIdeas: [
      "Paneer Tikka Shashlik & Crispy Corn Salt-and-Pepper starters",
      "Dal Bukhara slow-cooked for 18 hours with butter garlic naan",
      "Odia Chenna Jhili & warm Gulab Jamuns in saffron syrup",
    ],
    tags: ["Catering", "Live Food", "Indian Feast", "Chaat", "Buffet", "Jain Friendly"],
  },

  // 7. GIFTS & RETURN GIFTS: ARTISAN SUSTAINABLE HAMPERS
  {
    id: "theme-gifts-sustainable-favors",
    archetype: "BIRTHDAY",
    category: "Gifts & Return Gifts",
    title: "Handcrafted Artisan Return Hampers & Seed Kits",
    tagline: "Eco-friendly wooden toys, organic honey jars, and plantable seed pencils",
    description:
      "Meaningful, zero-plastic party favors that families will cherish long after the party. Packed in custom jute bags or terracotta boxes tied with botanical cotton ribbon.",
    whyItFits:
      "Avoids cheap disposable plastic trinkets and teaches children to nurture green saplings and creative crafts.",
    heroImage:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Artisan return gift bags with rustic ties and botanical touches",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
        alt: "Beautifully wrapped gift parcels with personalized gift tags",
        caption: "Personalized thank-you gift tags printed on recycled cotton card",
      },
    ],
    colorPalette: [
      { name: "Kraft Jute", hex: "#C7B299", role: "Eco Base" },
      { name: "Botanical Sage", hex: "#7D9D8B", role: "Foliage Print" },
      { name: "Dusty Coral", hex: "#D97768", role: "Ribbon Accent" },
    ],
    atmosphere: "Heartwarming farewell exchanges, grateful guest smiles, and personal thank-you notes.",
    budgetTier: "BUDGET_FRIENDLY",
    estimatedCostRange: { minCents: 600000, maxCents: 1500000 }, // ₹6,000 - ₹15,000
    inclusions: [
      "Custom printed cotton/jute favor bags with baby's name & illustration",
      "Plantable seed pencils (marigold & basil) + terracotta mini potting kit",
      "Artisan wooden spinning top (Channapatna non-toxic craft) for kids",
      "Mini jar of raw organic forest honey or dry fruits for elder guests",
    ],
    optionalUpgrades: [
      { title: "Personalized Board Book with Birthday Child's Photo", costCents: 350000 },
    ],
    budgetFriendlyAlternative:
      "Pack freshly homemade besan laddus or artisanal cookies in simple paper craft envelopes with ribbon.",
    arrangementsChecklist: [
      "Order personalized favor bags 14 days in advance to allow printing",
      "Count confirmed children RSVPs and add 5 spare bags for unexpected guests",
      "Place favors near exit display table with fairy lights",
    ],
    tags: ["Return Gifts", "Eco-friendly", "Sustainable", "Kids Favors", "Artisan"],
  },

  // 8. PHOTOGRAPHY: CANDID STORYTELLING & INSTANT MEMORIES
  {
    id: "theme-photo-candid-storytelling",
    archetype: "BIRTHDAY",
    category: "Photography",
    title: "Editorial Candid Storytelling & Memory Wall",
    tagline: "Unposed family laughter, vintage color grading, and same-day teaser reel",
    description:
      "Documenting authentic emotional connection instead of forced, stiff stage posing. A dedicated photojournalist captures the grandparents' proud smiles, baby's wide-eyed wonder, and joyful chaos.",
    whyItFits:
      "Years later, parents treasure candid portraits of elderly relatives holding the baby far more than staged group lineups.",
    heroImage:
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80",
    heroAlt: "Family celebrating with warm candid smiles and sparkles",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
        alt: "Warm golden celebration setting",
        caption: "Golden hour family portraits before party start",
      },
    ],
    colorPalette: [
      { name: "Warm Sepia", hex: "#704214", role: "Tone" },
      { name: "Ivory Light", hex: "#FAF6F0", role: "Gleam" },
      { name: "Champagne Gold", hex: "#C6A66B", role: "Bokeh" },
    ],
    atmosphere: "Quiet, unobtrusive storytelling without flashing blinding lights into baby's eyes.",
    budgetTier: "BALANCED",
    estimatedCostRange: { minCents: 1500000, maxCents: 3200000 }, // ₹15,000 - ₹32,000
    inclusions: [
      "1 Candid Photographer + 1 Traditional Videographer for 4 hours",
      "High-resolution edited digital gallery (150+ color-graded images)",
      "1-minute cinematic Instagram teaser reel delivered within 48 hours",
      "Instant polaroid guestbook with silver metallic pens at welcome table",
    ],
    optionalUpgrades: [
      { title: "Hardcover Flush-Mount Leatherette Photobook (30 pages)", costCents: 750000 },
      { title: "Drone Aerial Establishing Shots (outdoor venue)", costCents: 400000 },
    ],
    budgetFriendlyAlternative:
      "Hire a solo candid photographer for 2.5 hours covering just the golden hour and cake ceremony.",
    arrangementsChecklist: [
      "Share shot list with photographer (must-have family elder combinations)",
      "Schedule baby portrait session 45 minutes prior to guest arrival",
      "Reserve front row seating for videographer during cake cutting",
    ],
    tags: ["Photography", "Candid", "Video", "Instagram Reel", "Storytelling", "Memories"],
  },
];

/**
 * Filter inspiration themes by category and search keyword.
 */
export function filterInspirationThemes(
  themes: InspirationTheme[],
  selectedCategory: InspirationCategory,
  searchQuery: string,
  favouriteIds: Set<string>
): InspirationTheme[] {
  let list = themes;

  if (selectedCategory === "My Favourites") {
    list = list.filter((t) => favouriteIds.has(t.id));
  } else if (selectedCategory !== "All Ideas") {
    list = list.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Format cost range helper with deterministic currency formatting.
 */
export function formatCostRange(range?: CostRange, currency: string = "INR"): string {
  if (!range || range.minCents <= 0) {
    return "Cost estimate needed";
  }
  return `${formatCentsToCurrency(range.minCents, currency)} – ${formatCentsToCurrency(
    range.maxCents,
    currency
  )}`;
}

/**
 * Merge existing event database ideas (IdeaItemEntity) with rich curated inspiration
 * so user-saved DB ideas or AI-generated ideas also gain rich visuals and attributes.
 */
export function adaptDbIdeasToInspiration(
  dbIdeas: IdeaItemEntity[],
  archetype: EventArchetype
): InspirationTheme[] {
  return dbIdeas.map((idea, index) => {
    // Map existing idea to rich theme structure
    const matchingCurated = CURATED_INSPIRATION_THEMES.find(
      (c) =>
        c.category.toLowerCase() === idea.category.toLowerCase() ||
        c.title.toLowerCase().includes(idea.title.toLowerCase())
    );

    const heroImage =
      matchingCurated?.heroImage ||
      (index % 2 === 0
        ? "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80"
        : "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80");

    const colorPalette: ColorSwatch[] = matchingCurated?.colorPalette || [
      { name: "Warm Ivory", hex: "#FAF6F0", role: "Base Canvas" },
      { name: "Champagne Gold", hex: "#C6A66B", role: "Highlight Accent" },
      { name: "Dusty Coral", hex: "#D97768", role: "Focal Contrast" },
      { name: "Deep Aubergine", hex: "#342238", role: "Anchor" },
    ];

    const estimatedCostRange: CostRange | undefined = idea.estimatedCostCents
      ? {
          minCents: Math.round(idea.estimatedCostCents * 0.85),
          maxCents: Math.round(idea.estimatedCostCents * 1.25),
        }
      : matchingCurated?.estimatedCostRange;

    return {
      id: idea.id,
      archetype,
      category: idea.category || "Themes & Decor",
      title: idea.title,
      tagline: idea.whyItFits || "Bespoke celebration recommendation",
      description: idea.description,
      whyItFits:
        idea.whyItFits ||
        "Specially curated for your celebration date, guest count, and family preferences.",
      heroImage,
      heroAlt: `${idea.title} celebration inspiration`,
      galleryImages: matchingCurated?.galleryImages || [],
      colorPalette,
      atmosphere:
        matchingCurated?.atmosphere ||
        "Joyful, welcoming atmosphere with warm lighting, gentle festive music, and attentive hospitality.",
      budgetTier: matchingCurated?.budgetTier || "BALANCED",
      estimatedCostRange,
      inclusions: matchingCurated?.inclusions || [
        "Curated decor elements and personalized display",
        "Dedicated setup and dismantling coordination",
      ],
      optionalUpgrades: matchingCurated?.optionalUpgrades,
      budgetFriendlyAlternative: matchingCurated?.budgetFriendlyAlternative,
      arrangementsChecklist: matchingCurated?.arrangementsChecklist || [
        `Confirm arrangements for "${idea.title}" with preferred partner`,
        "Review final specifications and timing with family",
      ],
      foodIdeas: matchingCurated?.foodIdeas,
      outfitSuggestions: matchingCurated?.outfitSuggestions,
      photographyTips: matchingCurated?.photographyTips,
      tags: [idea.category, "Curated", archetype],
    };
  });
}
