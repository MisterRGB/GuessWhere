console.log(">>> script.js: File loaded, starting execution..."); // <<< ADDED VERY TOP LOG

const EARTH_RADIUS = 5;

// --- DOM Elements ---
const distanceElement = document.getElementById('distance');
const mapContainer = document.getElementById('map-container');
const guessButton = document.getElementById('guess-button');
const nextButton = document.getElementById('next-button');
const infoPanelElement = document.getElementById('info-panel');
const panelCountryName = document.getElementById('panel-country-name');
const panelCountryFacts = document.getElementById('panel-country-facts');
const cloudToggleCheckbox = document.getElementById('cloud-toggle');
const shadowToggleCheckbox = document.getElementById('shadow-toggle');
const fullscreenButton = document.getElementById('fullscreen-button'); // <<< ADD THIS
const leftPanelElement = document.getElementById('left-panel'); // <<< ADD Left Panel Element
const musicToggleCheckbox = document.getElementById('music-toggle'); // <<< ADD THIS
const startModal = document.getElementById('start-modal'); // <<< ADD
const startGameButton = document.getElementById('start-game-button'); // <<< ADD
console.log(">>> Top Level: startGameButton element check:", startGameButton); // <<< ADD LOG 1

// --- Game State & Data ---
let score = 0;
let currentCountry = null;
let countriesData = []; // Loaded from GeoJSON
let allCountryFacts = null; // <-- Variable to store loaded facts
let playerGuess = null;
let pinSprite = null;
let isDraggingPin = false;
let isGuessLocked = false;
let isLineAnimating = false;
let lineAnimationStartTime = 0;
let lineTotalPoints = 0;
let targetRings = []; // <-- Array to hold ring meshes
let targetRingClock = new THREE.Clock(); // <-- Clock for animation timing
let cloudMesh = null; // <-- Add variable for clouds
let currentDistanceLine = null;
let highlightedBoundaryLines = []; // <-- **** ENSURE THIS LINE EXISTS AND IS UNCOMMENTED ****
let selectedLocation = null; // { lat, lon }
let targetCountryCenterVector = new THREE.Vector3(); // <<< ADDED: Store calculated center of target country
let currentAnimationDuration = 2000; // Default, will be recalculated for line
const tempMatrix = new THREE.Matrix4();
let isCameraFollowing = false;
let initialCameraDistance = 0;
let surfacePoint = new THREE.Vector3();
let directionVector = new THREE.Vector3();
let targetCameraPosition = new THREE.Vector3();
const FINAL_ROTATION_BLEND_START = 0.75; // Start blending rotation at 75% glide progress
let quatLookAtTip = new THREE.Quaternion();
let quatLookAtDest = new THREE.Quaternion();
let blendedQuat = new THREE.Quaternion();
let currentRoundScore = 0;
let animatedScoreDisplayValue = 0;
let backgroundMusicStarted = false; // <<< ADDED FLAG
// let isScoreSoundPlaying = false; // <<< ADD THIS FLAG
let isStartingNextRound = false; // <<< ADD NEW FLAG
let showBoundaries = false; // <<< ADD: Variable to track boundary display choice
let globeInitialized = false; // Add a flag to track if the globe is initialized
let remainingCountries = []; // <<< ADD: List of countries for the current game session

// --- Three.js Variables ---
// Ensure 'globe' is declared here globally, and remove 'globeMesh' if it exists elsewhere
let scene, camera, renderer, globe, controls, raycaster, mouse;
// ... other global vars ...
let globeMaterial; // Add global reference for material if needed for updates
// let globeMesh; // <<< REMOVE THIS if it exists elsewhere
let sunLight = null; // <-- Declare DirectionalLight globally
let ambientLight = null; // <-- Declare AmbientLight globally
let currentLineCurve = null; // To store the curve path for the line/plane
const clock = new THREE.Clock();
let scoreSprite = null;     // <<< ADDED: Score Sprite
let scoreCanvas = null;       // <<< ADDED: Score Canvas Element
let scoreCanvasContext = null;// <<< ADDED: Score Canvas Context
let scoreTexture = null;    // <<< ADDED: Score Texture
// Add variables for distance text display
let distanceCanvas = null;
let distanceContext = null;
let distanceTexture = null;
let distanceTextSprite = null;
// <<< ADD: Variables for country label display >>>
let countryLabelCanvas = null;
let countryLabelContext = null;
let countryLabelTexture = null;
let countryLabelSprite = null;
// --- End Add ---
let lensflare = null; // <<< ADDED: Variable for lens flare
// --- MOVED Shooting Star Variables ---
let shootingStars = []; // Array to hold shooting star data ({mesh, velocity, active})
let shootingStarMaterial; // Shared material

// --- Constants ---
const MARKER_COLOR = 0xff0000; // Red
const MARKER_SIZE = 0.1;
const STAR_COUNT = 5000;
const STARFIELD_RADIUS = 500; // Make it much larger than the globe and camera distance
const PIN_SCALE_DEFAULT = 0.05;
const PIN_SCALE_HOVER = 0.06;
const PIN_SCALE_MOBILE = 0.08; // <-- New constant for mobile size
const PIN_IMAGE_PATH = 'assets/pin.svg';
const PIN_OFFSET = 0.05; // Offset for the base of the pin marker
// <<< ADD: Separate offset for target rings >>>
const TARGET_RING_SURFACE_OFFSET = 0.03; // <<< NEW: Smaller value (e.g., 0.03) to be closer to surface
const TARGET_RING_COLOR = 0x00ff00; // Green rings
const NUM_TARGET_RINGS = 4;       // How many rings in the pulse effect
const TARGET_RING_MAX_SCALE = 0.4; // Max size the rings expand to (adjust)
const TARGET_RING_THICKNESS = 0.01; // How thick the ring geometry is
const PULSE_DURATION = 1.5; // Seconds for one pulse cycle (expand/fade)
const TARGET_OFFSET = 0.06; // Keep offset from surface
const DISTANCE_LINE_OFFSET = 0.1; // <<< INCREASED Offset (e.g., from 0.03 to 0.1) {{ insert }}
const LINE_ANIMATION_SPEED = 4.0; // <<< ADDED: Speed for the line itself
const MIN_LINE_DURATION = 750;    // <<< ADDED: Min duration for line {{ insert }}
const MAX_LINE_DURATION = 5000;   // <<< ADDED: Max duration for line {{ insert }}
const TARGET_RING_COUNT = 5;
const PIN_MARKER_OFFSET = 0.005;
const CLOUD_ALTITUDE = 0.05;                   // <<< ADDED (Used in cloud geometry) {{ insert }}
const CLOUD_ROTATION_SPEED = 0.01;        // <<< RESTORED Constant Y Speed {{ insert }}
const CLOUD_X_OSCILLATION_AMPLITUDE = 0.03; // <<< ADDED: Max X rotation (radians) {{ insert }}
const CLOUD_X_OSCILLATION_FREQUENCY = 0.4; // <<< ADDED: Speed of X oscillation {{ insert }}
const CLOUD_TEXTURE_PATH = 'assets/4k_earth_clouds.jpg'; // <<< ADDED DEFINITION {{ insert }}
const SCORE_FONT_SIZE = 48; // Pixel size for canvas text
const SCORE_COLOR = '#ffffff'; // Bright green score text
const SCORE_CANVAS_WIDTH = 256; // Power of 2 often good, adjust as needed
const SCORE_CANVAS_HEIGHT = 128;
const SCORE_SPRITE_SCALE = 1.2; // <<< INCREASED Value (was 0.3) {{ modify }}
const SCORE_OFFSET_ABOVE_LINE = 0.1; // Base offset from the line tip
const SCORE_ANIMATION_MAX_HEIGHT = 0.5; // How high the score animates upwards
const AIRPLANE_SPEED = 4.0;         // <<< ADDED: World units per second
// --- MOVED Shooting Star Constants ---
const NUM_SHOOTING_STARS = 15; // How many potential shooting stars in the pool
const SHOOTING_STAR_SPEED = 150; // Speed of the stars (units per second)
const SHOOTING_STAR_LENGTH = 2; // Length of the star streak
const SHOOTING_STAR_SPAWN_RADIUS = STARFIELD_RADIUS * 1.1; // Radius where stars spawn
const SHOOTING_STAR_DESPAWN_RADIUS_SQ = (STARFIELD_RADIUS * 1.3) ** 2; // Squared radius for despawn check
const SHOOTING_STAR_SPAWN_CHANCE = 0.003; // Chance per frame to spawn a star
// <<< ADD: Constants for Country Label >>>
const COUNTRY_LABEL_OFFSET = 0.2;      // <<< INCREASED (e.g., from 0.3) to position higher
const COUNTRY_LABEL_FONT_SIZE = 56;    // <<< INCREASED (e.g., from 36) for bigger text
const COUNTRY_LABEL_COLOR = '#ffffff';   // White text
const COUNTRY_LABEL_CANVAS_WIDTH = 512;  // <<< INCREASED (e.g., from 384) for wider text space
const COUNTRY_LABEL_CANVAS_HEIGHT = 96; // <<< INCREASED (e.g., from 64) for taller text space
const COUNTRY_LABEL_SPRITE_SCALE = 1.8;  // <<< INCREASED (e.g., from 1.0) for larger overall sprite
const COUNTRY_LABEL_SPRITE_SCALE_MOBILE = 2.4; // <<< NEW: Larger scale for mobile
// --- End Add ---

// --- PIN CONSTANTS (Ensure these are here and defined) ---
const PIN_COLOR_DEFAULT = new THREE.Color(0xff0000);
const PIN_COLOR_HOVER = new THREE.Color(0xffa500);

// --- DEFINE SHARED COLOR FIRST ---
const LINE_AND_TARGET_COLOR = 0xffff00; // Yellow

// --- GraphQL API Interaction ---
const GRAPHQL_ENDPOINT = 'https://countries-274616.ew.r.appspot.com'; // From graphcountries README

// --- Alpha-3 to Alpha-2 Code Mapping --- <<< MOVED TO GLOBAL SCOPE
const alpha3ToAlpha2 = { AFG: 'AF', ALB: 'AL', DZA: 'DZ', ASM: 'AS', AND: 'AD', AGO: 'AO', AIA: 'AI', ATA: 'AQ', ATG: 'AG', ARG: 'AR', ARM: 'AM', ABW: 'AW', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BMU: 'BM', BTN: 'BT', BOL: 'BO', BES: 'BQ', BIH: 'BA', BWA: 'BW', BVT: 'BV', BRA: 'BR', IOT: 'IO', BRN: 'BN', BGR: 'BG', BFA: 'BF', BDI: 'BI', CPV: 'CV', KHM: 'KH', CMR: 'CM', CAN: 'CA', CYM: 'KY', CAF: 'CF', TCD: 'TD', CHL: 'CL', CHN: 'CN', CXR: 'CX', CCK: 'CC', COL: 'CO', COM: 'KM', COD: 'CD', COG: 'CG', COK: 'CK', CRI: 'CR', CIV: "CI", HRV: 'HR', CUB: 'CU', CUW: 'CW', CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO', ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', SWZ: 'SZ', ETH: 'ET', FLK: 'FK', FRO: 'FO', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GUF: 'GF', PYF: 'PF', ATF: 'TF', GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH', GIB: 'GI', GRC: 'GR', GRL: 'GL', GRD: 'GD', GLP: 'GP', GUM: 'GU', GTM: 'GT', GGY: 'GG', GIN: 'GN', GNB: 'GW', GUY: 'GY', HTI: 'HT', HMD: 'HM', VAT: 'VA', HND: 'HN', HKG: 'HK', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE', IMN: 'IM', ISR: 'IL', ITA: 'IT', JAM: 'JM', JPN: 'JP', JEY: 'JE', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', KIR: 'KI', PRK: 'KP', KOR: 'KR', KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MAC: 'MO', MKD: 'MK', MDG: 'MG', MWI: 'MW', MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT', MHL: 'MH', MTQ: 'MQ', MRT: 'MR', MUS: 'MU', MYT: 'YT', MEX: 'MX', FSM: 'FM', MDA: 'MD', MCO: 'MC', MNG: 'MN', MNE: 'ME', MSR: 'MS', MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL', NCL: 'NC', NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', NIU: 'NU', NFK: 'NF', MNP: 'MP', NOR: 'NO', OMN: 'OM', PAK: 'PK', PLW: 'PW', PSE: 'PS', PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', PCN: 'PN', POL: 'PL', PRT: 'PT', PRI: 'PR', QAT: 'QA', REU: 'RE', ROU: 'RO', RUS: 'RU', RWA: 'RW', BLM: 'BL', SHN: 'SH', KNA: 'KN', LCA: 'LC', MAF: 'MF', SPM: 'PM', VCT: 'VC', WSM: 'WS', SMR: 'SM', STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL', SGP: 'SG', SXM: 'SX', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA', SGS: 'GS', SSD: 'SS', ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR', SJM: 'SJ', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW', TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG', TKL: 'TK', TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', TCA: 'TC', TUV: 'TV', UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US', UMI: 'UM', URY: 'UY', UZB: 'UZ', VUT: 'VU', VEN: 'VE', VNM: 'VN', VGB: 'VG', VIR: 'VI', WLF: 'WF', ESH: 'EH', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW', ALA: 'AX' };

// --- NEW Helper Function for Pin Scale ---
function getPinScale() {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? PIN_SCALE_MOBILE : PIN_SCALE_DEFAULT;
}

async function fetchCountryDataGraphQL(countryName) {
    console.log(`Fetching data from graphcountries for: ${countryName}`);

    // GraphQL query string. Requesting various fields.
    // Using filter 'name_contains' for flexibility, limit to 1 result.
    const query = `
        query GetCountryInfo($name: String!) {
          Country(filter: { name_contains: $name }, first: 1) {
            name
            nativeName
            alpha2Code # Useful for flags potentially
            capital
            population
            area
            region { name }
            subregion { name }
            officialLanguages { name }
            currencies { name symbol }
            timezones { name offset }
            flag { emoji }
          }
        }
    `;

    // Variables for the query
    const variables = { name: countryName };

    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, variables: variables }),
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }

        const result = await response.json();

        // Check for GraphQL specific errors
        if (result.errors) {
            console.error('GraphQL Errors:', result.errors);
            throw new Error(`GraphQL query failed: ${result.errors[0]?.message || 'Unknown GraphQL error'}`);
        }

        // Extract the country data (it's inside an array)
        if (result.data && result.data.Country && result.data.Country.length > 0) {
            return result.data.Country[0]; // Return the first matching country object
        } else {
            console.warn(`No country data found in response for: ${countryName}`, result);
            return null; // Indicate no data found
        }

    } catch (error) {
        console.error("Error fetching country data:", error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// --- 3D Map Setup ---
function initMap() {
    console.log("Initializing 3D map with Three.js...");

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, mapContainer.clientWidth / mapContainer.clientHeight, 0.1, STARFIELD_RADIUS * 1.5);
    camera.position.z = 10;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mapContainer.clientWidth, mapContainer.clientHeight);
    renderer.shadowMap.enabled = shadowToggleCheckbox.checked;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mapContainer.appendChild(renderer.domElement);

    // --- Starfield Background ---
    const starVertices = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        // Generate random point on the surface of a sphere
        const theta = THREE.MathUtils.randFloatSpread(360); // Longitude (-180 to 180)
        const phi = THREE.MathUtils.randFloatSpread(180); // Latitude (-90 to 90)

        const x = STARFIELD_RADIUS * Math.sin(theta * Math.PI / 180) * Math.cos(phi * Math.PI / 180);
        const y = STARFIELD_RADIUS * Math.sin(phi * Math.PI / 180);
        const z = STARFIELD_RADIUS * Math.cos(theta * Math.PI / 180) * Math.cos(phi * Math.PI / 180);

        starVertices.push(x, y, z);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff, // White stars
        size: 0.5,      // Adjust size as needed
        sizeAttenuation: true // Points farther away appear smaller
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- Lighting Setup ---
    const initialShadowState = shadowToggleCheckbox.checked;
    const initialAmbientIntensity = initialShadowState ? 0.9 : 1.2;
    const initialSunIntensity = 0.9;

    ambientLight = new THREE.AmbientLight(0xffffff, initialAmbientIntensity);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, initialSunIntensity);
    sunLight.position.set(500, 300, 500);
    sunLight.castShadow = true;

    // --- Move Light Source Much Further Away ---
    // sunLight.position.set(5 * 100, 3 * 100, 5 * 100); // Set position much further out (e.g., 500, 300, 500)
    // sunLight.position.normalize(); // No need to normalize directional light position for direction only
    // --- End Move ---

    // --- Shadow Config (keep this) ---
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;

    // --- Force Add Light (Keep unconditional add for now) ---
        scene.add(sunLight);
    console.log(">>> DEBUG: Unconditionally added sunLight to scene.");
    sunLight.updateMatrixWorld();
    const worldPos = new THREE.Vector3();
    sunLight.getWorldPosition(worldPos);
    console.log(">>> DEBUG: sunLight world position (now much further):", worldPos);
    // --- End Force Add Light ---

    // --- Lens Flare (keep as is) ---
    console.log("Creating lens flare...");
    const textureLoaderFlare = new THREE.TextureLoader();
    const textureFlare0 = textureLoaderFlare.load('assets/lensflare0.png', /*...*/ );
    const textureFlare3 = textureLoaderFlare.load('assets/lensflare3.png', /*...*/ );

    lensflare = new THREE.Lensflare();
    // Adjust main flare size as needed
    lensflare.addElement(new THREE.LensflareElement(textureFlare0, 350, 0, sunLight.color));
    // Secondary elements
    lensflare.addElement(new THREE.LensflareElement(textureFlare3, 60, 0.1));
    lensflare.addElement(new THREE.LensflareElement(textureFlare3, 80, 0.3));
    lensflare.addElement(new THREE.LensflareElement(textureFlare3, 120, 0.5));
    lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 0.7));
    lensflare.addElement(new THREE.LensflareElement(textureFlare3, 90, 0.85));
    lensflare.addElement(new THREE.LensflareElement(textureFlare3, 50, 1.0));

    sunLight.add(lensflare); // Add flare as child
    console.log("Lens flare added to sunLight.");
    // --- End Lens Flare ---

    // Globe Geometry
    const globeGeometry = new THREE.SphereGeometry(
        EARTH_RADIUS,
        256, // Increased segments
        256  // Increased segments
    );
    console.log(`Globe geometry created with ${globeGeometry.parameters.widthSegments}x${globeGeometry.parameters.heightSegments} segments.`);

    // --- Texture Loading ---
    const textureLoader = new THREE.TextureLoader();
    const textureFile = showBoundaries ? 'assets/world_texture_boundaries.jpg' : 'assets/world_texture_2.jpg';
    console.log(`>>> initMap: Loading initial globe texture: ${textureFile} (boundaries: ${showBoundaries})`);

    const texture = textureLoader.load(textureFile);
    const normalTexture = textureLoader.load('assets/world_texture_2normal.png');
    const roughnessTexture = textureLoader.load('assets/world_texture_2specular.png');
    const displacementTexture = textureLoader.load(
        'assets/earth_displacement.png',
        () => { console.log("Initial displacement map texture loaded successfully."); },
        undefined,
        (err) => { console.error('Error loading initial displacement map texture:', err); }
    );

    // --- Globe Material ---
    // Assign to global material variable
    globeMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture,
        displacementMap: displacementTexture,
        displacementScale: 0.1, // <<< REDUCED value (was 0.2)
    });

    // --- Globe Mesh ---
    // Use the global 'globe' variable
    globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.receiveShadow = true;
    scene.add(globe); // Add the single, global globe object
    console.log(">>> initMap: Initial globe mesh created and added to scene.");

    // --- Cloud Layer ---
    console.log("Creating cloud layer...");
    try {
        const cloudTexture = new THREE.TextureLoader().load(
            CLOUD_TEXTURE_PATH, // <<< PROBLEM: CLOUD_TEXTURE_PATH is not defined anywhere!
             () => { console.log("Cloud texture loaded successfully."); },
             undefined,
             (err) => { console.error("Error loading cloud texture:", err); } // This error likely fired
        );

        const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS + CLOUD_ALTITUDE, 64, 64);

        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.2, // <-- Set to 50% of the previous value (e.g., 0.4 * 0.5 = 0.2)
            depthWrite: false
        });

        cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        // --- Clouds Receive Shadows ---
        cloudMesh.receiveShadow = true; // Clouds can always receive shadows if enabled
        // --- Clouds Can Cast Shadows (optional, can be expensive) ---
        // cloudMesh.castShadow = true;
        cloudMesh.visible = cloudToggleCheckbox.checked;
        cloudMesh.renderOrder = 2; // <<< SET RENDER ORDER FOR CLOUD
        scene.add(cloudMesh);
        console.log(`Cloud layer added. Initial visibility: ${cloudMesh.visible}`);
    } catch (error) {
        console.error("Failed to create cloud layer:", error); // This might not catch the texture load error
    }
    // --- End Cloud Layer ---

    // --- RE-ENABLE Atmospheric Edge Glow ---
    // Ensure the entire block creating and adding atmosphereMesh is commented out or deleted
    /*
    const glowColor = new THREE.Color(0x90c8ff); // Light sky blue color
    const atmosphereSizeFactor = 1.03; // How much larger than Earth
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * atmosphereSizeFactor, 64, 64);

    const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: glowColor },
            // Tweak power for Fresnel effect (controls thickness/falloff)
            // Higher power = thinner, sharper glow; Lower power = thicker, softer glow
            power: { value: 2.8 }, // <<< ADJUST: Try values between 2.0 and 4.0
            // Tweak overall intensity/alpha multiplier
            intensity: { value: 0.6 } // <<< ADJUST: Try values between 0.4 and 0.8
        },
        vertexShader: `
            varying float vIntensity;
            uniform float power; // Added uniform
            void main() {
                vec3 worldPosition = (modelMatrix * vec4( position, 1.0 )).xyz;
                vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
                vec3 viewDirection = normalize(cameraPosition - worldPosition); // Renamed from I for clarity
                // Use abs() and clamp to prevent issues at grazing angles
                vIntensity = pow( clamp(1.0 - abs(dot(worldNormal, viewDirection)), 0.0, 1.0), power );
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 );
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            uniform float intensity; // Added uniform
            varying float vIntensity;
            void main() {
                // Use the varying intensity calculated in vertex shader
                float alpha = max(0.0, vIntensity) * intensity; // Use intensity uniform
                gl_FragColor = vec4( glowColor, alpha );
            }
        `,
        side: THREE.BackSide, // Render the inside facing surface
        blending: THREE.AdditiveBlending, // Good for glows
        transparent: true,
        depthWrite: false // Don't obscure objects behind it
    });

    // --- Declare atmosphereMesh if not already declared globally ---
    let atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial); // Assign to variable
    scene.add(atmosphereMesh);
    console.log("Added atmospheric edge glow mesh.");
    */
    // --- End Atmospheric Edge Glow Removal ---

    // --- OrbitControls Setup ---
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Enable damping for smoother movement
    controls.dampingFactor = 0.05; // Adjust damping strength
    controls.rotateSpeed = 0.4; // Adjust rotation speed
    controls.panSpeed = 0.2; // Adjust panning speed
    controls.enableZoom = true; // Enable zooming
    controls.minDistance = EARTH_RADIUS + 0.5; // Prevent zooming inside the Earth
    controls.maxDistance = EARTH_RADIUS * 5; // Limit zoom distance
    controls.enablePan = true; // Enable panning
    controls.zoomSpeed = 1.2; // Adjust zoom speed
    controls.target.set(0, 0, 0); // Set the point to orbit around
    controls.update();

    // --- Disable vertical rotation below the horizon ---
    controls.minPolarAngle = Math.PI * 0.1; // radians (0 is straight down)
    controls.maxPolarAngle = Math.PI * 0.9; // radians (Math.PI/2 is straight up)

    // --- Disable horizontal panning beyond a certain limit ---
    controls.minAzimuthAngle = - Infinity; // radians
    controls.maxAzimuthAngle = Infinity; // radians

    // --- Add Event Listener for Zoom Ending ---
    controls.addEventListener('change', () => {
        // Optional: Add logic here to do something when the camera changes
        // For example, you could update a UI element with the current zoom level
    });

    // --- End OrbitControls Setup ---

    // Raycaster for click detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event Listeners
    mapContainer.addEventListener('pointerdown', onPointerDown, false);
    mapContainer.addEventListener('pointermove', onPointerMove, false);
    mapContainer.addEventListener('pointerup', onPointerUp, false);
    mapContainer.addEventListener('pointerleave', onPointerUp, false);
    window.addEventListener('resize', onWindowResize); // Handle window resize

    // Start animation loop
    animate();

    console.log("Map initialized.");

    // --- Country Label Sprite ---
    countryLabelCanvas = document.createElement('canvas');
    // ... (set canvas size, get context) ...
    countryLabelTexture = new THREE.CanvasTexture(countryLabelCanvas);
    const countryLabelMaterial = new THREE.SpriteMaterial({
        map: countryLabelTexture,
        transparent: true,
        depthTest: false // <<< ADD THIS
    });
    countryLabelSprite = new THREE.Sprite(countryLabelMaterial);
    countryLabelSprite.scale.set(1.5, 0.75, 1.0);
    countryLabelSprite.position.set(0, EARTH_RADIUS + 0.5, 0);
    countryLabelSprite.visible = false;
    // countryLabelSprite.renderOrder = 4; // <<< REMOVE THIS
    scene.add(countryLabelSprite);

    // --- Score Sprite ---
    scoreCanvas = document.createElement('canvas');
    // ... (set canvas size, get context) ...
    scoreTexture = new THREE.CanvasTexture(scoreCanvas);
    const scoreMaterial = new THREE.SpriteMaterial({
        map: scoreTexture,
        transparent: true,
        depthTest: false // <<< ADD THIS
    });
    scoreSprite = new THREE.Sprite(scoreMaterial);
    scoreSprite.scale.set(0.5, 0.25, 1.0);
    scoreSprite.visible = false;
    // scoreSprite.renderOrder = 5; // <<< REMOVE THIS
    scene.add(scoreSprite);

   

    
    // Add error handling to texture loading
    textureLoader.load(
        textureFile,
        // Success callback
        function(texture) {
            console.log(`>>> Texture loaded successfully: ${textureFile}`);
            // Continue with the texture setup
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                // ... other material properties
            });
            
            // Create the globe mesh
            const globe = new THREE.Mesh(globeGeometry, material);
            // ... rest of globe setup
            
            scene.add(globe);
        },
        // Progress callback
        function(xhr) {
            console.log(`>>> Texture loading: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        // Error callback
        function(error) {
            console.error(`>>> ERROR loading texture ${textureFile}:`, error);
            // Fallback to a default texture if available
            console.log(">>> Attempting to load fallback texture: assets/world_texture_2.jpg");
            textureLoader.load(
                'assets/world_texture_2.jpg',
                function(fallbackTexture) {
                    // Use fallback texture
                    // ... similar setup as above
                }
            );
        }
    );
}

function onWindowResize() {
    camera.aspect = mapContainer.clientWidth / mapContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mapContainer.clientWidth, mapContainer.clientHeight);
}

// --- Helper function to calculate required distance ---
// (Define it AFTER constants but BEFORE it's used in animate)
function calculateCameraDistanceForRadius(targetRadius, cameraFovRadians) {
    const halfFov = cameraFovRadians / 2;
    if (Math.tan(halfFov) < 0.0001) return targetRadius * 10;
    const distance = targetRadius / Math.tan(halfFov);
    return distance * 1.2;
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    const now = performance.now();

    // --- Animate Target Rings (Pulsing Effect) ---
    if (targetRings.length > 0) {
        const pulseElapsedTime = targetRingClock.getElapsedTime();

        targetRings.forEach((ring, index) => {
            // Stagger the animation start time for each ring
            const delay = (index / NUM_TARGET_RINGS) * PULSE_DURATION * 0.5; // Adjust multiplier for overlap
            const ringElapsedTime = Math.max(0, pulseElapsedTime - delay);
            const progress = (ringElapsedTime % PULSE_DURATION) / PULSE_DURATION; // Loop progress 0 to 1

            // Ease-out scaling (starts fast, slows down)
            const easedScaleProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            const currentScale = easedScaleProgress; // Scale directly from 0 to 1 (relative to max size)

            // Fade out opacity (linear fade)
            const currentOpacity = 1.0 - progress;

            ring.scale.set(currentScale, currentScale, currentScale);
            ring.material.opacity = Math.max(0, currentOpacity); // Ensure opacity doesn't go negative
            ring.material.needsUpdate = true; // Necessary for opacity changes
        });
    }
    // --- End Target Ring Animation ---

    if (cloudMesh) {
        cloudMesh.rotation.x = Math.sin(elapsedTime * CLOUD_X_OSCILLATION_FREQUENCY) * CLOUD_X_OSCILLATION_AMPLITUDE;
        cloudMesh.rotation.y += CLOUD_ROTATION_SPEED * deltaTime;
    }

    // --- Camera Logic ---
    if (isCameraFollowing && currentLineCurve && isLineAnimating) {
        const lineElapsedTime = now - lineAnimationStartTime;
        const progress = Math.min(lineElapsedTime / currentAnimationDuration, 0.9999);
        const currentCurvePos = currentLineCurve.getPointAt(progress);

        // Position Update (maintaining distance)
        surfacePoint.copy(currentCurvePos).normalize().multiplyScalar(EARTH_RADIUS);
        directionVector.copy(surfacePoint).normalize();
        targetCameraPosition.copy(directionVector).multiplyScalar(initialCameraDistance);

        // --- Smooth camera position update ---
        const lerpFactor = 0.08; // Keep or adjust this value (e.g., 0.05 for smoother)
        const proposedPosition = camera.position.clone().lerp(targetCameraPosition, lerpFactor);

        // Collision Prevention (remains the same)
        const proposedDistance = proposedPosition.length();
        const minGlideDistance = EARTH_RADIUS + 0.5;
        if (proposedDistance < minGlideDistance) {
            proposedPosition.normalize().multiplyScalar(minGlideDistance);
            // console.log("Camera glide position clamped to min distance.");
        }
        camera.position.copy(proposedPosition);
        // --- End Smooth camera position update ---


        // Rotation Logic (remains the same: blending lookAt)
        if (progress < FINAL_ROTATION_BLEND_START) {
            camera.lookAt(currentCurvePos);
        } else {
            // ... (blended quaternion logic using quatLookAtTip, quatLookAtDest) ...
            const rotationBlend = Math.max(0, Math.min(1, (progress - FINAL_ROTATION_BLEND_START) / (1.0 - FINAL_ROTATION_BLEND_START)));
            const easedBlend = 0.5 - 0.5 * Math.cos(rotationBlend * Math.PI);

            tempMatrix.lookAt(camera.position, currentCurvePos, camera.up);
            quatLookAtTip.setFromRotationMatrix(tempMatrix);

            tempMatrix.lookAt(camera.position, targetCountryCenterVector, camera.up);
            quatLookAtDest.setFromRotationMatrix(tempMatrix);

            blendedQuat.slerpQuaternions(quatLookAtTip, quatLookAtDest, easedBlend);
            camera.quaternion.copy(blendedQuat);
        }

        // --- REMOVE OR COMMENT OUT continuous target update ---
        // controls.target.copy(currentCurvePos); // <<< DELETE OR COMMENT OUT THIS LINE
        // ----------------------------------------------------

        // --- DO NOT CALL controls.update() here ---

    } else if (controls.enabled) {
        // Update controls ONLY when not gliding and they are enabled
        controls.update();
    }
    // --- End Camera Logic ---

    // --- Shooting Star Logic ---
    // Attempt to spawn a new star
    if (Math.random() < SHOOTING_STAR_SPAWN_CHANCE) { // <<< NO LONGER AN ERROR
        const inactiveStar = shootingStars.find(s => !s.active);
        if (inactiveStar) {
            // Activate and position the star
            inactiveStar.active = true;
            inactiveStar.mesh.visible = true;

            // Random position on spawn sphere surface
            const theta = Math.random() * Math.PI * 2; // Random angle
            const phi = Math.acos(2 * Math.random() - 1); // Random angle for uniform sphere distribution
            inactiveStar.mesh.position.setFromSphericalCoords(SHOOTING_STAR_SPAWN_RADIUS, phi, theta);

            // Random velocity direction (mostly towards opposite side of origin)
            const targetPos = inactiveStar.mesh.position.clone()
                .multiplyScalar(-1) // Target opposite side
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * STARFIELD_RADIUS * 0.5, // Add some randomness
                    (Math.random() - 0.5) * STARFIELD_RADIUS * 0.5,
                    (Math.random() - 0.5) * STARFIELD_RADIUS * 0.5
                ));
            inactiveStar.velocity.subVectors(targetPos, inactiveStar.mesh.position)
                .normalize()
                .multiplyScalar(SHOOTING_STAR_SPEED + (Math.random() - 0.5) * SHOOTING_STAR_SPEED * 0.5); // Add speed variation

            // Orient the line segment to follow velocity
            inactiveStar.mesh.lookAt(inactiveStar.mesh.position.clone().add(inactiveStar.velocity));
        }
    }

    // Update active stars
    shootingStars.forEach(star => {
        if (star.active) {
            star.mesh.position.addScaledVector(star.velocity, deltaTime);

            // Check if star is too far away
            if (star.mesh.position.lengthSq() > SHOOTING_STAR_DESPAWN_RADIUS_SQ) {
                star.active = false;
                star.mesh.visible = false;
            }
        }
    });
    // --- End Shooting Star Logic ---

    if (isLineAnimating) {
        const now = performance.now(); // Ensure 'now' is defined if used here
        const lineElapsedTime = now - lineAnimationStartTime;
        const progress = Math.min(lineElapsedTime / currentAnimationDuration, 1.0);

        if (currentDistanceLine) {
        const pointsToDraw = Math.ceil(lineTotalPoints * progress);
        const verticesToDraw = Math.max(0, pointsToDraw);
        currentDistanceLine.geometry.setDrawRange(0, verticesToDraw);
        }

        // --- Score Sprite Animation ---
        if (scoreSprite && currentLineCurve) {
            if (progress < 1.0) { // Only animate while line is moving
                const currentCurvePos = currentLineCurve.getPointAt(progress);
                const surfaceNormal = currentCurvePos.clone().normalize();
                const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                const upOffset = easedProgress * SCORE_ANIMATION_MAX_HEIGHT;
                const scoreSpritePosition = currentCurvePos.clone()
                    .addScaledVector(surfaceNormal, SCORE_OFFSET_ABOVE_LINE + upOffset);

                const targetScore = progress * currentRoundScore;
                animatedScoreDisplayValue = THREE.MathUtils.lerp(animatedScoreDisplayValue, targetScore, 0.08);

                scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
                scoreCanvasContext.fillText(`+${Math.round(animatedScoreDisplayValue)}`, scoreCanvas.width / 2, scoreCanvas.height / 2);
                scoreTexture.needsUpdate = true;

                scoreSprite.position.copy(scoreSpritePosition);
                scoreSprite.visible = true;

            } else { // progress >= 1.0 (final frame drawing)
                 if (scoreSprite.visible) {
                     scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
                     scoreCanvasContext.fillText(`+${currentRoundScore}`, scoreCanvas.width / 2, scoreCanvas.height / 2);
                     scoreTexture.needsUpdate = true;
                 }
            }
        }
        // --- End Score Sprite Animation ---

            // --- Animation End Handling ---
        if (progress >= 1.0) {
            isLineAnimating = false;
            stopSound('travelLine');
            if (scoreSprite) setTimeout(() => { scoreSprite.visible = false; }, 100); // Hide score slightly after
            console.log("Line animation finished.");
            const isMobile = window.innerWidth <= 768;

            if (isCameraFollowing) {
                isCameraFollowing = false; // Stop glide

                // Set final camera position (remains the same)
                directionVector.copy(targetCountryCenterVector).normalize();
                let finalDistance = isMobile ? MOBILE_FINAL_ZOOM : Math.max(initialCameraDistance, EARTH_RADIUS + 0.5);
                targetCameraPosition.copy(directionVector).multiplyScalar(finalDistance);
                camera.position.copy(targetCameraPosition);

                // Final lookAt
                camera.lookAt(targetCountryCenterVector);
                console.log("Camera glide finished and final position/rotation set.");

                controls.enabled = true;
                // --- Set final controls target HERE ---
                controls.target.copy(targetCountryCenterVector); // <<< ENSURE THIS IS SET
                // --- Set final min distance (remains the same) ---
                controls.minDistance = isMobile ? MOBILE_MIN_DISTANCE_AFTER_GUESS : EARTH_RADIUS + 0.2;
                // --- Call update ONCE after setting final state ---
                controls.update(); // <<< ENSURE THIS IS CALLED
                console.log(`Controls enabled, target set, final camera pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}), minDistance set to ${controls.minDistance.toFixed(2)}`);

             } else { // Camera wasn't following
                 // ... (set controls enabled, target, min distance, update) ...
                 controls.enabled = true;
                 controls.target.copy(targetCountryCenterVector);
                 controls.minDistance = isMobile ? MOBILE_MIN_DISTANCE_AFTER_GUESS : EARTH_RADIUS + 0.2;
                 controls.update();
                 console.log("Animation finished, camera wasn't following. Controls updated.");
             }

             // --- ADD/RESTORE COUNTRY LABEL DISPLAY ---
             if (currentCountry && targetCountryCenterVector && updateCountryLabel) {
                 console.log(">>> animate (end): Calling updateCountryLabel for:", currentCountry.name);
                 updateCountryLabel(currentCountry.name, targetCountryCenterVector); // <<< ADD THIS CALL
             } else {
                 console.warn(">>> animate (end): Could not update country label (missing data or function).");
             }
             // --- END ADD/RESTORE ---

             // --- Show target rings (already exists) ---
             createTargetRings();
             console.log(">>> animate (end): createTargetRings called.");

             // --- Show Info Panel (already exists, handled by handleGuessConfirm setting .visible class) ---
             if (infoPanelElement && !infoPanelElement.classList.contains('visible')) {
                // Redundant check, but safe. handleGuessConfirm should add .visible
                console.warn(">>> animate (end): Info panel element exists but lacks 'visible' class.");
             }


            // --- Enable Next Button ---
            if (nextButton) {
                nextButton.disabled = false;
                // nextButton.style.display = 'block'; // display: block is likely handled elsewhere now
                console.log(`animate (end): nextButton.disabled explicitly set to ${nextButton.disabled}`); // <<< ADD/MODIFY THIS LOG
            } else {
                 console.warn("animate (end): nextButton not found to enable.");
            }
            // -------------------------
        } // End if (progress >= 1.0)
    } // End if (isLineAnimating)

    // The animate function loop continues here, rendering the scene
    renderer.render(scene, camera);

} // <<< Closing brace for animate() function

// --- Function to load country boundary data ---
// This function should now be able to access the global alpha3ToAlpha2 map
async function loadCountryData() {
    console.log("Loading country shapes data from GeoJSON...");
    try {
        const response = await fetch('assets/countries.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const geojsonData = await response.json();

        if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
             throw new Error("GeoJSON data is invalid or empty.");
        }

        // Process features: Combine properties and geometry, ADD alpha2Code
        let firstFeatureLogged = false;
        countriesData = geojsonData.features.map(feature => {
             if (!feature.properties || !feature.geometry || !feature.id) {
                 console.warn("Skipping feature with missing properties, geometry, or id:", feature);
                 return null;
             }

             // <<< ADD alpha2Code based on mapping the feature's ID >>>
             const alpha3 = feature.id.toUpperCase();
             const alpha2 = alpha3ToAlpha2[alpha3]; // <<< Accessing global map

             if (!alpha2) {
                 console.warn(`>>> loadCountryData: No alpha-2 code found in mapping for alpha-3: ${alpha3}`);
             }
             // <<< END Add alpha2Code >>>

             if (!firstFeatureLogged) {
                 console.log(">>> loadCountryData: Properties of first GeoJSON feature:", feature.properties, "ID:", feature.id, "Mapped Alpha2:", alpha2);
                 firstFeatureLogged = true;
             }

             return {
                 ...feature.properties,
                 geometry: feature.geometry,
                 alpha2Code: alpha2 || null // Add the mapped code
             };
        }).filter(country => country !== null);

        console.log(`Successfully loaded and processed ${countriesData.length} countries.`);

        if (countriesData.length > 0) {
            console.log("Sample loaded country data (first):", countriesData[0].name, "alpha2Code:", countriesData[0].alpha2Code);
        }

    } catch (error) {
        console.error("Failed to load or parse country shapes data:", error); // Log the actual error
        // const countryNameElement = document.getElementById('country-name'); // <<< Must be deleted or commented out
         if (guessButton) guessButton.disabled = true;
         if (nextButton) nextButton.disabled = true;
    }
}
// --- End Function ---

// --- NEW Function to load facts ---
async function loadFactsData() {
    console.log("Loading facts data from facts.json...");
    try {
        const response = await fetch('assets/facts.json'); // Fetch the local file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allCountryFacts = await response.json(); // Parse and store the JSON object
        console.log("Facts data loaded successfully.");
    } catch (error) {
        console.error("Failed to load or parse facts data:", error);
        allCountryFacts = {}; // Assign empty object on failure to prevent errors later
        // Optionally display an error to the user in the UI
    }
}

// --- Helper function to convert polygon coordinates to 3D points ---
function getPolygonPoints3D(polygonCoords, offset) {
    const points3D = [];
    // polygonCoords is an array of [lon, lat] pairs
    for (const coord of polygonCoords) {
        const lon = coord[0];
        const lat = coord[1];
        if (typeof lon === 'number' && typeof lat === 'number') {
            points3D.push(getPointFromLatLon(lat, lon).normalize().multiplyScalar(EARTH_RADIUS + offset));
        } else {
            console.warn("Skipping invalid coordinate in polygon:", coord);
        }
    }
    return points3D;
}

// --- Function to highlight country boundaries ---
// REMOVED isCorrect parameter
function highlightCountryBoundary(countryGeometry) {
    console.log(`[highlightCountryBoundary] START.`); // Log start

    if (!countryGeometry) {
        console.warn("[highlightCountryBoundary] Cannot highlight boundary: Geometry data missing.");
        return;
    }
    
    // --- DO NOT REMOVE HIGHLIGHTS HERE ANYMORE ---
    // removeHighlightedBoundaries(); // <<< COMMENTED OUT or REMOVED

    const boundaryOffset = 0.05; 
    
    // --- SET COLORS TO YELLOW ---
    const fillColor = 0xFFFF00; // Yellow
    const lineColor = 0xFFFF00; // Yellow
    // --------------------------

    // --- REMOVED LOG: No longer needed ---
    // console.log(`[highlightCountryBoundary] Determined fillColor: 0x${fillColor.toString(16)} (${isCorrect ? 'Green' : 'Red'})`);
    // -------------------------------------------------

    // Create material for the boundary lines
    const boundaryMaterial = new THREE.LineBasicMaterial({
        color: lineColor, // Use yellow
        linewidth: 2,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -2.0,
        polygonOffsetUnits: -2.0
    });

    // Create material for filled area
    const fillMaterial = new THREE.MeshBasicMaterial({
        color: fillColor, // Use yellow
        transparent: true,
        opacity: 0.4, 
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -1.0
    });

    // --- REMOVED LOG: No longer needed ---
    // console.log(`[highlightCountryBoundary] Created fillMaterial with color: 0x${fillMaterial.color.getHexString()}`);
    // ------------------------------------------------------

    const type = countryGeometry.type;
    const coordinates = countryGeometry.coordinates;

    console.log(`[highlightCountryBoundary] Geometry type: ${type}, Offset: ${boundaryOffset}`);

    try {
        let linesAdded = 0;
        let meshesAdded = 0;
        
        if (type === 'Polygon') {
            const outerRingCoords = coordinates[0];
            const points3D = getPolygonPoints3D(outerRingCoords, boundaryOffset);
            
            if (points3D.length >= 3) {
                // Create the boundary line
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points3D);
                const lineLoop = new THREE.LineLoop(lineGeometry, boundaryMaterial);
                scene.add(lineLoop);
                highlightedBoundaryLines.push(lineLoop); // Add to array
                linesAdded++;
                
                // Create the filled shape
                const shape = new THREE.Shape();
                const firstPoint = points3D[0];
                const normal = firstPoint.clone().normalize();
                const tangentBasis = createTangentBasis(normal);
                const projectedPoints = points3D.map(p => projectPointToPlane(p, normal, tangentBasis, firstPoint));
                shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
                for (let i = 1; i < projectedPoints.length; i++) {
                    shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
                }
                shape.closePath();
                const shapeGeometry = new THREE.ShapeGeometry(shape);
                transformShapeBackTo3D(shapeGeometry, normal, tangentBasis, firstPoint);
                
                // --- REMOVED LOG ---
                // console.log(`[highlightCountryBoundary] Polygon: Adding mesh with material color: 0x${fillMaterial.color.getHexString()}`);
                // -------------------------------------------------
                const shapeMesh = new THREE.Mesh(shapeGeometry, fillMaterial); 
                scene.add(shapeMesh);
                highlightedBoundaryLines.push(shapeMesh); // Add to array
                meshesAdded++;
            }
        } else if (type === 'MultiPolygon') {
            for (let i = 0; i < coordinates.length; i++) {
                const polygon = coordinates[i];
                const outerRingCoords = polygon[0];
                const points3D = getPolygonPoints3D(outerRingCoords, boundaryOffset);
                
                if (points3D.length >= 3) {
                    // Create the boundary line
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points3D);
                    const lineLoop = new THREE.LineLoop(lineGeometry, boundaryMaterial.clone()); // Clone line material
                    scene.add(lineLoop);
                    highlightedBoundaryLines.push(lineLoop); // Add to array
                     linesAdded++;
                    
                    // Create the filled shape
                    const firstPoint = points3D[0];
                    const normal = firstPoint.clone().normalize();
                    const tangentBasis = createTangentBasis(normal);
                    const projectedPoints = points3D.map(p => projectPointToPlane(p, normal, tangentBasis, firstPoint));
                    const shape = new THREE.Shape();
                    shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
                    for (let i = 1; i < projectedPoints.length; i++) {
                        shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
                    }
                    shape.closePath();
                    const shapeGeometry = new THREE.ShapeGeometry(shape);
                    transformShapeBackTo3D(shapeGeometry, normal, tangentBasis, firstPoint);

                    // Explicitly create a new material instance for each part
                    const partFillMaterial = new THREE.MeshBasicMaterial({
                        color: fillColor, // Use yellow
                        transparent: true,
                        opacity: 0.4, 
                        side: THREE.DoubleSide,
                        depthTest: true,
                        depthWrite: false,
                        polygonOffset: true,
                        polygonOffsetFactor: -1.0,
                        polygonOffsetUnits: -1.0
                    });

                    // --- REMOVED LOG ---
                    // console.log(`[highlightCountryBoundary] MultiPolygon part ${i}: Adding mesh with material color: 0x${partFillMaterial.color.getHexString()}`);
                    // -------------------------------------------------
                    const shapeMesh = new THREE.Mesh(shapeGeometry, partFillMaterial); 
                    scene.add(shapeMesh);
                    highlightedBoundaryLines.push(shapeMesh); // Add to array
                    meshesAdded++;
                }
            }
        }

        console.log(`[highlightCountryBoundary] Highlighting finished. Lines added: ${linesAdded}, Meshes added: ${meshesAdded}. Total highlighted objects: ${highlightedBoundaryLines.length}`);
    } catch (error) {
        console.error("[highlightCountryBoundary] Error creating boundary highlight:", error);
        // Don't attempt removal on error if we want them to persist
        // removeHighlightedBoundaries(); 
    }
}

// Helper function to create tangent basis vectors for a normal vector
function createTangentBasis(normal) {
    // Find a vector not parallel to normal
    let tangent;
    if (Math.abs(normal.x) < 0.8) {
        tangent = new THREE.Vector3(1, 0, 0);
    } else {
        tangent = new THREE.Vector3(0, 1, 0);
    }
    
    // Make tangent perpendicular to normal
    tangent.sub(normal.clone().multiplyScalar(normal.dot(tangent)));
    tangent.normalize();
    
    // Create bitangent (third basis vector)
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent);
    
    return { tangent, bitangent };
}

// Project a 3D point onto a plane defined by a normal and a point on the plane
function projectPointToPlane(point, normal, basis, originPoint) {
    // Vector from origin to point
    const toPoint = point.clone().sub(originPoint);
    
    // Project onto tangent and bitangent
    const x = toPoint.dot(basis.tangent);
    const y = toPoint.dot(basis.bitangent);
    
    return { x, y };
}

// Transform a 2D shape geometry back to 3D space
function transformShapeBackTo3D(geometry, normal, basis, originPoint) {
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Convert from 2D tangent space to 3D world space
        const worldPos = new THREE.Vector3()
            .copy(originPoint)
            .add(basis.tangent.clone().multiplyScalar(x))
            .add(basis.bitangent.clone().multiplyScalar(y));
        
        // Ensure the point is at the correct distance from center (on the sphere)
        worldPos.normalize().multiplyScalar(EARTH_RADIUS + 0.05);
        
        positions.setXYZ(i, worldPos.x, worldPos.y, worldPos.z);
    }
    
    positions.needsUpdate = true;
}

// --- Function to remove highlighted boundaries ---
function removeHighlightedBoundaries() {
    if (highlightedBoundaryLines.length > 0) {
        console.log("Removing previous boundary highlights...");
        highlightedBoundaryLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
            scene.remove(line);
        });
        highlightedBoundaryLines = [];
    }
}

// --- Game Logic ---
function selectRandomCountry() {
    // --- MODIFIED: Select from the remaining shuffled list ---
    if (remainingCountries.length === 0) {
        console.log("No more countries remaining in the list.");
        return null; // Signal that the game should end
    }
    // Take the next country from the front of the shuffled list
    const nextCountry = remainingCountries.shift(); // Removes and returns the first element
    console.log(`Selected country ${nextCountry.name}. ${remainingCountries.length} countries remaining.`);
    return nextCountry;
    // --- END MODIFICATION ---
}

async function startNewRound() {
    console.log("Starting new round...");

    // Update the counter
    updateCountriesLeftCounter();

    // ... (resetting sounds, flags, visuals) ...
    isLineAnimating = false;
    isCameraFollowing = false;

    // Ensure controls are enabled and target is reset
    if (!controls.enabled) {
        console.log("Controls were disabled, re-enabling in startNewRound.");
        controls.enabled = true;
    }
    controls.target.set(0, 0, 0);
    controls.update(); // Update controls state

    // ... (hiding panel, resetting guess state, removing visuals) ...
    hideCountryInfoPanel();
    isGuessLocked = false;
    currentLineCurve = null;
    removePin();
    removeTargetRings();
    // --- PREVENT BOUNDARY REMOVAL ---
    // removeHighlightedBoundaries(); // <<< COMMENT OUT OR DELETE THIS LINE
    // --------------------------------
    if (currentDistanceLine) { /* ... remove line ... */ }
    if (distanceTextSprite) distanceTextSprite.visible = false;
    if (scoreSprite) scoreSprite.visible = false;
    if (countryLabelSprite) countryLabelSprite.visible = false;


    currentCountry = selectRandomCountry(); // Get the next country from the shuffled list

    // --- GAME OVER CHECK ---
    if (!currentCountry) {
        console.log(">>> GAME OVER: No more countries left to guess!");
        // Display Game Over message
        document.getElementById('country-name-display').innerText = "GAME OVER!";
        distanceElement.textContent = `Final Score: ${score}`; // Show final score
        // Optionally hide timer or other elements
        document.getElementById('timer-display').style.visibility = 'hidden';
        // Disable buttons permanently for this session
        if (guessButton) guessButton.disabled = true;
        if (nextButton) {
             nextButton.disabled = true;
             // Consider adding a 'Play Again' button visibility toggle here
        }
        // Maybe show a game over overlay or modal
        // You could re-purpose the startModal or create a new one
        // e.g., const gameOverModal = document.getElementById('game-over-modal');
        //       if (gameOverModal) gameOverModal.classList.remove('hidden');

        return; // Stop the function here
    }
    // --- END GAME OVER CHECK ---

    console.log(`Selected country: ${currentCountry.name}`);

    // ... (update UI elements like distance, country name) ...
    distanceElement.textContent = 'N/A';
    document.getElementById('country-name-display').innerText = currentCountry.name;
    document.getElementById('timer-display').style.visibility = 'visible'; // Ensure timer is visible
    resetTimerDisplay(); // Reset timer display text

    // --- START THE TIMER ---
    startTimer(); // <<< THIS IS WHERE THE TIMER BEGINS FOR THE ROUND
    // ---------------------

    // --- Disable Buttons ---
    if (guessButton) guessButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    if (nextButton) nextButton.style.display = 'block'; // Ensure visible but disabled

    console.log(`[startNewRound] New round setup complete for: ${currentCountry.name}. Timer started.`);

    // --- NO flag reset here (handled in listener) ---
}

function handleMapClick(event) {
    console.log("handleMapClick fired!");

    if (isDraggingPin) {
        console.log("handleMapClick: Bailing out because isDraggingPin is true.");
        return;
    }

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(globe); // Check intersection only with the globe

    if (intersects.length > 0) {
        // Get the intersection point on the globe's *displaced* surface
        const intersectionPoint = intersects[0].point;
        console.log("Map clicked at (displaced 3D):", intersectionPoint);

        // --- Calculate position using surface normal ---
        let pinPosition;
        if (intersects[0].face) { // Ensure face data is available
            const faceNormal = intersects[0].face.normal;
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(globe.matrixWorld);
            const worldNormal = faceNormal.clone().applyMatrix3(normalMatrix).normalize();

            // Offset the pin position *along the world normal* from the intersection point
            pinPosition = intersectionPoint.clone().addScaledVector(worldNormal, PIN_OFFSET);
            console.log("Pin position calculated using surface normal offset.");
        } else {
            // Fallback: If face normal isn't available (shouldn't happen with BufferGeometry)
            console.warn("Intersection face data not available, using radial offset fallback.");
            pinPosition = intersectionPoint.clone().normalize().multiplyScalar(EARTH_RADIUS + PIN_OFFSET);
        }
        // --- End Normal Calculation ---


        // Use the new function to create/update the pin
        createOrUpdatePin(pinPosition);

    } else {
        console.log("Clicked outside the globe.");
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); // Returns distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// --- Helper function to convert Lat/Lon to 3D point --- <<< ADDED
function getPointFromLatLon(lat, lon) {
    const phi = deg2rad(90 - lat); // Offset from North Pole
    const theta = deg2rad(lon + 180); // Offset from Z-axis

    const x = -(EARTH_RADIUS * Math.sin(phi) * Math.cos(theta));
    const y = EARTH_RADIUS * Math.cos(phi);
    const z = EARTH_RADIUS * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}
// --- End Helper ---

// --- Helper function to convert 3D point to Lat/Lon ---
function getLatLonFromPoint(point) {
    // Ensure the point is normalized to the sphere's surface for accurate calculation
    const normalizedPoint = point.clone().normalize().multiplyScalar(EARTH_RADIUS); // Use EARTH_RADIUS here

    // Latitude (angle from the equator, Y-up)
    // Use asin for latitude calculation, range is -PI/2 to PI/2
    const latRad = Math.asin(normalizedPoint.y / EARTH_RADIUS); // Divide by radius

    // Longitude (angle around the Y-axis, from the XZ plane)
    // Use atan2 for longitude calculation, range is -PI to PI
    // Need to consider the radius in the XZ plane
    const radiusXZ = Math.sqrt(normalizedPoint.x * normalizedPoint.x + normalizedPoint.z * normalizedPoint.z);
    let lonRad;
    if (radiusXZ < 0.00001) { // Handle poles (point is very close to Y axis)
        lonRad = 0; // Assign default longitude (e.g., 0) at poles
    } else {
        // Correct atan2 arguments: atan2(y, x) or in 3D, often atan2(x, z) for angle from +Z axis
        lonRad = Math.atan2(normalizedPoint.x, normalizedPoint.z);
    }

    // Convert radians to degrees
    const lat = latRad * (180 / Math.PI);
    const lon = lonRad * (180 / Math.PI);

    return { lat, lon };
}
// --- End Helper ---

// --- Helper function to calculate the geometric center of loaded boundary ---
function calculateGeometryCenter(geometry) {
    if (!geometry || !geometry.coordinates) {
        console.warn("calculateGeometryCenter: Invalid geometry provided.");
        return null;
    }

    const points3D = [];
    const type = geometry.type;
    const coordinates = geometry.coordinates;

    function processPolygon(polygonCoords) {
        // Use only the outer ring (polygonCoords[0]) for centroid calculation for simplicity
        const outerRing = polygonCoords[0];
        for (const coord of outerRing) {
            const lon = coord[0];
            const lat = coord[1];
            if (typeof lon === 'number' && typeof lat === 'number') {
                points3D.push(getPointFromLatLon(lat, lon)); // Use existing conversion
            }
        }
    }

    if (type === 'Polygon') {
        processPolygon(coordinates);
    } else if (type === 'MultiPolygon') {
        for (const polygon of coordinates) {
            processPolygon(polygon);
        }
    } else {
        console.warn(`calculateGeometryCenter: Unsupported geometry type "${type}".`);
        return null;
    }

    if (points3D.length === 0) {
        console.warn("calculateGeometryCenter: No valid 3D points found in geometry.");
        return null;
    }

    // Calculate the average position (centroid)
    const center = new THREE.Vector3();
    for (const point of points3D) {
        center.add(point);
    }
    center.divideScalar(points3D.length);

    // Project the centroid onto the sphere surface
    center.normalize().multiplyScalar(EARTH_RADIUS);

    console.log(`Calculated geometry center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
    return center;
}

// <<< MOVE AUDIO FUNCTIONS HERE >>>
// --- Audio Functions ---
function loadAudio() {
    console.log("Loading audio files...");
    let loadedCount = 0;
    const totalSounds = Object.keys(audioFiles).length;
    const promises = []; // Keep track of loading promises

    for (const key in audioFiles) {
        const path = audioFiles[key];
        const audio = new Audio(path);
        audio.preload = 'auto'; // Encourage browser to load

        const promise = new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', () => {
                console.log(`Audio loaded: ${key} (${path})`);
                sounds[key] = audio;
                loadedCount++;
                resolve(); // Resolve the promise for this sound
            }, false);

            audio.addEventListener('error', (e) => {
                console.error(`Error loading audio: ${key} (${path})`, e);
                // Resolve even on error to not block game start, but log it
                resolve();
            });

            // Attempt to load (some browsers need this)
            audio.load();
        });
        promises.push(promise);
    }

    // Return a promise that resolves when all sounds have tried loading
    return Promise.all(promises).then(() => {
        console.log(`Audio loading attempted. ${loadedCount}/${totalSounds} successfully loaded.`);
        isAudioLoaded = true; // Set flag after all attempts
        if (sounds.backgroundMusic) {
            sounds.backgroundMusic.loop = true;
            sounds.backgroundMusic.volume = 0.3; // Adjust volume as needed
            // <<< ADDED LOG >>>
            console.log("Background music object loaded:", sounds.backgroundMusic);
            console.log("Background music readyState:", sounds.backgroundMusic.readyState);
        } else {
             // <<< ADDED LOG >>>
             console.warn("Background music object NOT found in sounds after loading.");
        }
    });
}

function playSound(soundName) {
    if (!isAudioLoaded || !sounds[soundName]) {
        // console.warn(`Sound "${soundName}" not loaded or available.`);
        return;
    }
    try {
        const audio = sounds[soundName]; // Get the audio object
        // <<< ADDED LOG >>>
        if (soundName === 'backgroundMusic') {
            console.log(`Attempting to play backgroundMusic. Current time: ${audio.currentTime}, Paused: ${audio.paused}`);
        }

        // Rewind the sound to the beginning before playing (optional for background music if resume is desired)
        // For simplicity, we'll keep rewinding for now.
        audio.currentTime = 0;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // <<< ADDED LOG >>>
                if (soundName === 'backgroundMusic') {
                     console.log("Background music playback started successfully.");
                }
            }).catch(error => {
                // <<< MODIFIED LOGGING >>>
                if (soundName === 'backgroundMusic') {
                    console.warn(`Background music playback failed. Likely due to autoplay restrictions. Error: ${error.name}`);
                } else if (error.name !== 'NotAllowedError') {
                    // Log errors for other sounds unless it's the common NotAllowedError
                    console.error(`Error playing sound "${soundName}":`, error);
                }
            });
        }
         // <<< ADDED LOG >>>
         if (soundName === 'backgroundMusic') {
            // Log state immediately after calling play()
            setTimeout(() => console.log(`Background music state shortly after play() attempt: Paused: ${audio.paused}`), 10);
        }

    } catch (error) {
        console.error(`Error attempting to play sound "${soundName}":`, error);
    }
}


function stopSound(soundName) {
     if (!isAudioLoaded || !sounds[soundName]) {
        return;
    }
     try {
        sounds[soundName].pause();
        sounds[soundName].currentTime = 0; // Rewind
    } catch (error) {
        console.error(`Error stopping sound "${soundName}":`, error);
    }
}
// --- End Audio Functions ---
// <<< END MOVE >>>


async function handleGuessConfirm() {
    if (!playerGuess || !currentCountry || !pinSprite) {
         console.warn("Cannot confirm guess. Pin not placed or country not loaded.");
         return;
    }
    if (guessButton) {
    guessButton.disabled = true;
         console.log(`handleGuessConfirm: guessButton.disabled set to ${guessButton.disabled}`); // <<< ADD LOG
    }
    if (nextButton) {
        nextButton.style.display = 'none'; // Keep hiding next button during animation
        // It should already be disabled, but let's be sure
        if (nextButton.disabled !== true) {
            console.warn("handleGuessConfirm: Forcing nextButton back to disabled.");
            nextButton.disabled = true;
        }
    }
    isGuessLocked = true;
    console.log("Confirming guess...");
    console.log("Current country geometry before scoring/highlighting:", currentCountry.geometry);

    let isGuessCorrect = false;
    let roundScore = 0;
    let distanceToCenter = null;
    let distanceToBoundary = null;
    let displayDistance = null;

    // --- Calculate True Center Vector FIRST (if geometry exists) ---
    // This block remains the same - it calculates targetCountryCenterVector
    if (currentCountry.geometry) {
        const calculatedCenter = calculateGeometryCenter(currentCountry.geometry);
        if (calculatedCenter) {
            targetCountryCenterVector.copy(calculatedCenter);
             console.log(`Stored target country center vector from GEOMETRY: (${targetCountryCenterVector.x.toFixed(2)}, ${targetCountryCenterVector.y.toFixed(2)}, ${targetCountryCenterVector.z.toFixed(2)})`);
        } else {
            targetCountryCenterVector = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
             console.warn(`Geometry center calculation failed. Falling back to point data for center vector: (${targetCountryCenterVector.x.toFixed(2)}, ${targetCountryCenterVector.y.toFixed(2)}, ${targetCountryCenterVector.z.toFixed(2)})`);
        }
    } else {
        targetCountryCenterVector = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
         console.log(`No geometry loaded. Stored target country center vector from POINT data: (${targetCountryCenterVector.x.toFixed(2)}, ${targetCountryCenterVector.y.toFixed(2)}, ${targetCountryCenterVector.z.toFixed(2)})`);
    }
    // --- End Calculate True Center Vector ---

    // --- Convert the targetCountryCenterVector back to Lat/Lon for distance calculation ---
    const targetCenterLatLon = getLatLonFromPoint(targetCountryCenterVector);
    // --- End Conversion ---

    // --- Calculate Distance to Center (for scoring) ---
    distanceToCenter = calculateDistance(
        playerGuess.lat, playerGuess.lon,
        targetCenterLatLon.lat, targetCenterLatLon.lon
    );
    console.log(`Distance to center calculated: ${distanceToCenter} km (used for scoring)`);
    // --- End Calculate Distance to Center ---

    // --- SCORING LOGIC with ADJUSTED CORRECTNESS CHECK ---
    if (currentCountry.geometry) {
        console.log(`Distance to country center (for scoring): ${distanceToCenter}km`);

        // --- ADJUST THESE THRESHOLDS (Consider different values for boundary vs center) ---
        const PERFECT_THRESHOLD_CENTER = 150;  // Perfect guess to center
        const GOOD_THRESHOLD_CENTER = 750;     // Good guess to center
        // -----------------------------

        const isInside = isPointInCountry(playerGuess, currentCountry.geometry);
        console.log(`For reference, polygon check says isInside = ${isInside}`);
        if (isInside) {
            console.log("Polygon check shows point is INSIDE - awarding max score");
            roundScore = 1000;
            isGuessCorrect = true;
            distanceToBoundary = 0; // Set boundary distance to 0
        } else {
            distanceToBoundary = null; // Set to null since we're not using it
        }

        // --- Scoring based on distance to CENTER ---
        if (isInside) {
            console.log("Polygon check shows point is INSIDE - overriding distance check");
            isGuessCorrect = true; // Ensure green if inside
            roundScore = 1000;
            } else {
            if (distanceToCenter <= PERFECT_THRESHOLD_CENTER) {
                console.log(`PERFECT GUESS (Center)! Distance (${distanceToCenter}km) <= ${PERFECT_THRESHOLD_CENTER}km`);
                roundScore = 1000;
                isGuessCorrect = true;
            } else if (distanceToCenter <= GOOD_THRESHOLD_CENTER) {
                console.log(`GOOD GUESS (Center)! Distance (${distanceToCenter}km) <= ${GOOD_THRESHOLD_CENTER}km`);
                // Adjust scoring if desired
                roundScore = 900 - Math.floor((distanceToCenter - PERFECT_THRESHOLD_CENTER) / 2);
                isGuessCorrect = true; // Mark as correct (green)
            } else {
                console.log(`FAR GUESS (Center). Distance (${distanceToCenter}km) > ${GOOD_THRESHOLD_CENTER}km`);
                roundScore = 200 - Math.floor(distanceToCenter / 10); // Reduced score
                isGuessCorrect = false; // Red highlight
            }
        }
        displayDistance = distanceToCenter; // Use distance to center for display
    } else {
        // Fallback logic using distanceToCenter
        console.warn("No boundary data for country, using distance-based scoring only.");
        const PERFECT_THRESHOLD = 150;
        const GOOD_THRESHOLD = 750;

        if (distanceToCenter <= PERFECT_THRESHOLD) {
            roundScore = 1000;
            isGuessCorrect = true;
        } else if (distanceToCenter <= GOOD_THRESHOLD) {
            roundScore = 900 - Math.floor((distanceToCenter - PERFECT_THRESHOLD) / 2);
            isGuessCorrect = true;
        } else if (distanceToCenter <= 3000) {
            roundScore = 2000 - distanceToCenter;
            isGuessCorrect = false; // Keep false for red highlight
        } else {
            roundScore = 0;
            isGuessCorrect = false; // Keep false for red highlight
        }
        distanceToBoundary = null;
        displayDistance = distanceToCenter; // Use distance to center for display
    }

    roundScore = Math.max(0, roundScore); // Ensure score isn't negative

    console.log(`Final determination: isGuessCorrect = ${isGuessCorrect}, Score = ${roundScore}`);
    console.log(`Distance to Center: ${distanceToCenter} km`);
    console.log(`Distance to Boundary: ${distanceToBoundary !== null ? distanceToBoundary + ' km' : 'N/A (no geometry or inside)'}`);

    // --- Determine Display Distance ---
    displayDistance = distanceToCenter; // Use distance to center for display
    // --- End Determine Display Distance ---

    // ... existing score updates, etc. ...

    // Highlight boundary using the determined isGuessCorrect value
    if (currentCountry.geometry) {
        console.log(`Calling highlightCountryBoundary`); // Updated log
        highlightCountryBoundary(currentCountry.geometry);
    } else {
        console.warn("Skipping boundary highlight because geometry is missing.");
    }

    // ... rest of function ...

    // Update total score and UI
    // <<< SCORE UPDATE SHOULD BE HANDLED AFTER TIME PENALTY >>>
    // score += currentRoundScore; // <<< MOVE THIS LATER

    // --- Update UI with DISPLAY Distance ---
    const roundedDisplayDistance = displayDistance !== null ? Math.round(displayDistance) : null;
    distanceElement.textContent = roundedDisplayDistance !== null ? `${roundedDisplayDistance}` : 'Error';
    console.log(`UI Distance Element updated with: ${roundedDisplayDistance} km`);
    // --- End Update UI ---


    // Display Distance Text Above Pin
    // <<< Use roundedDisplayDistance here too >>>
    if (distanceTextSprite && pinSprite && roundedDisplayDistance !== null) {
        distanceContext.clearRect(0, 0, distanceCanvas.width, distanceCanvas.height);
        const distanceString = `${roundedDisplayDistance} km`; // Use the final display distance
        distanceContext.fillText(distanceString, distanceCanvas.width / 2, distanceCanvas.height / 2);
        distanceTexture.needsUpdate = true;
        const pinPosition = pinSprite.position;
        const surfaceNormal = pinPosition.clone().normalize();
        const textOffset = PIN_OFFSET + 0.2;
        const textPosition = pinPosition.clone().addScaledVector(surfaceNormal, textOffset);
        distanceTextSprite.position.copy(textPosition);
        distanceTextSprite.visible = true;
        console.log(`Displaying distance text "${distanceString}" above pin.`);
    } else if (distanceTextSprite) {
        distanceTextSprite.visible = false; // Hide if distance is null
    }


    // Log results
    console.log(`Guessed: ${playerGuess.lat.toFixed(2)}, ${playerGuess.lon.toFixed(2)}`);
    // console.log(`Actual (Center Point): ${currentCountry.lat.toFixed(2)}, ${currentCountry.lon.toFixed(2)}`); // Keep or remove this log
    console.log(`Target Center (Lat/Lon Used for Dist Calc): ${targetCenterLatLon.lat.toFixed(2)}, ${targetCenterLatLon.lon.toFixed(2)}`); // Log the derived coords
    console.log(`Target Center (Calculated Geometry Center 3D): (${targetCountryCenterVector.x.toFixed(2)}, ${targetCountryCenterVector.y.toFixed(2)}, ${targetCountryCenterVector.z.toFixed(2)})`); // Log the used vector
    console.log(`Final Score (before time penalty): ${roundScore}`); // Log score before penalty


    // --- Draw distance line AND Prepare Curve ---
    // ... (line drawing logic remains the same, uses targetCountryCenterVector) ...
    const startVec = pinSprite.position.clone().normalize().multiplyScalar(EARTH_RADIUS);
    const endVec = targetCountryCenterVector.clone();
    const points = [];
    const numPoints = 50;
    // <<< USE TARGET_RING_SURFACE_OFFSET for the line offset as well? Or define a new one? Let's use ring offset for consistency >>>
    const lineOffset = TARGET_RING_SURFACE_OFFSET; // Align line height with rings

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const intermediateVec = new THREE.Vector3().lerpVectors(startVec, endVec, t).normalize();
        intermediateVec.multiplyScalar(EARTH_RADIUS + lineOffset); // Use calculated offset
        points.push(intermediateVec);
    }

    currentLineCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);

    // --- Calculate Dynamic Duration for LINE ---\
    const curveLength = currentLineCurve.getLength();
    let duration = (curveLength / LINE_ANIMATION_SPEED) * 1000;
    currentAnimationDuration = Math.max(MIN_LINE_DURATION, Math.min(duration, MAX_LINE_DURATION));
    console.log(`Line Curve Length: ${curveLength.toFixed(2)}, Calculated Duration: ${duration.toFixed(0)}ms, Clamped Duration: ${currentAnimationDuration}ms`);

    // --- Setup VISIBLE line geometry ---
    const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);

    // <<< ADD polygonOffset to the line material >>>
    const curveMaterial = new THREE.LineBasicMaterial({
        color: LINE_AND_TARGET_COLOR,
        linewidth: 2,
        depthTest: true,        // Keep depth testing enabled
        depthWrite: false,      // Keep depth write disabled
        transparent: true,
        opacity: 0.9,
        polygonOffset: true,     // Enable polygon offset
        polygonOffsetFactor: -1.0, // Push slightly "forward"
        polygonOffsetUnits: -1.0  // Additional offset
    });
    // <<< END Add polygonOffset >>>


    // Remove old line if it somehow still exists (defensive)
    if (currentDistanceLine) {
        console.warn(">>> handleGuessConfirm: Removing unexpected existing currentDistanceLine before creating new one.");
        scene.remove(currentDistanceLine);
        if (currentDistanceLine.geometry) currentDistanceLine.geometry.dispose();
        if (currentDistanceLine.material) currentDistanceLine.material.dispose();
        currentDistanceLine = null;
    }

    currentDistanceLine = new THREE.Line(curveGeometry, curveMaterial);
    currentDistanceLine.geometry.setDrawRange(0, 0);
    // --- Add a custom property to identify the line ---
    currentDistanceLine.isTravelLine = true;
    // ----------------------------------------------
    currentDistanceLine.visible = true;
    scene.add(currentDistanceLine);
    lineTotalPoints = points.length;

    // --- ADD LOG HERE ---
    console.log(">>> handleGuessConfirm: AFTER scene.add, currentDistanceLine =", currentDistanceLine);
    // --------------------

    // Start Line Animation Timer
    lineAnimationStartTime = performance.now();
    isLineAnimating = true;

    // --- Setup Camera Glide (Uses calculated targetCountryCenterVector implicitly via animate loop) ---
    if (pinSprite && currentLineCurve) {
        console.log("Calculating initial distance and starting camera glide.");
        initialCameraDistance = camera.position.length(); // Store initial distance from center
        console.log(`Initial camera distance: ${initialCameraDistance.toFixed(2)}`);
        controls.enabled = false; // Disable user controls
        isCameraFollowing = true; // ENABLE following
    } else {
        console.error("Pin marker or line curve not available for camera glide.");
        isCameraFollowing = false;
    }
    // --- End Camera Glide Setup ---

    nextButton.style.display = 'block'; // Show next button

    currentRoundScore = roundScore;

    // --- Play Correct/Incorrect Sound ---
    if (roundScore > 0) { // Assuming any score > 0 is 'correct enough'
        playSound('correctGuess');
    } else {
        playSound('incorrectGuess');
    }
    // -----------------------------------

    // Stop the timer
    stopTimer();

    // Calculate score based on time
    const timePenalty = Math.max(0, elapsedTime / 1000 - 10); // Subtract 10 seconds, no penalty for first 10 seconds
    const timePenaltyFactor = Math.max(0, 1 - (timePenalty / 60)); // Max penalty after 60 seconds
    currentRoundScore *= timePenaltyFactor;
    currentRoundScore = Math.round(currentRoundScore);

    console.log(`Time taken: ${(elapsedTime / 1000).toFixed(2)} seconds`);
    console.log(`Time penalty factor: ${timePenaltyFactor.toFixed(2)}`);
    console.log(`Adjusted score: ${currentRoundScore}`);
    score += currentRoundScore; // <<< PROBLEM LINE
    // scoreElement.textContent = totalScore; // <<< DELETE THIS LINE (or comment it out)
    document.getElementById('score-display').innerText = score; // <<< CORRECTED LINE

    // --- Show Info Panel ---
    if (infoPanelElement) {
        console.log(">>> handleGuessConfirm: infoPanelElement found, attempting to show panel.");
        showCountryInfoPanel(currentCountry);
        infoPanelElement.classList.add('visible'); // <<< ADD THIS LINE
        console.log(">>> handleGuessConfirm: showCountryInfoPanel called.");
    } else {
        console.warn(">>> handleGuessConfirm: infoPanelElement NOT found, cannot show panel.");
    }
    // --- End Show Info Panel ---

    // Highlight Country Boundary (if enabled)
    if (showBoundaries && currentCountry.geometry) {
        console.log("Highlighting boundary because showBoundaries is true.");
        highlightCountryBoundary(currentCountry.geometry);
    } else {
        console.log("Skipping boundary highlight because showBoundaries is false or geometry is missing.");
    }

    // Add this new helper function
    function calculateDistanceToBoundary(lat, lon, geometry) {
        if (!geometry || !geometry.coordinates) {
            console.warn("No geometry or coordinates provided to calculateDistanceToBoundary");
            return null;
        }

        let minDistance = Infinity;

        // Iterate through the coordinates of the geometry
        for (const polygon of geometry.coordinates) {
            for (let i = 0; i < polygon.length; i++) {
                const p1 = polygon[i];
                const p2 = polygon[(i + 1) % polygon.length]; // Wrap around to the first point for the last segment

                // Convert coordinates to radians
                const latRad = deg2rad(lat);
                const lonRad = deg2rad(lon);
                const p1LatRad = deg2rad(p1[1]);
                const p1LonRad = deg2rad(p1[0]);
                const p2LatRad = deg2rad(p2[1]);
                const p2LonRad = deg2rad(p2[0]);

                // --- Calculate distance from point to great circle segment ---
                // This is a more complex calculation that takes into account the spherical geometry
                const distToSegment = distanceToGreatCircleSegment(latRad, lonRad, p1LatRad, p1LonRad, p2LatRad, p2LonRad);

                if (distToSegment < minDistance) {
                    minDistance = distToSegment;
                }
            }
        }

        if (minDistance === Infinity) {
            console.warn("Could not calculate distance to boundary (likely no valid geometry)");
            return null;
        }

        console.log(`Minimum distance to boundary: ${minDistance} km`);
        return minDistance;
    }

    // --- Helper function to calculate distance to great circle segment ---
    function distanceToGreatCircleSegment(latRad, lonRad, p1LatRad, p1LonRad, p2LatRad, p2LonRad) {
        // --- Step 1: Calculate the angular distance between the point and the two endpoints ---
        const angularDist1 = angularDistance(latRad, lonRad, p1LatRad, p1LonRad);
        const angularDist2 = angularDistance(latRad, lonRad, p2LatRad, p2LonRad);

        // --- Step 2: Calculate the angular distance between the two endpoints ---
        const segmentLength = angularDistance(p1LatRad, p1LonRad, p2LatRad, p2LonRad);

        // --- Step 3: Calculate the bearing from p1 to the point and from p1 to p2 ---
        const bearing1 = initialBearing(p1LatRad, p1LonRad, latRad, lonRad);
        const bearing2 = initialBearing(p1LatRad, p1LonRad, p2LatRad, p2LonRad);

        // --- Step 4: Calculate the "cross-track distance" ---
        const sinCrossTrack = Math.sin(angularDist1) * Math.sin(bearing1 - bearing2);
        const absCrossTrack = Math.abs(Math.asin(sinCrossTrack)); // Absolute value of cross-track distance

        // --- Step 5: Check if the point lies "beyond" the endpoints ---
        const bearingToP2 = initialBearing(latRad, lonRad, p2LatRad, p2LonRad);
        const bearingToP1 = initialBearing(latRad, lonRad, p1LatRad, p1LonRad);

        const isPastP1 = Math.abs(bearing1 - bearing2) > Math.PI / 2; // Point is past p1
        const isPastP2 = Math.abs(bearingToP2 - bearingToP1) > Math.PI / 2; // Point is past p2

        // --- Step 6: Determine the distance to the segment ---
        let distance;
        if (isPastP1) {
            distance = angularDist1; // Distance to p1
        } else if (isPastP2) {
            distance = angularDist2; // Distance to p2
        } else {
            distance = absCrossTrack; // Distance to the segment
        }

        // --- Step 7: Convert the angular distance to kilometers ---
        return distance * EARTH_RADIUS;
    }

    // --- Helper function to calculate the angular distance between two points ---
    function angularDistance(lat1, lon1, lat2, lon2) {
        const deltaLon = lon2 - lon1;
        const centralAngle = Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(deltaLon));
        return centralAngle;
    }

    // --- Helper function to calculate the initial bearing between two points ---
    function initialBearing(lat1, lon1, lat2, lon2) {
        const deltaLon = lon2 - lon1;
        const y = Math.sin(deltaLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
        const bearing = Math.atan2(y, x);
        return bearing;
    }
}

// --- Marker/Pin/Target Handling ---

// Function to create or update the pin sprite
function createOrUpdatePin(position) {
    const isNewPin = !pinSprite;
    const currentScale = getPinScale();

    if (!pinSprite) {
        // <<< ADD polygonOffset to the pin material >>>
        const pinMaterial = new THREE.SpriteMaterial({
            map: null, // Start with no map
            color: PIN_COLOR_DEFAULT.clone(),
            depthTest: true,        // Keep depth testing enabled
            depthWrite: false,      // Keep depth write disabled (sprites often don't write depth)
            sizeAttenuation: false, // Keep pin size constant regardless of distance
            polygonOffset: true,     // Enable polygon offset
            polygonOffsetFactor: -2.0, // Push slightly more than lines, maybe? Adjust if needed.
            polygonOffsetUnits: -2.0
        });
        // <<< END Add polygonOffset >>>


        pinSprite = new THREE.Sprite(pinMaterial);
        pinSprite.scale.set(currentScale, currentScale, currentScale);
        pinSprite.center.set(0.5, 0);

        // Load texture and update the *existing* sprite's material
        const pinTexture = new THREE.TextureLoader().load(
            PIN_IMAGE_PATH,
            (texture) => { // On Load
                if (pinSprite) {
                    pinSprite.material.map = texture;
                    pinSprite.material.needsUpdate = true;
                    pinSprite.position.copy(position);
                    scene.add(pinSprite);
                    console.log("Pin sprite created and texture loaded.");
                    if (isNewPin) playSound('pinPlace');

                    // <<< ADDED: Log button state *after* texture load (for info only) >>>
                    if (guessButton) {
                         console.log(`createOrUpdatePin (Texture Loaded): guessButton.disabled is currently ${guessButton.disabled}`);
                    }

                } else { /* ... cleanup ... */ }
            },
            undefined, // Progress
            (err) => { console.error("Error loading pin texture:", err); } // On Error
        );

    } else { // Pin already exists
        pinSprite.position.copy(position);
        playSound('pinPlace');
    }
    // Update player guess coordinates
    playerGuess = getLatLonFromPoint(position);

    // <<< ADD DETAILED LOGS >>>
    console.log(`createOrUpdatePin: Attempting to evaluate button state.`);
    console.log(`createOrUpdatePin: Current value of isGuessLocked = ${isGuessLocked}`);
    console.log(`createOrUpdatePin: Checking guessButton element:`, guessButton);
    // <<< END DETAILED LOGS >>>


    // --- Enable GUESS button ONLY ---
    if (!isGuessLocked) {
         console.log("createOrUpdatePin: Condition !isGuessLocked is TRUE."); // Log condition success
         if (guessButton) {
             console.log("createOrUpdatePin: guessButton element exists. Setting disabled = false."); // Log intent
             guessButton.disabled = false; // Enable the button
             console.log(`createOrUpdatePin: guessButton.disabled is now ${guessButton.disabled}`); // Confirm result
         } else {
             console.warn("createOrUpdatePin: guessButton element not found. Cannot enable.");
         }
         // Ensure nextButton remains disabled
         if (nextButton && nextButton.disabled !== true) {
             console.warn("createOrUpdatePin: Forcing nextButton back to disabled.");
             nextButton.disabled = true;
         }
    } else {
         console.log("createOrUpdatePin: Condition !isGuessLocked is FALSE. Guess button NOT enabled."); // Log condition failure
    }
}

// Function to remove the pin
function removePin() {
    if (pinSprite) {
        scene.remove(pinSprite);
        pinSprite.material.map.dispose(); // Dispose texture
        pinSprite.material.dispose();     // Dispose material
        // pinSprite.geometry.dispose(); // Sprite geometry doesn't need disposal usually
        pinSprite = null;
    }
    playerGuess = null;
    guessButton.disabled = true;
}

// --- Ring Target Functions ---

// --- Define reusable geometry outside the function ---
let sharedRingLineGeometry = null;
function createSharedRingLineGeometry() {
     if (sharedRingLineGeometry) return sharedRingLineGeometry; // Return if already created

     const segments = 64;
     const points = [];
     for (let i = 0; i <= segments; i++) {
         const theta = (i / segments) * Math.PI * 2;
         points.push(
             new THREE.Vector3(
                 Math.cos(theta) * TARGET_RING_MAX_SCALE,
                 Math.sin(theta) * TARGET_RING_MAX_SCALE,
                 0
             )
         );
     }
     sharedRingLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
     console.log("Shared ring line geometry created.");
     return sharedRingLineGeometry;
}

function createTargetRings() {
    if (!currentCountry) return;
    // --- Check if targetCountryCenterVector is valid ---
    if (!targetCountryCenterVector || targetCountryCenterVector.lengthSq() < 0.001) {
         console.warn("Cannot create target rings: targetCountryCenterVector is not validly set.");
         // Fallback: Use the lat/lon from main geojson as before
         targetCountryCenterVector = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
         console.log("Falling back to using currentCountry.lat/lon for ring position.");
    }
    // --------------------------------------------------
    removeTargetRings();
    targetRingClock.start();

    console.log("Creating target ring lines at calculated geometry center...");

    // --- Use the globally set targetCountryCenterVector ---
    const targetPositionOnSphere = targetCountryCenterVector;
    // --- End Use Global ---

    // <<< USE NEW CONSTANT for offset >>>
    const targetPositionOffset = targetPositionOnSphere.clone()
        .normalize()
        .multiplyScalar(EARTH_RADIUS + TARGET_RING_SURFACE_OFFSET); // Apply specific ring offset

    // Get or create the shared geometry
    const ringGeometry = createSharedRingLineGeometry();

    for (let i = 0; i < NUM_TARGET_RINGS; i++) {
        const ringLineMaterial = new THREE.LineBasicMaterial({
            color: LINE_AND_TARGET_COLOR,
            transparent: true,
            opacity: 1.0,
            linewidth: 2, // Set line thickness
            depthTest: true,
            depthWrite: false
        });

        // Use the shared geometry
        const ringLine = new THREE.LineLoop(ringGeometry, ringLineMaterial);

        ringLine.position.copy(targetPositionOffset); // Position using the calculated offset
        ringLine.lookAt(globe.position); // Rings face outwards from globe center
        targetRings.push(ringLine);
        scene.add(ringLine);
    }
    console.log(`${targetRings.length} target ring lines created at offset ${TARGET_RING_SURFACE_OFFSET}.`); // Log new offset
}

function removeTargetRings() {
    if (targetRings.length > 0) {
        console.log("Removing target rings...");
        targetRings.forEach(ring => {
            scene.remove(ring);
            // Only dispose of the material (geometry is shared)
            if (ring.material) {
                ring.material.dispose();
            }
        });
        targetRings = [];
        targetRingClock.stop();
        // Don't dispose shared geometry here, maybe dispose on game end/reload if needed
    }
}

// --- Drag and Hover Logic ---

function onPointerDown(event) {
    tryStartBackgroundMusic(); // <<< ADD THIS LINE AT THE START
    console.log("onPointerDown fired!");
    // ... (calculate mouse, set up raycaster) ...
    mouse.x = ((event.clientX - renderer.domElement.getBoundingClientRect().left) / renderer.domElement.width) * 2 - 1;
    mouse.y = -((event.clientY - renderer.domElement.getBoundingClientRect().top) / renderer.domElement.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    console.log("Checking for pin intersection. pinSprite exists:", !!pinSprite); // Log if pin sprite object exists
    const pinIntersects = pinSprite ? raycaster.intersectObject(pinSprite) : [];
    console.log("Pin intersects length:", pinIntersects.length, "| Is guess locked:", isGuessLocked); // Log intersection result and lock status

    // Check if the pin was hit and guess is not locked
    if (pinIntersects.length > 0 && !isGuessLocked) {
        console.log(">>> Pin CLICKED & unlocked! Starting drag state."); // <-- Important log
        isDraggingPin = true;
        controls.enabled = false;
        pinSprite.material.color.copy(PIN_COLOR_HOVER);
    }
    // Check if map was clicked when not dragging and unlocked
    else if (!isDraggingPin && !isGuessLocked) {
        console.log(">>> Map CLICKED (not pin) & unlocked. Calling handleMapClick."); // <-- Important log
        handleMapClick(event);
    }
    // Log case where click happens but guess is locked
    else if (isGuessLocked) {
         console.log(">>> Click ignored because guess is locked."); // <-- Important log
    }
}

function onPointerMove(event) {
    // ... (calculate mouse, set up raycaster) ...
    mouse.x = ((event.clientX - renderer.domElement.getBoundingClientRect().left) / renderer.domElement.width) * 2 - 1;
    mouse.y = -((event.clientY - renderer.domElement.getBoundingClientRect().top) / renderer.domElement.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // --- Hover Logic (Simplified for Mobile) ---
    const pinIntersects = pinSprite ? raycaster.intersectObject(pinSprite) : [];
    const baseScale = getPinScale(); // <-- Get base scale for current view

    if (!isDraggingPin) {
        if (pinIntersects.length > 0) {
            // --- Keep Cursor Change ---
            // mapContainer.style.cursor = 'grab';
        } else {
            // --- Keep Cursor Change ---
            // mapContainer.style.cursor = 'auto';
        }
    }

    // --- Dragging Logic ---
    if (isDraggingPin && pinSprite) {
        console.log(">>> Dragging pin... Raycasting against globe.");

        const globeIntersects = raycaster.intersectObject(globe);
        console.log(`Globe intersects during drag: ${globeIntersects.length}`);

        if (globeIntersects.length > 0) {
            const intersectionPoint = globeIntersects[0].point;

            // --- Calculate position using surface normal (like in handleMapClick) ---
            let newPinPosition;
            if (globeIntersects[0].face) {
                const faceNormal = globeIntersects[0].face.normal;
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(globe.matrixWorld);
                const worldNormal = faceNormal.clone().applyMatrix3(normalMatrix).normalize();
                newPinPosition = intersectionPoint.clone().addScaledVector(worldNormal, PIN_OFFSET);
            } else {
                console.warn("Dragging: Intersection face data not available, using radial offset fallback.");
                newPinPosition = intersectionPoint.clone().normalize().multiplyScalar(EARTH_RADIUS + PIN_OFFSET);
            }
            // --- End Normal Calculation ---

            pinSprite.position.copy(newPinPosition);
            playerGuess = getLatLonFromPoint(newPinPosition); // Update guess coords
        }
    }
}

function onPointerUp(event) {
    if (isDraggingPin) {
        isDraggingPin = false;
        controls.enabled = true;
        // Cursor and color will be reset by the onPointerMove check below
        console.log("Pin drag ended. Final guess:", playerGuess);
    }
    // Immediately check hover state again after releasing drag/click
    // This ensures the color/cursor/scale are correct based on final mouse position
    onPointerMove(event);
}

// --- Initialization ---
async function initGame() {
    console.log(">>> initGame: Starting game initialization...");

    initMap(); // Sets up scene, camera, renderer, controls
    setupEventListeners(); // Sets up button listeners (including the new start button)
    hideCountryInfoPanel(); // Keep this hidden initially
    initScoreDisplay();
    initDistanceDisplay();
    initCountryLabelDisplay();
    initShootingStars();

    if (musicToggleCheckbox) {
        backgroundMusicStarted = musicToggleCheckbox.checked;
        console.log(`>>> initGame: Music toggle is initially ${backgroundMusicStarted ? 'checked' : 'unchecked'}.`);
    } else {
        console.warn(">>> initGame: musicToggleCheckbox not found.");
    }

    console.log(">>> initGame: Preparing to load data and audio...");
    try {
        // Load audio and data concurrently
        await Promise.all([
            loadAudio(),
            loadCountryData(),
            loadFactsData()
        ]);
        // --- ADD LOG AFTER SUCCESSFUL LOAD ---
        console.log(">>> initGame: Promise.all COMPLETED successfully.");
        console.log(`>>> initGame: countriesData length after load: ${countriesData.length}`);
        // --- END ADD LOG ---

        console.log(">>> initGame: All essential game data and audio loaded.");
        console.log(">>> initGame: Waiting for user to click 'Start Game' button.");

    } catch (error) {
        console.error(">>> initGame: Critical error during initialization:", error);
        // Display a user-friendly error message
         if (startModal && !startModal.classList.contains('hidden')) {
            const modalContent = startModal.querySelector('.modal-content');
             if (modalContent) {
                const errorElement = document.createElement('p');
                errorElement.textContent = 'Error loading game resources. Please refresh the page.';
                errorElement.style.color = 'red';
                errorElement.style.fontWeight = 'bold';
                modalContent.appendChild(errorElement);
             }
         }
         // --- ENSURE START BUTTON IS DISABLED ON ERROR ---
         if(startGameButton) {
            startGameButton.disabled = true;
            console.error(">>> initGame: Start game button DISABLED due to initialization error.");
         }
         // --- END ENSURE ---
    }
    console.log(">>> initGame: Game initialization sequence complete.");
}

// --- Initialize Shooting Stars --- MOVED DEFINITION EARLIER
function initShootingStars() {
    console.log("Initializing shooting stars...");
    shootingStarMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1, // Might not be supported on all platforms, but worth trying
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending, // Make them glow bright
        depthWrite: false, // Keep depthWrite false (don't block things behind stars)
        depthTest: true // <<< CHANGE: Enable depth testing against the globe
    });

    // Define the line segment geometry (origin to a point along -Z)
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0, 0, -SHOOTING_STAR_LENGTH)); // Line points backwards along Z
    const shootingStarGeometry = new THREE.BufferGeometry().setFromPoints(points);

    for (let i = 0; i < NUM_SHOOTING_STARS; i++) {
        const line = new THREE.Line(shootingStarGeometry, shootingStarMaterial);
        line.visible = false; // Start hidden
        line.frustumCulled = false; // Prevent potential culling issues
        scene.add(line);
        shootingStars.push({
            mesh: line,
            velocity: new THREE.Vector3(),
            active: false
        });
    }
    console.log(`Created pool of ${NUM_SHOOTING_STARS} shooting stars.`);
} // --- End Initialize Shooting Stars ---

// --- Add Global Variables for Dragging ---
// ... (rest of the code) ...

// --- NEW Helper Function to Calculate and Set Mobile Panel Height ---
function updateMobilePanelHeight() {
    if (!infoPanelElement || !leftPanelElement || window.innerWidth > 768 || !infoPanelElement.classList.contains('up')) {
        // Only run on mobile when the panel is supposed to be 'up'
        return;
    }

    const viewportHeight = window.innerHeight;
    const leftPanelRect = leftPanelElement.getBoundingClientRect();
    const leftPanelBottom = leftPanelRect.bottom; // Distance from viewport top to left panel bottom

    // Calculate required height: viewport height minus the space above the left panel's bottom edge
    // Add a small buffer (e.g., 5px) so they don't visually touch perfectly
    const buffer = 5;
    let requiredHeight = viewportHeight - leftPanelBottom - buffer;

    // Ensure a minimum height (e.g., handle height + some padding)
    const minHeight = 80; // Adjust as needed
    requiredHeight = Math.max(minHeight, requiredHeight);

    // Ensure it doesn't exceed a maximum reasonable height (e.g., 90vh)
    requiredHeight = Math.min(requiredHeight, viewportHeight * 0.9);

    console.log(`updateMobilePanelHeight: VP: ${viewportHeight}, LP Bottom: ${leftPanelBottom.toFixed(0)}, Required: ${requiredHeight.toFixed(0)}`);
    infoPanelElement.style.height = `${requiredHeight}px`;
}

// --- MODIFY Handler Function for Toggling Panel ---
function onPanelToggleClick(event) {
    const handle = event.target.closest('#info-panel-handle');
    if (handle) {
        console.log(">>> onPanelToggleClick: Handle clicked!");
        const isCurrentlyUp = infoPanelElement.classList.contains('up');

        if (isCurrentlyUp) {
            // --- If currently UP, toggle DOWN ---
            infoPanelElement.classList.remove('up');
            infoPanelElement.style.height = ''; // <<< REMOVE inline style to use CSS default (60px)
            console.log(`Panel toggled DOWN. Has 'up' class: false. Height reset to CSS default.`);
        } else {
            // --- If currently DOWN, toggle UP ---
            infoPanelElement.classList.add('up');
            console.log(`Panel toggled UP. Has 'up' class: true. Calculating dynamic height...`);
            // Calculate and set height AFTER class is added and transition starts
            requestAnimationFrame(updateMobilePanelHeight); // Use rAF for smoother update
        }

        // Log the state AFTER toggling
        // console.log(`Current infoPanelElement height style after toggle: ${infoPanelElement.style.height}`);
    } else {
        console.log(">>> onPanelToggleClick: Click was not on handle.");
    }
}

// --- MODIFY setupEventListeners Function ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- MODIFY START BUTTON LISTENERS ---
    const startGameButton = document.getElementById('start-game-button'); // Get button ref here
    const startWithBoundariesButton = document.getElementById('start-with-boundaries-button'); // Get new button ref

    console.log(">>> setupEventListeners: Checking start buttons:", startGameButton, startWithBoundariesButton);

    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            console.log(">>> Start Game (Hard) button clicked!");
            showBoundaries = false; // Set boundaries OFF
            console.log(">>> Will use texture without boundaries");
            // Update texture if needed (in case we're restarting)
            updateGlobeTexture(); 
            startGame();
        });
        console.log(">>> setupEventListeners: Added click listener to startGameButton.");
    } else {
        console.warn(">>> setupEventListeners: startGameButton element NOT found.");
    }

    if (startWithBoundariesButton) {
        startWithBoundariesButton.addEventListener('click', () => {
            console.log(">>> Start with Boundaries button clicked!");
            showBoundaries = true; // Set boundaries ON
            console.log(">>> Will use texture with boundaries");
            updateGlobeTexture(); // Update the texture before starting the game
            startGame();
        });
        console.log(">>> setupEventListeners: Added click listener to startWithBoundariesButton.");
    } else {
        console.warn(">>> setupEventListeners: startWithBoundariesButton element NOT found.");
    }
    // --- END MODIFY START BUTTON LISTENERS ---

    if (guessButton) {
         // ... existing guessButton listener ...
         guessButton.addEventListener('click', () => {
             tryStartBackgroundMusic(); // Ensure music check on interactions
             playSound('buttonClick');
             handleGuessConfirm();
         });
         console.log("Added listener to guessButton.");
    } else {
         console.warn("guessButton not found, cannot add listener.");
    }

    // --- Check if the listener already exists ---
    if (nextButton && !nextButton.hasEventListener) {
        // Make the listener async if startNewRound is async
        nextButton.addEventListener('click', async () => {
            console.log(">>> nextButton CLICKED! Starting handler logic."); // <<< ADD THIS LOG

            // --- Debounce Check ---
            if (isStartingNextRound) {
                console.warn(">>> nextButton Click: Already processing a round start. Ignoring extra click.");
                return; // Prevent multiple clicks firing simultaneously
            }
            isStartingNextRound = true; // Set flag immediately
            console.log(">>> nextButton Click Handler: Set isStartingNextRound = true.");
            // --- End Debounce Check ---

            // --- MOVE LINE REMOVAL HERE ---
            console.log(">>> nextButton Click Handler: Attempting targeted removal by custom property BEFORE calling startNewRound.");
            try {
                let lineRemoved = false;
                scene.children.slice().forEach(child => {
                    if (child.isTravelLine === true) {
                        console.log(">>> nextButton Click Handler: Found travel line by custom property. Removing:", child);
                        scene.remove(child);
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                        console.log(">>> nextButton Click Handler: Object removed and disposed.");
                        delete child.isTravelLine; // Clean up property
                        lineRemoved = true;
                    }
                });
                if (lineRemoved) {
                    currentDistanceLine = null; // Nullify only if something was actually removed
                    console.log(">>> nextButton Click Handler: Targeted objects removed and currentDistanceLine nulled.");
    } else {
                     console.log(">>> nextButton Click Handler: No travel line found by custom property to remove.");
                     // Log currentDistanceLine state if nothing was found
                     console.log(">>> nextButton Click Handler: currentDistanceLine value:", currentDistanceLine);
                }
            } catch (error) {
                console.error(">>> nextButton Click Handler: Error during line removal:", error);
                currentDistanceLine = null; // Still try to nullify on error
            }
            // --- END MOVE LINE REMOVAL ---

            tryStartBackgroundMusic();
            playSound('buttonClick');
            // console.log(">>> nextButton Click Handler: BEFORE calling startNewRound, currentDistanceLine =", currentDistanceLine); // Log is less critical now

            // Call startNewRound
            await startNewRound();

            // Reset flag AFTER startNewRound completes
            isStartingNextRound = false;
            console.log(">>> nextButton Click Handler: AFTER calling startNewRound, Reset isStartingNextRound = false.");

        });
        console.log("Added listener to nextButton.");
        nextButton.hasEventListener = true;
    } else {
        console.warn("nextButton not found or listener already exists, cannot add listener.");
    }

    // ... (rest of listeners: cloud, shadow, map, etc.) ...
    if (cloudToggleCheckbox) {
         cloudToggleCheckbox.addEventListener('change', handleCloudToggle);
         console.log("Added listener to cloudToggleCheckbox.");
    } // ... else ...
    if (shadowToggleCheckbox) {
         shadowToggleCheckbox.addEventListener('change', handleShadowToggle);
         console.log("Added listener to shadowToggleCheckbox.");
    } // ... else ...
    if (mapContainer) {
        mapContainer.addEventListener('pointerdown', onPointerDown, false);
        mapContainer.addEventListener('pointermove', onPointerMove, false);
        mapContainer.addEventListener('pointerup', onPointerUp, false);
        mapContainer.addEventListener('pointerleave', onPointerUp, false);
        console.log("Added map interaction listeners to mapContainer.");
    } else {
        console.error("setupEventListeners: mapContainer not found, cannot add map interaction listeners.");
    }
    window.addEventListener('resize', onWindowResize);
    console.log("Added listener for window resize.");
    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', () => {
            tryStartBackgroundMusic();
            playSound('buttonClick');
            toggleFullScreen();
        });
        console.log("Added listener to fullscreenButton.");
    } // ... else ...
    window.addEventListener('resize', () => { /* ... */ });
    console.log("Added resize listener for mobile panel height update.");
    if (musicToggleCheckbox) {
        musicToggleCheckbox.checked = backgroundMusicStarted;
        musicToggleCheckbox.addEventListener('change', handleMusicToggle);
        console.log("Added listener to musicToggleCheckbox.");
    } else {
        console.warn("musicToggleCheckbox not found, cannot add listener.");
    }

     console.log("Event listeners setup complete.");
}


// --- Ensure timer starts in startNewRound ---
async function startNewRound() {
    console.log("Starting new round...");
    
    // Update the counter
    updateCountriesLeftCounter();

    // ... (resetting sounds, flags, visuals) ...
    isLineAnimating = false;
    isCameraFollowing = false;

    // Ensure controls are enabled and target is reset
    if (!controls.enabled) {
        console.log("Controls were disabled, re-enabling in startNewRound.");
        controls.enabled = true;
    }
    controls.target.set(0, 0, 0);
    controls.update(); // Update controls state

    // ... (hiding panel, resetting guess state, removing visuals) ...
    hideCountryInfoPanel();
    isGuessLocked = false;
    currentLineCurve = null;
    removePin();
    removeTargetRings();
    // --- PREVENT BOUNDARY REMOVAL ---
    // removeHighlightedBoundaries(); // <<< COMMENT OUT OR DELETE THIS LINE
    // --------------------------------
    if (currentDistanceLine) { /* ... remove line ... */ }
    if (distanceTextSprite) distanceTextSprite.visible = false;
    if (scoreSprite) scoreSprite.visible = false;
    if (countryLabelSprite) countryLabelSprite.visible = false;


    currentCountry = selectRandomCountry(); // Get the next country from the shuffled list

    // --- GAME OVER CHECK ---
    if (!currentCountry) {
        console.log(">>> GAME OVER: No more countries left to guess!");
        // Display Game Over message
        document.getElementById('country-name-display').innerText = "GAME OVER!";
        distanceElement.textContent = `Final Score: ${score}`; // Show final score
        // Optionally hide timer or other elements
        document.getElementById('timer-display').style.visibility = 'hidden';
        // Disable buttons permanently for this session
        if (guessButton) guessButton.disabled = true;
        if (nextButton) {
             nextButton.disabled = true;
             // Consider adding a 'Play Again' button visibility toggle here
        }
        // Maybe show a game over overlay or modal
        // You could re-purpose the startModal or create a new one
        // e.g., const gameOverModal = document.getElementById('game-over-modal');
        //       if (gameOverModal) gameOverModal.classList.remove('hidden');

        return; // Stop the function here
    }
    // --- END GAME OVER CHECK ---

    console.log(`Selected country: ${currentCountry.name}`);

    // ... (update UI elements like distance, country name) ...
    distanceElement.textContent = 'N/A';
    document.getElementById('country-name-display').innerText = currentCountry.name;
    document.getElementById('timer-display').style.visibility = 'visible'; // Ensure timer is visible
    resetTimerDisplay(); // Reset timer display text

    // --- START THE TIMER ---
    startTimer(); // <<< THIS IS WHERE THE TIMER BEGINS FOR THE ROUND
    // ---------------------

    // --- Disable Buttons ---
    if (guessButton) guessButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    if (nextButton) nextButton.style.display = 'block'; // Ensure visible but disabled

    console.log(`[startNewRound] New round setup complete for: ${currentCountry.name}. Timer started.`);

    // --- NO flag reset here (handled in listener) ---
}

// ... (rest of script.js) ...

// --- MODIFY showCountryInfoPanel Function (Minor adjustment) ---
function showCountryInfoPanel(country) {
    console.log(">>> showCountryInfoPanel called with country:", country);
    if (!country || !country.name) {
        console.warn(">>> showCountryInfoPanel: Invalid country object received.");
        return;
    }
    const countryName = country.name;
    const countryCode = country.alpha2Code;

    // --- Prepare Content Parts ---
    // ... (flagHtml, factsHtml generation remains the same) ...
    let flagHtml = '';
    if (countryCode) {
        const flagUrl = `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
        flagHtml = `<img src="${flagUrl}" alt="Flag of ${countryName}" class="country-flag" onerror="this.style.display='none'; console.error('Failed to load flag: ${flagUrl}');">`;
    } else {
        flagHtml = `<div class="no-flag">(Flag unavailable - Missing/Invalid Code)</div>`;
    }

    let factsHtml = '';
    let facts = null;
    if (allCountryFacts && typeof allCountryFacts === 'object' && allCountryFacts !== null) {
        facts = allCountryFacts[countryName];
    }
    if (facts && typeof facts === 'string') {
        const factList = facts.split('. ').filter(f => f.trim() !== '');
        factsHtml = `<div class="country-facts">${factList.map(f => `<p>${f}.</p>`).join('')}</div>`;
    } else {
        factsHtml = "<div class='country-facts'><p>No specific facts available for this country yet.</p></div>";
    }

    // --- Construct Panel Inner HTML ---
    infoPanelElement.innerHTML = `
        <div id="info-panel-handle">
             <span>${country.name}</span>
        </div>
        <div id="info-panel-content">
             ${flagHtml}
             <hr>
             ${factsHtml}
        </div>
    `;

    // --- Set Initial Styles & Make Visible ---
    infoPanelElement.style.display = 'block';
    infoPanelElement.classList.remove('up');
    infoPanelElement.style.overflow = 'hidden';
    infoPanelElement.style.height = ''; // Ensure no initial inline height

    // --- Attach CLICK Listener ---
    setTimeout(() => {
        const freshHandleElement = infoPanelElement.querySelector('#info-panel-handle');
        if (freshHandleElement) {
            freshHandleElement.removeEventListener('click', onPanelToggleClick);
            freshHandleElement.addEventListener('click', (event) => {
                tryStartBackgroundMusic(); // <<< ADD
                playSound('buttonClick');
                onPanelToggleClick(event);
            });
            console.log("Added toggle click listener with sound to panel handle (after timeout).");
        } // ... else ...
    }, 50);

    // ... rest of function ...
}

// --- MODIFY hideCountryInfoPanel ---
function hideCountryInfoPanel() {
    if (infoPanelElement) {
    infoPanelElement.style.display = 'none'; // Hide
    infoPanelElement.classList.remove('up'); // Reset state
        infoPanelElement.style.height = ''; // <<< Ensure inline height is cleared when hidden

        const handleElement = infoPanelElement.querySelector('#info-panel-handle');
        if (handleElement) {
            handleElement.removeEventListener('click', onPanelToggleClick);
            console.log("Removed panel toggle click listener.");
        }
    infoPanelElement.innerHTML = ''; // Clear content
    }
}

// ... rest of script ...

// REMOVE the old initGame listener if it exists at the very bottom
// window.removeEventListener('load', initGame); // Remove if present
// ADD the listener reliably
window.addEventListener('load', initGame);


// ... (Point-in-Polygon Logic) ...
function isPointInCountry(pointCoords, countryGeometry) {
    console.log(`Checking if point (${pointCoords.lat}, ${pointCoords.lon}) is in country...`);
    
    // For debug purposes, let's log the country geometry
    console.log(`Country geometry type: ${countryGeometry.type}`);
    if (countryGeometry.type === 'Polygon') {
        console.log(`Number of polygon coordinate sets: ${countryGeometry.coordinates.length}`);
        console.log(`First coordinates set length: ${countryGeometry.coordinates[0].length}`);
    }
    
    // Convert coordinates to the format expected by turf.js
    // We'll implement a simpler check since we don't have turf.js
    
    const type = countryGeometry.type;
    const coordinates = countryGeometry.coordinates;
    
    // Normalize longitude values to handle crossing the date line
    let testLon = pointCoords.lon;
    while (testLon > 180) testLon -= 360;
    while (testLon < -180) testLon += 360;
    
    if (type === 'Polygon') {
        return pointInSphericalPolygon(pointCoords.lat, testLon, coordinates[0]);
    } 
    else if (type === 'MultiPolygon') {
        for (let i = 0; i < coordinates.length; i++) {
            if (pointInSphericalPolygon(pointCoords.lat, testLon, coordinates[i][0])) {
                console.log(`Point found in MultiPolygon part ${i}`);
                return true;
            }
        }
    }
    
    console.log(`Point is NOT in country`);
    return false;
}

// Improved algorithm for point-in-polygon on a sphere
function pointInSphericalPolygon(lat, lon, polygonCoords) {
    // Convert to radians
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    
    // Convert point to cartesian coordinates
    const pointX = Math.cos(latRad) * Math.cos(lonRad);
    const pointY = Math.cos(latRad) * Math.sin(lonRad);
    const pointZ = Math.sin(latRad);
    
    // Convert polygon coordinates to cartesian and calculate winding number
    let windingNumber = 0;
    
    console.log(`Testing point (${lat}, ${lon}) against polygon with ${polygonCoords.length} points`);
    
    // Build a 2D array of longitude/latitude values
    const polygonDegrees = [];
    for (let i = 0; i < polygonCoords.length; i++) {
        const coord = polygonCoords[i];
        
        // Ensure we're working with proper coordinates
        if (Array.isArray(coord) && coord.length >= 2) {
            // Normalize longitude values
            let coordLon = coord[0];
            while (coordLon > 180) coordLon -= 360;
            while (coordLon < -180) coordLon += 360;
            
            polygonDegrees.push([coordLon, coord[1]]);
        } else {
            console.warn(`Invalid coordinate at index ${i}:`, coord);
        }
    }
    
    // Debug output of a few coordinates
    for (let i = 0; i < Math.min(5, polygonDegrees.length); i++) {
        console.log(`Polygon point ${i}: (${polygonDegrees[i][1]}, ${polygonDegrees[i][0]})`);
    }
    
    // Use the winding number algorithm in longitude/latitude space
    let inside = false;
    for (let i = 0, j = polygonDegrees.length - 1; i < polygonDegrees.length; j = i++) {
        const xi = polygonDegrees[i][0], yi = polygonDegrees[i][1];
        const xj = polygonDegrees[j][0], yj = polygonDegrees[j][1];
        
        // Handle potential wrap-around near the date line
        let dLon = xj - xi;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        
        // We only need to check if the latitude of the test point is between the latitudes of the two endpoints
        // and if the test point is to the right of the edge
        if (((yi <= lat && lat < yj) || (yj <= lat && lat < yi)) && 
            (lon < xi + dLon * (lat - yi) / (yj - yi))) {
            inside = !inside;
        }
    }
    
    console.log(`Winding number check result: ${inside}`);
    
    // Add a more lenient distance check as a backup method
    // If the point is very close to any of the polygon vertices, consider it inside
    const TOLERANCE_KM = 20; // 20km tolerance
    
    for (let i = 0; i < polygonDegrees.length; i++) {
        const vertexLat = polygonDegrees[i][1];
        const vertexLon = polygonDegrees[i][0];
        
        const distance = calculateDistance(lat, lon, vertexLat, vertexLon);
        if (distance < TOLERANCE_KM) {
            console.log(`Point is within ${TOLERANCE_KM}km of vertex ${i} (${distance.toFixed(2)}km)`);
            return true;
        }
    }
    
    // For very small countries, we'll add another check based on the distance to the center
    // Calculate center of the polygon
    let centerLat = 0, centerLon = 0;
    for (let i = 0; i < polygonDegrees.length; i++) {
        centerLat += polygonDegrees[i][1];
        centerLon += polygonDegrees[i][0];
    }
    centerLat /= polygonDegrees.length;
    centerLon /= polygonDegrees.length;
    
    // For small countries, a distance-based approach might be more reliable
    const distanceToCenter = calculateDistance(lat, lon, centerLat, centerLon);
    
    // Estimate the "radius" of the country by checking distance from center to vertices
    let maxRadiusKm = 0;
    for (let i = 0; i < polygonDegrees.length; i++) {
        const vertexLat = polygonDegrees[i][1];
        const vertexLon = polygonDegrees[i][0];
        
        const distToVertex = calculateDistance(centerLat, centerLon, vertexLat, vertexLon);
        maxRadiusKm = Math.max(maxRadiusKm, distToVertex);
    }
    
    // Add a buffer zone
    const bufferZone = Math.max(50, maxRadiusKm * 0.1); // Either 50km or 10% of the max radius
    
    console.log(`Country center: (${centerLat.toFixed(2)}, ${centerLon.toFixed(2)}), Max radius: ${maxRadiusKm.toFixed(2)}km`);
    console.log(`Distance to center: ${distanceToCenter.toFixed(2)}km, Buffer zone: ${bufferZone.toFixed(2)}km`);
    
    // If close enough to center relative to country size, consider it a match
    if (distanceToCenter < maxRadiusKm + bufferZone) {
        console.log(`Point is within country radius + buffer zone (${(maxRadiusKm + bufferZone).toFixed(2)}km)`);
        
        // Only override if the country is small or the point is very close to the center
        if (maxRadiusKm < 500 || distanceToCenter < maxRadiusKm * 0.5) {
            console.log(`Considering point inside country due to proximity to center`);
            return true;
        }
    }
    
    // Return the original check result
    return inside;
}

// --- MOVED Handler function for the cloud toggle ---
function handleCloudToggle(event) {
    if (cloudMesh) { // Check if cloud mesh exists
        cloudMesh.visible = event.target.checked; // Set visibility based on checkbox state
        console.log(`Cloud visibility set to: ${cloudMesh.visible}`);
    } else {
        console.warn("Cloud toggle changed, but cloudMesh doesn't exist.");
    }
}

// --- MOVED Handler function for the shadow toggle ---
function handleShadowToggle(event) {
    const shadowsEnabled = event.target.checked;
    renderer.shadowMap.enabled = shadowsEnabled;

    if (shadowsEnabled) {
        // --- Shadows ON ---
        if (sunLight) {
             // <<< REVERT Sun Intensity >>>
             sunLight.intensity = 0.9;
             scene.add(sunLight);
             console.log("Shadows ON: Added sunLight with intensity 0.9.");
        } else { /* error */ }
        // <<< REVERT Ambient Intensity >>>
        if (ambientLight) ambientLight.intensity = 0.9; // Back to 0.9
        console.log("Shadows ON: Set ambient intensity to 0.9.");

    } else {
        // --- Shadows OFF ---
        if (sunLight) {
            scene.remove(sunLight);
            console.log("Shadows OFF: Removed sunLight.");
        }
        // <<< REVERT Ambient Intensity >>>
        if (ambientLight) ambientLight.intensity = 1.2; // Back to 1.2
         console.log("Shadows OFF: Set ambient intensity to 1.2.");
    }
} 

// --- Point-in-Polygon Logic ---
// ... function definitions ...

// --- MOVED: Initialize Score Display ---
function initScoreDisplay() {
    console.log("Initializing score display elements...");
    scoreCanvas = document.getElementById('score-canvas');
    if (!scoreCanvas) {
        console.error("Score canvas element not found!");
        return;
    }
    scoreCanvas.width = SCORE_CANVAS_WIDTH;
    scoreCanvas.height = SCORE_CANVAS_HEIGHT;
    scoreCanvasContext = scoreCanvas.getContext('2d');

    // Initial canvas clear and style setup
    scoreCanvasContext.font = `bold ${SCORE_FONT_SIZE}px Arial`;
    scoreCanvasContext.fillStyle = SCORE_COLOR;
    scoreCanvasContext.textAlign = 'center';
    scoreCanvasContext.textBaseline = 'middle';
    scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height); // Start clean

    scoreTexture = new THREE.CanvasTexture(scoreCanvas);
    scoreTexture.needsUpdate = true; // Initial update

    const scoreMaterial = new THREE.SpriteMaterial({
        map: scoreTexture,
        transparent: true,
        depthWrite: false, // Don't obscure things behind it
        depthTest: true,
         sizeAttenuation: true // Allow scaling with distance
    });

    scoreSprite = new THREE.Sprite(scoreMaterial);
    scoreSprite.scale.set(SCORE_SPRITE_SCALE, SCORE_SPRITE_SCALE * (SCORE_CANVAS_HEIGHT / SCORE_CANVAS_WIDTH), 1); // Adjust scale based on aspect ratio
    scoreSprite.position.set(0, 10000, 0); // Start hidden far away
    scoreSprite.visible = false;
    scene.add(scoreSprite);
    console.log("Score display initialized.");
}

// --- MOVED: Initialize Distance Text Display ---
function initDistanceDisplay() {
    console.log("Initializing distance text display elements...");
    // Create canvas dynamically
    distanceCanvas = document.createElement('canvas');
    if (!distanceCanvas) {
        console.error("Failed to create distance canvas element!");
        return;
    }
    distanceCanvas.width = SCORE_CANVAS_WIDTH; // Reuse score canvas dimensions for simplicity
    distanceCanvas.height = SCORE_CANVAS_HEIGHT / 2; // Can be shorter
    distanceContext = distanceCanvas.getContext('2d');

    // Initial canvas clear and style setup
    distanceContext.font = `bold ${SCORE_FONT_SIZE * 0.8}px Arial`; // Slightly smaller font
    distanceContext.fillStyle = '#ffffff'; // White text
    distanceContext.textAlign = 'center';
    distanceContext.textBaseline = 'middle';
    distanceContext.clearRect(0, 0, distanceCanvas.width, distanceCanvas.height);

    distanceTexture = new THREE.CanvasTexture(distanceCanvas);

    const distanceMaterial = new THREE.SpriteMaterial({
        map: distanceTexture,
        transparent: true,
        depthWrite: false,
        depthTest: true, // Test against other objects
        sizeAttenuation: true
    });

    distanceTextSprite = new THREE.Sprite(distanceMaterial);
    // Adjust scale based on new canvas aspect ratio
    distanceTextSprite.scale.set(SCORE_SPRITE_SCALE * 0.8, SCORE_SPRITE_SCALE * 0.8 * (distanceCanvas.height / distanceCanvas.width), 1);
    distanceTextSprite.position.set(0, 10000, 0); // Start hidden
    distanceTextSprite.visible = false;
    scene.add(distanceTextSprite);
    console.log("Distance text display initialized.");
}

// --- Fullscreen Toggle Function ---
function toggleFullScreen() {
    if (!document.fullscreenElement &&    // Standard syntax
        !document.mozFullScreenElement && // Firefox
        !document.webkitFullscreenElement && // Chrome, Safari and Opera
        !document.msFullscreenElement) {  // IE/Edge

        console.log("Entering fullscreen...");
        const element = document.documentElement; // Fullscreen the whole page
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { // Firefox
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (element.msRequestFullscreen) { // IE/Edge
            element.msRequestFullscreen();
        }
        // Optional: Change button icon to 'collapse'
        if (fullscreenButton) {
            fullscreenButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M10 19H5v-5h2v3h3v2zm-5-7H3V7h7v2H5v3zm11 7h-5v-2h3v-3h2v5zm-2-9V5h-3V3h5v7h-2V8z"/>
                </svg>
            `;
            fullscreenButton.title = "Exit Fullscreen";
        }

    } else { // Currently fullscreen, exit
        console.log("Exiting fullscreen...");
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
         // Optional: Change button icon back to 'expand'
         if (fullscreenButton) {
             fullscreenButton.innerHTML = `
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                     <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-5v-2h3v-3h2v5zm-2-9V5h-3V3h5v7h-2V8z"/>
                 </svg>
             `;
             fullscreenButton.title = "Enter Fullscreen";
        }
    }
}
// --- End Fullscreen Toggle Function ---

// --- Audio ---
let sounds = {}; // Object to hold loaded Audio objects
let isAudioLoaded = false;
const audioFiles = {
    buttonClick: 'assets/audio/button_click.mp3',
    correctGuess: 'assets/audio/correct_guess.mp3',
    incorrectGuess: 'assets/audio/incorrect_guess.mp3',
    travelLine: 'assets/audio/travel_line.mp3',
    pinPlace: 'assets/audio/pin_place.mp3',
    backgroundMusic: 'assets/audio/background_music.mp3',
    scoreIncrease: 'assets/audio/score_increase.mp3'
};

// --- Audio Functions ---
// ... (loadAudio, playSound, stopSound) ...

function tryStartBackgroundMusic() {
    // <<< REMOVE CHECK FOR TOGGLE STATE and playSound call >>>
    // Only set the flag if it hasn't been set yet, regardless of toggle state
    if (!backgroundMusicStarted) {
        console.log("First user interaction detected. Music start will be handled by startGame or toggle.");
        backgroundMusicStarted = true; // Set flag to prevent repeated checks, actual playback happens elsewhere.
    }
}
// --- End Audio Functions ---
// <<< END MOVE >>>

// ... after handleShadowToggle ...

// --- Handler function for the music toggle ---
function handleMusicToggle(event) {
    const musicEnabled = event.target.checked;

    if (musicEnabled) {
        // --- Directly attempt to play when toggled ON ---
        if (isAudioLoaded && sounds.backgroundMusic) {
            console.log("Music toggle ON - attempting to play/resume background music via playSound.");
            playSound('backgroundMusic'); // Use playSound which handles errors/state
            backgroundMusicStarted = true; // Keep flag consistent
        } else {
            console.log("Music toggle ON - music not loaded yet.");
        }
    } else {
        // --- Pause when toggled OFF ---
        if (isAudioLoaded && sounds.backgroundMusic && !sounds.backgroundMusic.paused) {
            console.log("Music toggle OFF - pausing background music.");
            sounds.backgroundMusic.pause(); // Directly pause here
            backgroundMusicStarted = false; // Reflect that it's intentionally stopped
        } else {
            console.log("Music toggle OFF - music already paused or not loaded.");
        }
    }
}
// --- End Handler ---

// --- Point-in-Polygon Logic ---
// ...

// --- Initialize Country Label Display ---
function initCountryLabelDisplay() {
    console.log("Initializing country label display elements...");
    countryLabelCanvas = document.getElementById('country-label-canvas');

    // <<< ADD THIS CHECK/LOG >>>
    if (!countryLabelCanvas) {
        console.error(">>> FATAL: Country label canvas element ('#country-label-canvas') NOT FOUND in HTML!");
        // Ensure dependent variables are not assigned if canvas is missing
        countryLabelContext = null;
        countryLabelTexture = null;
        countryLabelSprite = null;
        return; // Exit the function early if canvas isn't found
    } else {
        console.log(">>> SUCCESS: Country label canvas element found."); // Confirm it was found
    }
    // <<< END CHECK/LOG >>>


    countryLabelCanvas.width = COUNTRY_LABEL_CANVAS_WIDTH;
    countryLabelCanvas.height = COUNTRY_LABEL_CANVAS_HEIGHT;
    countryLabelContext = countryLabelCanvas.getContext('2d');

    // Initial canvas clear and style setup
    countryLabelContext.font = `bold ${COUNTRY_LABEL_FONT_SIZE}px Arial`;
    countryLabelContext.fillStyle = COUNTRY_LABEL_COLOR;
    countryLabelContext.textAlign = 'center';
    countryLabelContext.textBaseline = 'middle';
    countryLabelContext.clearRect(0, 0, countryLabelCanvas.width, countryLabelCanvas.height); // Start clean

    countryLabelTexture = new THREE.CanvasTexture(countryLabelCanvas);

    const labelMaterial = new THREE.SpriteMaterial({
        map: countryLabelTexture,
        transparent: true,
        depthWrite: false,
        depthTest: true, // Test against other objects
        sizeAttenuation: true // Allow scaling with distance
    });

    countryLabelSprite = new THREE.Sprite(labelMaterial);

    // <<< START MODIFICATION: Apply conditional scale >>>
    const isMobile = window.innerWidth <= 768;
    const baseScaleX = isMobile ? COUNTRY_LABEL_SPRITE_SCALE_MOBILE : COUNTRY_LABEL_SPRITE_SCALE;
    const baseScaleY = baseScaleX * (COUNTRY_LABEL_CANVAS_HEIGHT / COUNTRY_LABEL_CANVAS_WIDTH); // Maintain aspect ratio based on canvas dimensions

    // Set scale based on device type
    countryLabelSprite.scale.set(
        baseScaleX,
        baseScaleY,
        1 // Z scale remains 1
    );
    // <<< END MODIFICATION >>>

    countryLabelSprite.position.set(0, 10000, 0); // Start hidden
    countryLabelSprite.visible = false;
    scene.add(countryLabelSprite);
    console.log(`Country label display initialized (sprite added). Mobile: ${isMobile}, ScaleX: ${baseScaleX.toFixed(2)}`); // Modified log
}

// --- Function to Update and Show Country Label ---
function updateCountryLabel(countryName, centerVector) {
    if (!countryLabelSprite || !countryLabelContext || !countryLabelTexture) {
        console.warn("Cannot update country label, elements not initialized.");
        return;
    }
    if (!countryName || !centerVector || centerVector.lengthSq() < 0.01) {
        console.warn("Cannot update country label: Invalid name or center vector.");
        countryLabelSprite.visible = false;
        return;
    }

    // Clear canvas
    countryLabelContext.clearRect(0, 0, countryLabelCanvas.width, countryLabelCanvas.height);

    // --- START DYNAMIC FONT SIZE LOGIC ---
    let fontSize = COUNTRY_LABEL_FONT_SIZE; // Start with default size
    const minFontSize = 18; // Minimum acceptable font size
    const padding = 20; // Horizontal padding within canvas
    const maxWidth = countryLabelCanvas.width - padding;

    countryLabelContext.font = `bold ${fontSize}px Arial`; // Set initial font for measurement
    let textMetrics = countryLabelContext.measureText(countryName);
    let textWidth = textMetrics.width;

    // Reduce font size until it fits or hits the minimum
    while (textWidth > maxWidth && fontSize > minFontSize) {
        fontSize--;
        countryLabelContext.font = `bold ${fontSize}px Arial`;
        textMetrics = countryLabelContext.measureText(countryName);
        textWidth = textMetrics.width;
        console.log(`Reduced country label font size to ${fontSize}px for "${countryName}"`); // Log reduction
    }
    // --- END DYNAMIC FONT SIZE LOGIC ---

    // Set final style and draw text
    countryLabelContext.fillStyle = COUNTRY_LABEL_COLOR;
    countryLabelContext.textAlign = 'center';
    countryLabelContext.textBaseline = 'middle';
    countryLabelContext.fillText(countryName, countryLabelCanvas.width / 2, countryLabelCanvas.height / 2);

    countryLabelTexture.needsUpdate = true;

    // Calculate position radially above the center vector
    const labelPosition = centerVector.clone()
        .normalize()
        .multiplyScalar(EARTH_RADIUS + COUNTRY_LABEL_OFFSET);

    countryLabelSprite.position.copy(labelPosition);
    countryLabelSprite.visible = true;
    console.log(`Displaying country label "${countryName}" with font size ${fontSize}px`); // Log final size
}

// ... rest of the script ...

function showCountryLabel(countryName) {
    countryLabelCanvasContext.clearRect(0, 0, countryLabelCanvas.width, countryLabelCanvas.height);

    let fontSize = 40; // Initial font size
    countryLabelCanvasContext.font = `${fontSize}px Arial`;
    let textWidth = countryLabelCanvasContext.measureText(countryName).width;

    // Reduce font size if text is too wide
    while (textWidth > countryLabelCanvas.width - 20 && fontSize > 10) {
        fontSize--;
        countryLabelCanvasContext.font = `${fontSize}px Arial`;
        textWidth = countryLabelCanvasContext.measureText(countryName).width;
    }

    countryLabelCanvasContext.fillStyle = 'white';
    countryLabelCanvasContext.textAlign = 'center';
    countryLabelCanvasContext.textBaseline = 'middle';
    countryLabelCanvasContext.fillText(countryName, countryLabelCanvas.width / 2, countryLabelCanvas.height / 2);
    countryLabelTexture.needsUpdate = true;
    countryLabelSprite.visible = true;
}

function createDistanceLine(startPoint, endPoint) {
    // ... (remove existing line) ...

    const points = [];
    const numPoints = 50;
    // ... (calculate points along the arc) ...

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
        depthTest: false // <<< ADD THIS
    });

    currentDistanceLine = new THREE.Line(lineGeometry, lineMaterial);
    // currentDistanceLine.renderOrder = 3; // <<< REMOVE THIS
    scene.add(currentDistanceLine);
    // ... (rest of the function) ...
}

// --- If using depthTest: false ---
// const lineMaterial = new THREE.LineBasicMaterial({
//     color: 0xff0000,
//     linewidth: 2,
//     transparent: true,
//     opacity: 0.8,
//     depthTest: false // <<< UNCOMMENT THIS
// });
// currentDistanceLine = new THREE.Line(lineGeometry, lineMaterial);
// // currentDistanceLine.renderOrder = 3; // <<< REMOVE OR COMMENT OUT THIS LINE
// scene.add(currentDistanceLine);

function createOrUpdateBoundary(geoJson, countryName) {
    // ... (existing code for creating the boundary mesh) ...

    const boundaryMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00, // Yellow color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        depthTest: false // <<< ADD THIS
    });

    const boundary = new THREE.Mesh(geometry, boundaryMaterial);
    // boundary.renderOrder = 2; // <<< REMOVE THIS
    scene.add(boundary);

    // ... (rest of the function) ...
}

let timerStartTime;
let elapsedTime = 0;
let timerInterval;
let isTimerRunning = false;

function startTimer() {
    timerStartTime = performance.now();
    isTimerRunning = true;
    timerInterval = setInterval(updateTimer, 10); // Update every 10ms
}

function stopTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
}

function updateTimer() {
    if (isTimerRunning) {
        elapsedTime = performance.now() - timerStartTime;
        const formattedTime = (elapsedTime / 1000).toFixed(2); // Convert to seconds
        document.getElementById('timer-display').innerText = formattedTime;
    }
}

function resetTimerDisplay() {
    document.getElementById('timer-display').innerText = "0.00";
}

window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
});

function setupCameraCollision() {
    if (controls) {
        // Define angle limits (in radians)
        const minPolarAngle = 0.1; // radians - prevent looking directly down
        const maxPolarAngle = Math.PI * 0.9; // radians - prevent looking directly up
        const minAzimuthAngle = -Infinity; // radians - allow full horizontal rotation
        const maxAzimuthAngle = Infinity; // radians - allow full horizontal rotation

        controls.minPolarAngle = minPolarAngle;
        controls.maxPolarAngle = maxPolarAngle;
        controls.minAzimuthAngle = minAzimuthAngle;
        controls.maxAzimuthAngle = maxAzimuthAngle;
    }
}

// Call this function after you initialize your OrbitControls and globe
function init() {
  // ... existing code ...

  // Make sure 'globe' is defined and is your THREE.Mesh object
  globe = createGlobe(); // Or however you create your globe mesh

  setupCameraCollision();
}

// --- NEW FUNCTION TO START THE GAME ---
function startGame() {
    console.log(`>>> startGame: Starting game with showBoundaries = ${showBoundaries}`); // Log the state

    // --- ADD CLASS TO BODY TO REMOVE BLUR ---
    document.body.classList.add('game-active');
    console.log(">>> startGame: Added 'game-active' class to body.");
    // --- END ADD CLASS ---

    if (startModal) {
        startModal.classList.add('hidden'); // Hide the modal using the CSS class
        console.log(">>> startGame: Start modal hidden.");
    } else {
        console.warn(">>> startGame: Start modal element not found.");
    }

    // --- SHOW LEFT PANEL ---
    if (leftPanelElement) {
        leftPanelElement.style.display = 'flex'; // Set display back to flex
        console.log(">>> startGame: Left panel displayed.");
    } else {
        console.warn(">>> startGame: Left panel element not found.");
    }
    // --- END SHOW LEFT PANEL ---

    // --- AUTO-FULLSCREEN ON MOBILE ---
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        console.log(">>> startGame: Mobile detected, attempting to go fullscreen.");
        toggleFullScreen(); // Call the fullscreen function
    } else {
        console.log(">>> startGame: Not mobile, skipping fullscreen.");
    }
    // --- END AUTO-FULLSCREEN ---

    // --- PREPARE AND SHUFFLE COUNTRIES FOR THIS SESSION ---
    if (countriesData && countriesData.length > 0) {
        remainingCountries = [...countriesData]; // Create a copy
        shuffleArray(remainingCountries); // Shuffle the copy
        console.log(`>>> startGame: Initialized and shuffled ${remainingCountries.length} countries for this session.`);
        
        // Update the counter
        updateCountriesLeftCounter();
    } else {
        console.error(">>> startGame: Cannot initialize remaining countries, base data is empty.");
        // Handle this error - maybe prevent game start?
        // You might want to show an error message here as well.
        return; // Stop startGame if no data
    }
    // --- END PREPARE AND SHUFFLE ---


    // Now actually start the first round
    if (remainingCountries.length > 0) { // Check the shuffled list now
        console.log(">>> startGame: Attempting to start first round...");
        startNewRound(); // This will handle country selection, timer start, etc.
        console.log(">>> startGame: startNewRound() called.");

        // --- START MUSIC IF TOGGLED ON ---
        if (isAudioLoaded && sounds.backgroundMusic && musicToggleCheckbox && musicToggleCheckbox.checked) {
            console.log(">>> startGame: Music toggle is ON. Attempting to play background music.");
            playSound('backgroundMusic');
            backgroundMusicStarted = true; // Ensure flag is set now that we've tried to play
        } else {
            console.log(">>> startGame: Music toggle is OFF or music not ready. Background music not started.");
            backgroundMusicStarted = true; // Still set flag to prevent other interactions from trying
        }
        // -----------------------------

        // --- START MOBILE CAMERA ADJUSTMENT ---
        // ... (mobile camera logic remains the same) ...
        if (isMobile) {
            console.log(">>> startGame: Mobile detected, adjusting initial camera position and target.");
            const mobileZoom = 12;
            camera.position.set(0, 0, mobileZoom);
            const targetOffsetY = -0.8;
            controls.target.set(0, targetOffsetY, 0);
            controls.update();
            console.log(`>>> startGame: Camera pos: (0, 0, ${camera.position.z.toFixed(1)}), Target: (0, ${controls.target.y.toFixed(1)}, 0)`);
        }
        // --- END MOBILE CAMERA ADJUSTMENT ---

    } else {
        console.error(">>> startGame: Cannot start round, remaining countries list is empty after initialization (this shouldn't happen if countriesData loaded).");
        // Handle error appropriately
    }
}
// --- END NEW FUNCTION ---

const MOBILE_INITIAL_ZOOM = 14; // Or similar value
const MOBILE_TARGET_OFFSET_Y = -1.0; // Or similar value
const MOBILE_FINAL_ZOOM = 12; // Or similar value
const MOBILE_MIN_DISTANCE_AFTER_GUESS = 7; // Or similar value

// Create a new function to update the globe texture
function updateGlobeTexture() {
    // Check if globe exists and needs updating
    if (!globe || !scene) {
        console.error(">>> updateGlobeTexture: Globe or scene not initialized!");
        return;
    }

    const textureFile = showBoundaries ? 'assets/world_texture_boundaries.jpg' : 'assets/world_texture_2.jpg';
    // Check if the texture is already the correct one (optimization)
    if (globe.material.map && globe.material.map.image && globe.material.map.image.src.includes(textureFile.split('/').pop())) {
         console.log(`>>> updateGlobeTexture: Texture ${textureFile} already loaded. No update needed.`);
         return;
    }

    console.log(`>>> updateGlobeTexture: Preparing to update globe with texture: ${textureFile}`);

    // --- Dispose of old resources ---
    if (globe) {
        console.log(">>> updateGlobeTexture: Removing old globe from scene.");
        scene.remove(globe);
        if (globe.geometry) {
            globe.geometry.dispose();
            console.log(">>> updateGlobeTexture: Disposed old globe geometry.");
        }
        if (globe.material) {
            // Dispose textures attached to the old material
            if (globe.material.map) globe.material.map.dispose();
            if (globe.material.normalMap) globe.material.normalMap.dispose();
            if (globe.material.roughnessMap) globe.material.roughnessMap.dispose();
            if (globe.material.displacementMap) globe.material.displacementMap.dispose();
            globe.material.dispose();
            console.log(">>> updateGlobeTexture: Disposed old globe material and its textures.");
        }
    }
    // Nullify the global reference temporarily
    globe = null; 
    globeMaterial = null;
    // --- End Disposal ---

    const textureLoader = new THREE.TextureLoader();

    // Load all necessary textures
    console.log(`>>> updateGlobeTexture: Loading new textures...`);
    const newTexture = textureLoader.load(textureFile);
    const newNormalTexture = textureLoader.load('assets/world_texture_2normal.png');
    const newRoughnessTexture = textureLoader.load('assets/world_texture_2specular.png');
    const newDisplacementTexture = textureLoader.load('assets/earth_displacement.png');

    // Use Promise.allSettled or similar if fine-grained loading status is needed,
    // but for simplicity, we'll assume they load. Add error handlers to loads if needed.

    // Create fresh geometry and material
    const newGlobeGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 256, 256);
    
    // Assign to global material variable
    globeMaterial = new THREE.MeshStandardMaterial({
        map: newTexture,
        normalMap: newNormalTexture,
        roughnessMap: newRoughnessTexture,
        displacementMap: newDisplacementTexture, 
        displacementScale: 0.1,                  // <<< REDUCED value (was 0.2)
        // ... other consistent material properties
    });

    // Create new globe mesh using the global variable
    globe = new THREE.Mesh(newGlobeGeometry, globeMaterial);
    globe.receiveShadow = true;

    // Add it back to the scene
    scene.add(globe);

    console.log(">>> Globe recreated and added to scene with new texture!");
}

// --- Helper function to shuffle an array (Fisher-Yates Algorithm) ---
function shuffleArray(array) {
    console.log(`Shuffling array of length ${array.length}...`);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    console.log("Shuffling complete.");
}

function updateCountriesLeftCounter() {
    const counterElement = document.getElementById('countries-left');
    const count = remainingCountries.length;
    counterElement.textContent = count;

    // Apply dynamic styling
    counterElement.classList.remove('low', 'last');
    if (count <= 5) {
        counterElement.classList.add('low');
    }
    if (count === 1) {
        counterElement.classList.add('last');
    }
}

// Call this function in `startGame` and `startNewRound` instead of directly setting the text.