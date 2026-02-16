// ============================================================
// CAMERA ANTHOLOGY
// ============================================================
export const CAMERAS = {
  cinema: [
    { id: "arri-alexa-35", name: "ARRI ALEXA 35", sensor: "4.6K Super 35", dr: "17 stops", look: "Creamy highlights, organic grain, filmic color separation", promptHints: "ARRI texture, filmic grain, organic color, creamy highlights" },
    { id: "arri-alexa-mini-lf", name: "ARRI ALEXA Mini LF", sensor: "4.5K Large Format", dr: "14+ stops", look: "Signature ARRI warmth, smooth roll-off, naturalistic", promptHints: "Large format depth, ARRI color science, shallow focus falloff" },
    { id: "sony-venice-2", name: "Sony VENICE 2", sensor: "8.6K Full Frame", dr: "15+ stops", look: "Clean, modern, high resolution, excellent low light", promptHints: "VENICE clarity, clean shadows, high resolution, cinematic Sony" },
    { id: "red-v-raptor-xl", name: "RED V-Raptor XL 8K VV", sensor: "8K Vista Vision", dr: "17+ stops", look: "High contrast, crisp detail, post-flexible", promptHints: "RED raw crispness, high contrast, vivid colors, detailed texture" },
    { id: "red-komodo-6k", name: "RED Komodo 6K", sensor: "6K S35 Global Shutter", dr: "16+ stops", look: "Compact, versatile, motion-mount compatible", promptHints: "Global shutter motion, compact cinema, RED color" },
  ],
  prosumer: [
    { id: "sony-fx6", name: "Sony FX6", sensor: "Full Frame 4K 120fps", dr: "15 stops", look: "Sony Venice DNA, compact, excellent AF", promptHints: "Sony cinematic look, compact body, documentary style" },
    { id: "sony-fx3", name: "Sony FX3", sensor: "Full Frame 4K 120fps", dr: "15 stops", look: "Mirrorless cinema form factor", promptHints: "Sony cinematic, run-and-gun, gimbal-ready" },
    { id: "canon-c300-iii", name: "Canon EOS C300 Mark III", sensor: "4K Super 35 DGO", dr: "16+ stops", look: "Warm Canon skin tones, documentary friendly", promptHints: "Canon warmth, documentary realism, DGO dynamic range" },
    { id: "blackmagic-6k-pro", name: "Blackmagic Pocket Cinema Camera 6K Pro", sensor: "6K S35", dr: "13 stops", look: "Raw and gradeable, film-like color", promptHints: "Blackmagic film look, indie aesthetic, gradeable shadows" },
  ],
  action: [
    { id: "gopro-hero-12", name: "GoPro Hero 12", sensor: "5.3K", dr: "10 stops", look: "Wide angle, HyperSmooth, immersive", promptHints: "GoPro POV, ultra-wide, action camera, stabilized" },
    { id: "dji-action-4", name: "DJI Action 4", sensor: "4K", dr: "10 stops", look: "Action camera, cold resistant, magnetic", promptHints: "action camera, DJI color, POV angle" },
    { id: "iphone-15-pro", name: "iPhone 15 Pro", sensor: "48MP ProRes Log", dr: "12 stops", look: "Computational photography, Cinematic Mode", promptHints: "smartphone cinematic, ProRes, shallow depth simulation" },
  ],
  drone: [
    { id: "dji-inspire-3", name: "DJI Inspire 3", sensor: "8K Full Frame", dr: "14 stops", look: "Cinema drone, interchangeable lenses", promptHints: "aerial cinema, drone shot, sweeping landscape" },
    { id: "dji-mavic-3-cine", name: "DJI Mavic 3 Cine", sensor: "4/3 sensor ProRes", dr: "12.8 stops", look: "Compact cinema drone", promptHints: "aerial shot, compact drone, landscape" },
  ],
  film: [
    { id: "kodak-500t-35mm", name: "Kodak Vision3 500T 5219 (35mm)", format: "35mm", iso: 500, look: "Gold standard for night, warm shadows, creamy highlights", promptHints: "Kodak 500T, tungsten warmth, film grain, night exterior, creamy skin tones" },
    { id: "kodak-250d-35mm", name: "Kodak Vision3 250D 5207 (35mm)", format: "35mm", iso: 250, look: "Natural daylight rendering, moderate grain", promptHints: "Kodak 250D, daylight film, natural color, moderate grain" },
    { id: "kodak-500t-16mm", name: "Kodak Vision3 500T 7219 (16mm)", format: "16mm", iso: 500, look: "Grainy, documentary feel, nostalgic texture", promptHints: "16mm film, grainy texture, documentary feel, organic grain" },
    { id: "kodak-tri-x-16mm", name: "Kodak Tri-X 7266 (16mm B&W)", format: "16mm", iso: 200, look: "Classic documentary B&W, high contrast, gritty", promptHints: "Tri-X, black and white film, high contrast, documentary B&W" },
    { id: "super8-kodak", name: "Kodak Vision3 50D (Super 8)", format: "Super 8mm", iso: 50, look: "Heavy grain, soft focus, nostalgic home movie", promptHints: "Super 8, heavy grain, soft focus, 1970s home movie, nostalgic" },
  ],
} as const;

// ============================================================
// LENS ANTHOLOGY
// ============================================================
export const LENSES = {
  primes: [
    { id: "zeiss-supreme", name: "Zeiss Supreme Prime Radiance", character: "Subtle flaring, smooth bokeh, T1.5 speed", promptHints: "Zeiss Radiance glow, smooth bokeh balls, T1.5 depth" },
    { id: "cooke-s4", name: "Cooke S4/i", character: "Cooke look - warmth, dimensional, creamy flares", promptHints: "Cooke classic look, warm flares, 3D pop" },
    { id: "leica-summilux-c", name: "Leica Summilux-C", character: "Sharp but gentle, incredible micro-contrast", promptHints: "Leica micro-contrast, elegant sharpness, luxury look" },
    { id: "canon-k35", name: "Canon K35 Vintage", character: "Warm, glowing, low contrast, vintage flares", promptHints: "K35 vintage glow, warm halation, soft contrast" },
  ],
  anamorphic: [
    { id: "atlas-orion", name: "Atlas Orion Anamorphic (2x)", character: "Blue flares, oval bokeh, cinematic scope", promptHints: "Anamorphic flares, 2.39:1 aspect, streak lights, oval bokeh" },
    { id: "cooke-anamorphic", name: "Cooke Anamorphic/i", character: "Organic aberrations, elliptical bokeh", promptHints: "Cooke anamorphic character, organic bokeh, cinematic scope" },
  ],
  specialty: [
    { id: "laowa-probe", name: "Laowa 24mm Probe Macro", character: "Borescope, cinematic macro, extreme close-up", promptHints: "probe lens, macro, extreme close-up, bug-eye perspective" },
    { id: "lensbaby", name: "Lensbaby Composer", character: "Selective focus, dreamlike, tilt effect", promptHints: "selective focus, dreamlike, tilt-shift, soft edges" },
    { id: "fisheye", name: "Sigma 8mm Fisheye", character: "180° field, extreme distortion", promptHints: "fisheye distortion, ultra-wide, barrel distortion" },
  ],
  vintage: [
    { id: "helios-44-2", name: "Helios 44-2 (58mm f/2)", character: "Swirly bokeh, Russian character", promptHints: "Helios swirly bokeh, vintage Russian lens, character" },
    { id: "super-takumar", name: "Pentax Super Takumar", character: "Amber coatings, 60s-70s warm", promptHints: "Takumar amber, vintage warm, 1960s lens character" },
  ],
} as const;

// ============================================================
// LIGHTING ANTHOLOGY
// ============================================================
export const LIGHTING = {
  hmi: [
    { id: "arri-m18", name: "ARRI M18 HMI", watts: "1800W", temp: "5600K", desc: "Punchy, throws long, hard shadows" },
    { id: "arri-m40", name: "ARRI M40 HMI", watts: "4000W", temp: "5600K", desc: "Massive output, large night exteriors" },
  ],
  led: [
    { id: "arri-skypanel-s60", name: "ARRI SkyPanel S60-C", watts: "450W", temp: "2800K-10000K", desc: "Soft, RGBW color mixing, silent" },
    { id: "aputure-600d", name: "Aputure LS 600d Pro", watts: "600W", temp: "5600K", desc: "HMI replacement, Bowens mount, affordable" },
    { id: "aputure-1200d", name: "Aputure LS 1200d Pro", watts: "1200W", temp: "5600K", desc: "Flagship output, replaces 1800W HMI" },
    { id: "amaran-200x", name: "Amaran 200x (Budget)", watts: "200W", temp: "2700K-6500K", desc: "Entry-level, lightweight" },
  ],
  tungsten: [
    { id: "arri-t2", name: "ARRI T2 Fresnel", watts: "2000W", temp: "3200K", desc: "Industry standard, warm skin tones" },
    { id: "kinoflo-4bank", name: "Kino Flo 4Bank", watts: "4x55W", temp: "3200K/5600K switchable", desc: "Soft, cool-running, interview standard" },
  ],
  practicals: [
    { id: "china-ball", name: "China Ball (Paper Lantern)", desc: "360° omnidirectional soft light, cheap, fast" },
    { id: "edison-bulb", name: "Edison Filament Bulbs", desc: "Visible filament, antique aesthetic, 2200K" },
    { id: "neon-sign", name: "Neon Signs", desc: "Colored light source, bar/club, cyberpunk" },
    { id: "candle", name: "Candle Light", desc: "1800K, flicker, romantic/period" },
  ],
  styles: [
    { id: "three-point", name: "Three-Point Lighting", desc: "Key, Fill, Back - classic, interview, clean" },
    { id: "rembrandt", name: "Rembrandt Lighting", desc: "45° key, triangle cheek, dramatic portrait" },
    { id: "high-key", name: "High-Key", desc: "Low contrast, bright, commercials, comedy" },
    { id: "low-key", name: "Low-Key", desc: "High contrast, shadows, drama, horror, noir" },
    { id: "chiaroscuro", name: "Chiaroscuro", desc: "Extreme contrast, Renaissance, artistic" },
    { id: "available-light", name: "Available Light Only", desc: "Documentary, naturalism, purist" },
  ],
} as const;

// ============================================================
// DIRECTOR / DP ANTHOLOGY
// ============================================================
export const DIRECTORS = {
  narrative: [
    { id: "fincher", name: "David Fincher", style: "Clinical precision, locked-off camera, muted palette", promptHints: "Fincher precision, clinical framing, moody atmosphere" },
    { id: "spielberg", name: "Steven Spielberg", style: "Classic Hollywood wonder, face light, emotional beats", promptHints: "Spielberg face, awe moments, Americana" },
    { id: "wes-anderson", name: "Wes Anderson", style: "Symmetry, pastel colors, planimetric composition", promptHints: "Wes Anderson symmetry, pastel color, centered framing" },
    { id: "nolan", name: "Christopher Nolan", style: "IMAX, practical effects, time manipulation", promptHints: "IMAX scale, practical ambition, epic scope" },
    { id: "villeneuve", name: "Denis Villeneuve", style: "Atmospheric epic, scope, volumetric lighting", promptHints: "Villeneuve atmosphere, wide shots, fog, volumetric" },
    { id: "peele", name: "Jordan Peele", style: "Social thriller, symbolism, genre subversion", promptHints: "social horror, symbolism, unsettling" },
    { id: "gerwig", name: "Greta Gerwig", style: "Warm feminine gaze, literary, pastel warmth", promptHints: "warm tones, feminine perspective, literary" },
    { id: "bong", name: "Bong Joon-ho", style: "Genre mixing, social commentary, precise blocking", promptHints: "genre mixing, social class, precise blocking" },
  ],
  musicVideo: [
    { id: "hype-williams", name: "Hype Williams", style: "Fisheye, vibrant colors, urban grandeur", promptHints: "Hype Williams fisheye, neon vibrance, urban scale" },
    { id: "jonze", name: "Spike Jonze", style: "Whimsical, surreal, practical effects, emotional", promptHints: "Jonze whimsy, practical surrealism, emotional core" },
    { id: "sophie-muller", name: "Sophie Muller", style: "Female gaze, intimate, fashion-forward", promptHints: "Sophie intimacy, fashion color, emotional close-up" },
    { id: "joseph-kahn", name: "Joseph Kahn", style: "High production, genre-mixing, pop culture", promptHints: "Kahn energy, pop gloss, dynamic movement" },
    { id: "corbijn", name: "Anton Corbijn", style: "Moody, desaturated, architectural, long takes", promptHints: "Corbijn mood, architectural framing, monochromatic" },
    { id: "lachapelle", name: "David LaChapelle", style: "Color saturation, surrealism, pop culture", promptHints: "LaChapelle saturation, surrealist pop, vibrant" },
  ],
  dps: [
    { id: "deakins", name: "Roger Deakins", style: "Naturalistic lighting, practical sources, painterly", promptHints: "Deakins lighting, practical sources, painterly wide" },
    { id: "chivo", name: "Emmanuel Lubezki", style: "Natural light, long takes, wide angles", promptHints: "Chivo naturalism, magic hour, fluid Steadicam" },
    { id: "willis", name: "Gordon Willis", style: "Low-key, underexposure, dramatic shadows", promptHints: "Willis shadows, low-key drama, classical noir" },
    { id: "doyle", name: "Christopher Doyle", style: "Handheld chaos, neon, saturated colors", promptHints: "Doyle kinetic, neon urban, handheld emotion" },
    { id: "fraser", name: "Greig Fraser", style: "Texture & volume, sand/atmosphere, digital-film hybrid", promptHints: "Fraser texture, atmospheric haze, sci-fi naturalism" },
    { id: "hoytema", name: "Hoyte van Hoytema", style: "Large format, IMAX, immersive, practical", promptHints: "IMAX scale, large format, immersive wide" },
  ],
} as const;

// ============================================================
// COLOR GRADING ANTHOLOGY
// ============================================================
export const GRADING = [
  { id: "teal-orange", name: "Teal & Orange", desc: "Complementary contrast, skin pop, blockbuster", promptHints: "teal and orange, blockbuster grade, action movie color" },
  { id: "bleach-bypass", name: "Bleach Bypass", desc: "High contrast, desaturated, metallic, gritty", promptHints: "bleach bypass, silver retention, high contrast, desaturated" },
  { id: "day-for-night", name: "Day for Night", desc: "Blue desaturation, underexposed, moonlight", promptHints: "day for night, blue moonlight, underexposed day" },
  { id: "cross-process", name: "Cross Processing", desc: "Shifted colors, contrast boost, fashion", promptHints: "cross process, X-Pro, shifted colors" },
  { id: "kodak-2383", name: "Kodak 2383 Print Emulation", desc: "Warm highlights, cyan shadows, standard cinema", promptHints: "2383 print, Kodak emulation, standard cinematic" },
  { id: "neo-noir", name: "Neo-Noir Neon", desc: "Magenta/cyan, crushed blacks, specular highlights", promptHints: "cyberpunk, neon noir, magenta cyan, Blade Runner" },
  { id: "vintage-fade", name: "Vintage Fade", desc: "Lifted blacks, reduced contrast, nostalgic", promptHints: "vintage fade, lifted blacks, nostalgic color" },
  { id: "bw-high-contrast", name: "B&W High Contrast", desc: "Deep blacks, bright whites, dramatic", promptHints: "high contrast B&W, noir, dramatic monochrome" },
  { id: "wes-anderson-palette", name: "Wes Anderson Palette", desc: "Pastels, yellows/pinks/baby blues, flat", promptHints: "Wes Anderson, pastel colors, symmetrical, milky blacks" },
  { id: "fincher-cold", name: "Fincher Cold/Clinical", desc: "Desaturated, green/blue tint, metallic", promptHints: "Fincher grade, cold, clinical, desaturated, green tint" },
  { id: "vaporwave", name: "Vaporwave/Synthwave", desc: "Pink shadows, cyan highlights, retro 80s", promptHints: "vaporwave, synthwave, retrowave, pink cyan gradient" },
  { id: "documentary-natural", name: "Documentary Natural (Rec709)", desc: "Accurate, minimal stylization", promptHints: "documentary color, natural, accurate, Rec709" },
] as const;

// ============================================================
// CINEMATIC PROMPT PRESETS
// ============================================================
export const CINEMATIC_PRESETS = {
  style: {
    cinematic: "cinematic, 35mm film grain, professional color grading, dramatic lighting",
    anime: "anime style, cel shading, vibrant colors, studio ghibli quality",
    noir: "film noir, high contrast, black and white, dramatic shadows, chiaroscuro",
    vintage: "vintage film, grainy, 1970s aesthetic, warm tones, faded colors",
    documentary: "documentary style, natural lighting, handheld, authentic",
  },
  camera: {
    closeup: "intimate close-up, shallow depth of field, bokeh background",
    medium: "medium shot, balanced composition, eye-level angle",
    wide: "wide establishing shot, epic scale, environmental context",
    dolly: "smooth dolly movement, parallax effect, cinematic motion",
    static: "locked-off tripod shot, stable frame, professional framing",
    aerial: "drone aerial shot, sweeping cinematic movement, epic scale",
    handheld: "handheld camera, subtle motion, documentary feel",
  },
  lighting: {
    noir: "high contrast noir lighting, deep shadows, dramatic chiaroscuro",
    golden: "golden hour lighting, warm tones, soft diffused sunlight",
    neon: "neon city lights, cyberpunk aesthetic, reflective surfaces",
    natural: "natural ambient lighting, realistic exposure, documentary style",
    dramatic: "dramatic lighting, single source, high contrast, moody",
  },
} as const;

// ============================================================
// GENRE TAGS
// ============================================================
export const GENRE_TAGS = [
  { id: "drama", label: "Drama" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "noir", label: "Film Noir" },
  { id: "romance", label: "Romance" },
  { id: "thriller", label: "Thriller" },
  { id: "documentary", label: "Documentary" },
  { id: "commercial", label: "Commercial" },
  { id: "music-video", label: "Music Video" },
  { id: "horror", label: "Horror" },
  { id: "comedy", label: "Comedy" },
  { id: "adventure", label: "Adventure" },
  { id: "experimental", label: "Experimental" },
] as const;
