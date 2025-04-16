console.log(">>> script.js: File loaded, starting execution..."); // <<< ADDED VERY TOP LOG

const EARTH_RADIUS = 5;

// --- DOM Elements ---
const countryNameElement = document.getElementById('country-name');
const scoreElement = document.getElementById('score');
const distanceElement = document.getElementById('distance');
const mapContainer = document.getElementById('map-container');
const guessButton = document.getElementById('guess-button');
const nextButton = document.getElementById('next-button');
const infoPanelElement = document.getElementById('info-panel');
const panelCountryName = document.getElementById('panel-country-name');
const panelCountryFacts = document.getElementById('panel-country-facts');
const cloudToggleCheckbox = document.getElementById('cloud-toggle');
const shadowToggleCheckbox = document.getElementById('shadow-toggle');

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

// --- Three.js Variables ---
let scene, camera, renderer, globe, controls, raycaster, mouse;
let sunLight = null; // <-- Declare DirectionalLight globally
let ambientLight = null; // <-- Declare AmbientLight globally
let currentLineCurve = null; // To store the curve path for the line/plane
const clock = new THREE.Clock();
let scoreSprite = null;     // <<< ADDED: Score Sprite {{ insert }}
let scoreCanvas = null;       // <<< ADDED: Score Canvas Element {{ insert }}
let scoreCanvasContext = null;// <<< ADDED: Score Canvas Context {{ insert }}
let scoreTexture = null;    // <<< ADDED: Score Texture {{ insert }}
// Add variables for distance text display
let distanceCanvas = null;
let distanceContext = null;
let distanceTexture = null;
let distanceTextSprite = null;

// --- Constants ---
const MARKER_COLOR = 0xff0000; // Red
const MARKER_SIZE = 0.1;
const STAR_COUNT = 5000;
const STARFIELD_RADIUS = 500; // Make it much larger than the globe and camera distance
const PIN_SCALE_DEFAULT = 0.05;
const PIN_SCALE_HOVER = 0.06;
const PIN_SCALE_MOBILE = 0.08; // <-- New constant for mobile size
const PIN_IMAGE_PATH = 'assets/pin.svg';
const PIN_OFFSET = 0.05; // <<< CHANGED: Significantly reduce pin offset
const TARGET_RING_COLOR = 0x00ff00; // Green rings
const NUM_TARGET_RINGS = 4;       // How many rings in the pulse effect
const TARGET_RING_MAX_SCALE = 0.4; // Max size the rings expand to (adjust)
const TARGET_RING_THICKNESS = 0.01; // How thick the ring geometry is
const PULSE_DURATION = 1.5; // Seconds for one pulse cycle (expand/fade)
const TARGET_OFFSET = 0.06; // Keep offset from surface
const DISTANCE_LINE_OFFSET = 0.03; // <<< INCREASED Offset (e.g., from 0.0015 to 0.03) {{ modify }}
const LINE_ANIMATION_SPEED = 4.0; // <<< ADDED: Speed for the line itself {{ insert }}
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
    // Remove the solid background color
    // scene.background = new THREE.Color(0xaaaaaa);

    // Camera
    camera = new THREE.PerspectiveCamera(75, mapContainer.clientWidth / mapContainer.clientHeight, 0.1, STARFIELD_RADIUS * 1.5); // Increase far plane
    camera.position.z = 10;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // <<< Ensure alpha: true is present
    renderer.setSize(mapContainer.clientWidth, mapContainer.clientHeight);
    renderer.shadowMap.enabled = shadowToggleCheckbox.checked; // Set initial state
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
    // --- End Starfield ---

    // --- Lighting Setup ---
    // Determine initial intensities based on checkbox
    const initialShadowState = shadowToggleCheckbox.checked;
    const initialAmbientIntensity = initialShadowState ? 0.6 : 1.2; // Lower if shadows ON, higher if OFF
    const initialSunIntensity = 1.0; // Keep sun intensity constant for now

    ambientLight = new THREE.AmbientLight(0xffffff, initialAmbientIntensity);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, initialSunIntensity);
    sunLight.position.set(5, 3, 5).normalize();
    sunLight.castShadow = true;
    // Configure Shadow Camera
    sunLight.shadow.camera.left = -20; // Adjust as needed
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;

    if (initialShadowState) {
        scene.add(sunLight);
        console.log(`Shadows initially ON. Ambient: ${initialAmbientIntensity}`);
    } else {
        console.log(`Shadows initially OFF. Ambient: ${initialAmbientIntensity}`);
    }

    // Globe
    const globeGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

    // --- Texture Loading ---
    const textureLoader = new THREE.TextureLoader();

    // Load the base color texture (as before)
    const texture = textureLoader.load(
        'assets/8k_earth_daymap.jpg', // Assuming this is your base color map
        () => { console.log("Base color texture loaded successfully."); },
        undefined,
        (err) => { console.error('Error loading base color texture:', err); }
    );

    // <<< ADDED: Load Normal Map >>>
    const normalTexture = textureLoader.load(
        'assets/world_texture_2normal.png', // Path to your normal map
        () => { console.log("Normal map texture loaded successfully."); },
        undefined,
        (err) => { console.error('Error loading normal map texture:', err); }
    );

    // <<< ADDED: Load Specular/Roughness Map >>>
    // We'll use the specular map as a roughness map for MeshStandardMaterial.
    // Often, specular maps are inverted roughness maps (white = shiny = low roughness).
    // If the globe looks inverted (water shiny, land dull), you might need to adjust this.
    const roughnessTexture = textureLoader.load(
        'assets/world_texture_2specular.png', // Path to your specular map
        () => { console.log("Specular/Roughness map texture loaded successfully."); },
        undefined,
        (err) => { console.error('Error loading specular/roughness map texture:', err); }
    );

    // --- Modify Material Definition ---
    const material = new THREE.MeshStandardMaterial({
        map: texture,                 // Base color
        normalMap: normalTexture,     // Normal map
        roughnessMap: roughnessTexture, // Roughness map (using specular)
        // normalScale: new THREE.Vector2(0.5, 0.5), // Keep commented or adjust if needed
        
        // <<< DECREASE BASE ROUGHNESS >>>
        // Lower values make the surface generally shinier.
        // The roughnessMap then adds variation on top of this base value.
        // Try a value significantly less than 1.0.
        roughness: 0.7, // <<< CHANGE (Was likely 1.0 or default) - Try 0.5 first, adjust lower (e.g., 0.3) if needed.

        // <<< Optionally slightly INCREASE METALNESS >>>
        // This can also enhance reflections, but use sparingly for Earth.
        metalness: 0.15 // <<< Optional: Try increasing slightly from 0.1 if needed.
    });
    // --- End Modify Material ---

    globe = new THREE.Mesh(globeGeometry, material);
    // --- Globe Receives Shadows ---
    globe.receiveShadow = true; // Globe can always receive shadows if enabled
    scene.add(globe);

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
        scene.add(cloudMesh);
        console.log(`Cloud layer added. Initial visibility: ${cloudMesh.visible}`);
    } catch (error) {
        console.error("Failed to create cloud layer:", error); // This might not catch the texture load error
    }
    // --- End Cloud Layer ---

    // --- Atmospheric Edge Glow ---
    // const glowColor = new THREE.Color(0x90c8ff); // Light sky blue color
    // const atmosphereSizeFactor = 1.03; // How much larger than Earth (e.g., 1.03 = 3% larger radius)
    // const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * atmosphereSizeFactor, 64, 64);

    // const atmosphereMaterial = new THREE.ShaderMaterial({
    //     uniforms: {
    //         glowColor: { value: glowColor },
    //         viewVector: { value: camera.position } // Updated in animate
    //     },
    //     vertexShader: `
    //         uniform vec3 viewVector;
    //         varying float intensity;
    //         void main() {
    //             vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    //             vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
    //             vec3 I = normalize( worldPosition.xyz - viewVector );

    //             // Use a moderate power for Fresnel - controls thickness/falloff
    //             intensity = pow( 1.0 - abs(dot(worldNormal, I)), 2.5 ); // Power 2.0-3.0 often looks good

    //             gl_Position = projectionMatrix * viewMatrix * worldPosition;
    //         }
    //     `,
    //     fragmentShader: `
    //         uniform vec3 glowColor;
    //         varying float intensity;
    //         void main() {
    //             float clampedIntensity = max(0.0, intensity);

    //             // Alpha based on intensity - make it somewhat subtle
    //             float alpha = clampedIntensity * 0.6; // Adjust multiplier (e.g., 0.5 - 0.8)

    //             // Use the glow color directly
    //             vec3 finalColor = glowColor;

    //             gl_FragColor = vec4( finalColor, alpha );
    //         }
    //     `,
    //     side: THREE.BackSide, // Render the inside facing surface
    //     blending: THREE.AdditiveBlending, // Good for glows
    //     transparent: true,
    //     depthWrite: false
    // });

    // atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial); // Assign to the new variable
    // scene.add(atmosphereMesh);
    // console.log("Added atmospheric edge glow mesh.");
    // --- End Atmospheric Edge Glow ---

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // --- Enable and Configure Damping for Smoothness ---
    controls.enableDamping = true; // ESSENTIAL for smooth zoom/rotate inertia
    controls.dampingFactor = 0.1; // Increase slightly (default 0.05). Higher = more drag/slower stop. Try 0.08 - 0.15

    // --- Adjust Sensitivity ---
    controls.rotateSpeed = 0.3; // Further reduce rotation speed (try 0.2 - 0.4)
    controls.zoomSpeed = 0.7;   // Reduce zoom speed slightly (try 0.6 - 0.9)
    controls.panSpeed = 0.5;    // Keep pan speed reduced or adjust

    // --- Other Control Settings ---
    controls.minDistance = EARTH_RADIUS + 1; // Prevent zooming inside globe
    controls.maxDistance = 50; // Adjust max zoom out if needed

    // The combination of lower rotateSpeed and damping should make
    // rotation feel less sensitive, especially when zoomed in,
    // as the damping effect is more noticeable with smaller movements.

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

    console.log("Map initialized with normal and roughness maps.");
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
    const deltaTime = clock.getDelta(); // Ensure deltaTime is available
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

    // --- Update Controls ---
    // controls.update(); // Moved camera logic block earlier, this might be redundant here

    // --- Update Atmosphere Uniforms ---
    // if (atmosphereMesh && atmosphereMesh.material.type === 'ShaderMaterial') {
    //     atmosphereMesh.material.uniforms.viewVector.value.copy(camera.position);
    // }
    // --- End Atmosphere Update ---

    // --- Camera Logic ---
    if (isCameraFollowing && currentLineCurve && isLineAnimating) {
        const lineElapsedTime = now - lineAnimationStartTime;
        // Clamp progress strictly before 1.0 for calculations inside the loop
        const progress = Math.min(lineElapsedTime / currentAnimationDuration, 0.9999);

        const currentCurvePos = currentLineCurve.getPointAt(progress);

        // Position Update (maintaining distance)
        surfacePoint.copy(currentCurvePos).normalize().multiplyScalar(EARTH_RADIUS);
        directionVector.copy(surfacePoint).normalize();
        targetCameraPosition.copy(directionVector).multiplyScalar(initialCameraDistance);
        camera.position.lerp(targetCameraPosition, 0.08); // Smoother position lerp

        // Rotation Logic: Blend towards final destination lookAt near the end
        if (progress < FINAL_ROTATION_BLEND_START) {
            camera.lookAt(currentCurvePos);
        } else {
            const rotationBlend = Math.max(0, Math.min(1, (progress - FINAL_ROTATION_BLEND_START) / (1.0 - FINAL_ROTATION_BLEND_START)));
            const easedBlend = 0.5 - 0.5 * Math.cos(rotationBlend * Math.PI);

            tempMatrix.lookAt(camera.position, currentCurvePos, camera.up);
            quatLookAtTip.setFromRotationMatrix(tempMatrix);

            tempMatrix.lookAt(camera.position, targetCountryCenterVector, camera.up);
            quatLookAtDest.setFromRotationMatrix(tempMatrix);

            // --- Use correct instance slerp method ---
            blendedQuat.slerpQuaternions(quatLookAtTip, quatLookAtDest, easedBlend);

            camera.quaternion.copy(blendedQuat);
        }

        controls.target.copy(currentCurvePos);

    } else if (controls.enabled) {
        controls.update();
    }
    // --- End Camera Logic ---

    // --- Shooting Star Logic ---
    // Attempt to spawn a new star
    if (Math.random() < SHOOTING_STAR_SPAWN_CHANCE) {
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

                // Animate Score Value
                const targetScore = progress * currentRoundScore;
                animatedScoreDisplayValue = THREE.MathUtils.lerp(animatedScoreDisplayValue, targetScore, 0.08);

                // Update Canvas Text
                scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
                scoreCanvasContext.fillText(`+${Math.round(animatedScoreDisplayValue)}`, scoreCanvas.width / 2, scoreCanvas.height / 2);
                scoreTexture.needsUpdate = true;

                // Update Sprite Position
                scoreSprite.position.copy(scoreSpritePosition);
                scoreSprite.visible = true;
            } else {
                 // Ensure final score is shown briefly if lerp didn't quite reach
                 if (scoreSprite.visible) {
                     scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
                     scoreCanvasContext.fillText(`+${currentRoundScore}`, scoreCanvas.width / 2, scoreCanvas.height / 2);
                     scoreTexture.needsUpdate = true;
                     // Keep position from last frame
                 }
                 // Hide slightly after finishing (handled in progress >= 1.0 check)
            }
        }
        // --- End Score Sprite Animation ---

        // --- Animation End Handling (MOVED INSIDE isLineAnimating block) ---
        if (progress >= 1.0) {
            isLineAnimating = false; // Stop line animation flag

            // Hide score sprite shortly after animation ends
            if (scoreSprite) setTimeout(() => { scoreSprite.visible = false; }, 100); // Hide after 100ms delay

            console.log("Line animation finished.");
            if (isCameraFollowing) {
                isCameraFollowing = false; // Stop glide

                // Set final position precisely
                directionVector.copy(targetCountryCenterVector).normalize();
                targetCameraPosition.copy(directionVector).multiplyScalar(initialCameraDistance);
                camera.position.copy(targetCameraPosition);

                // Set final rotation precisely looking at destination
                camera.lookAt(targetCountryCenterVector);

                console.log("Camera glide finished.");
            }

            // Enable controls and set final target
            controls.enabled = true;
            controls.target.copy(targetCountryCenterVector);
            controls.update();
            console.log("Controls enabled, target set to destination.");

            createTargetRings();

            // --- Debugging showCountryInfoPanel call ---
            console.log("Attempting to call showCountryInfoPanel...");
            console.log("Is currentCountry valid before call?", currentCountry);
            if (currentCountry) {
                 try {
                     showCountryInfoPanel(currentCountry);
                     console.log("Successfully finished calling showCountryInfoPanel.");
                 } catch (error) {
                      console.error("Error occurred *during* showCountryInfoPanel call:", error);
                 }
            }
        } // <<< Closing brace for 'if (progress >= 1.0)' block
    } // <<< MOVED Closing brace for 'if (isLineAnimating)' block here

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
        countryNameElement.textContent = "Error loading countries!";
        countriesData = [];
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
function highlightCountryBoundary(countryGeometry) {
    console.log("[highlightCountryBoundary] Attempting to highlight boundary...");

    if (!countryGeometry) {
        console.warn("[highlightCountryBoundary] Cannot highlight boundary: Geometry data missing.");
        return;
    }
    removeHighlightedBoundaries(); // Call cleanup first

    const boundaryMaterial = new THREE.LineBasicMaterial({
        color: LINE_AND_TARGET_COLOR, // Yellow
        linewidth: 1.5, // Keep a reasonable width
        depthTest: true,        // <<< CHANGED: Enable depth testing
        depthWrite: false,       // <<< KEPT: Don't write to depth buffer
        transparent: true,     // Keep transparency option
        opacity: 0.9,          // Make slightly less opaque if desired

        polygonOffset: true,     // <<< ADDED: Enable polygon offset
        polygonOffsetFactor: -1.0, // <<< ADDED: Push towards camera (negative value)
        polygonOffsetUnits: -1.0   // <<< ADDED: Additional offset factor
    });
    // --- Reduce the offset significantly ---
    const boundaryOffset = 0.001; // <<< CHANGED: Very small offset from surface
    // -------------------------------------
    const type = countryGeometry.type;
    const coordinates = countryGeometry.coordinates;

    console.log(`[highlightCountryBoundary] Geometry type: ${type}`);

    try {
        let linesAdded = 0;
        if (type === 'Polygon') {
            const outerRingCoords = coordinates[0];
            console.log(`[highlightCountryBoundary] Processing Polygon with ${outerRingCoords.length} coordinates.`);
            const points3D = getPolygonPoints3D(outerRingCoords, boundaryOffset); // Use small offset
            console.log(`[highlightCountryBoundary] Converted Polygon to ${points3D.length} 3D points:`, points3D.slice(0, 5));

            if (points3D.length >= 2) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
                const lineLoop = new THREE.LineLoop(geometry, boundaryMaterial);
                scene.add(lineLoop);
                console.log("[highlightCountryBoundary] Added Polygon LineLoop to scene.");
                highlightedBoundaryLines.push(lineLoop);
                linesAdded++;
            } else {
                 console.warn("[highlightCountryBoundary] Not enough valid points for Polygon boundary.");
            }

        } else if (type === 'MultiPolygon') {
            console.log(`[highlightCountryBoundary] Processing MultiPolygon with ${coordinates.length} parts.`);
            for (let i = 0; i < coordinates.length; i++) {
                const polygon = coordinates[i];
                const outerRingCoords = polygon[0];
                 console.log(`[highlightCountryBoundary]   Part ${i}: ${outerRingCoords.length} coordinates.`);
                const points3D = getPolygonPoints3D(outerRingCoords, boundaryOffset); // Use small offset
                 console.log(`[highlightCountryBoundary]   Part ${i}: Converted to ${points3D.length} 3D points:`, points3D.slice(0, 5));

                if (points3D.length >= 2) {
                    const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
                    const lineLoop = new THREE.LineLoop(geometry, boundaryMaterial.clone());
                    scene.add(lineLoop);
                     console.log(`[highlightCountryBoundary] Added MultiPolygon LineLoop (Part ${i}) to scene.`);
                    highlightedBoundaryLines.push(lineLoop);
                     linesAdded++;
                } else {
                     console.warn(`[highlightCountryBoundary] Not enough valid points for MultiPolygon part ${i}.`);
                }
            }
        } else {
            console.warn(`[highlightCountryBoundary] Cannot highlight boundary: Unsupported geometry type "${type}"`);
        }
         console.log(`[highlightCountryBoundary] Highlighting finished. Total lines added: ${linesAdded}. Array length: ${highlightedBoundaryLines.length}`);

    } catch (error) {
         console.error("[highlightCountryBoundary] Error creating boundary highlight geometry:", error);
         removeHighlightedBoundaries();
    }
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
    if (countriesData.length === 0) {
        console.error("No country data loaded!");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * countriesData.length);
    return countriesData[randomIndex];
}

async function startNewRound() {
    console.log("Starting new round...");
    console.log(`Start of Round - Initial Cam Pos: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`);
    console.log(`Start of Round - Initial Controls Target: ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}`);

    isLineAnimating = false;
    isCameraFollowing = false;

    // Ensure controls are enabled and target is reset
    if (!controls.enabled) {
        console.log("Controls were disabled, re-enabling in startNewRound.");
        controls.enabled = true;
    }
    controls.target.set(0, 0, 0);
    controls.update();

    hideCountryInfoPanel();
    isGuessLocked = false;
    currentLineCurve = null;

    // Remove previous visuals
    removePin();
    removeTargetRings();
    removeHighlightedBoundaries();
    if (currentDistanceLine) {
        scene.remove(currentDistanceLine);
        if(currentDistanceLine.geometry) currentDistanceLine.geometry.dispose();
        if(currentDistanceLine.material) currentDistanceLine.material.dispose();
        currentDistanceLine = null;
    }

    // Hide distance text
    if (distanceTextSprite) {
        distanceTextSprite.visible = false;
    }
    // Hide score text (already handled in animate loop check, but good to be explicit)
    if (scoreSprite) {
        scoreSprite.visible = false;
    }

    // Ensure the country selection is always random:
    currentCountry = selectRandomCountry();
    console.log(`Starting random round. Selected country: ${currentCountry ? currentCountry.name : 'None'}`);

    if (!currentCountry) {
        console.error("Failed to select new country in startNewRound.");
        countryNameElement.textContent = "Error! Reload?";
        guessButton.disabled = true;
        nextButton.disabled = true;
        return;
    }

    countryNameElement.textContent = currentCountry.name;
    distanceElement.textContent = 'N/A';
    guessButton.disabled = true; // Button starts disabled until pin placed

    // Check if geometry exists directly on the loaded data
    if (!currentCountry.geometry || (currentCountry.geometry.type !== 'Polygon' && currentCountry.geometry.type !== 'MultiPolygon')) {
         console.warn(`[startNewRound] No valid Polygon/MultiPolygon boundary geometry found for ${currentCountry.name} in the loaded data.`);
    } else {
        console.log(`[startNewRound] Found boundary geometry (${currentCountry.geometry.type}) for ${currentCountry.name}.`);
    }

    console.log(`[startNewRound] New round setup complete for: ${currentCountry.name}.`);
    console.log(`End of startNewRound setup - Controls Target: ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}`);

    animatedScoreDisplayValue = 0;
    if (scoreSprite) {
        scoreSprite.visible = false;
    }

    // Re-enable the regular 'Next' button if it exists and is hidden
    if (nextButton) nextButton.style.display = 'block';

    hideCountryInfoPanel(); // This should already be called
} // <<< ADDED Closing brace for startNewRound function

function handleMapClick(event) {
    console.log("handleMapClick fired!");

    if (isDraggingPin) {
        console.log("handleMapClick: Bailing out because isDraggingPin is true.");
        return;
    }

    console.log("handleMapClick: Raycasting against globe object:", globe);

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(globe); // Check intersection only with the globe

    console.log("handleMapClick: Globe intersects length:", intersects.length);

    if (intersects.length > 0) {
        // Get the intersection point on the globe's surface
        const intersectionPoint = intersects[0].point;
        console.log("Map clicked at (3D):", intersectionPoint);

        // Calculate position slightly above the surface for the sprite
        const pinPosition = intersectionPoint.clone().normalize().multiplyScalar(EARTH_RADIUS + PIN_OFFSET); // Use PIN_OFFSET

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

async function handleGuessConfirm() {
    if (!playerGuess || !currentCountry || !pinSprite) {
         console.warn("Cannot confirm guess. Pin not placed or country not loaded.");
         return;
    }
    guessButton.disabled = true;
    nextButton.style.display = 'none';
    isGuessLocked = true;
    console.log("Confirming guess...");
    console.log("Current country geometry before scoring/highlighting:", currentCountry.geometry);

    let roundScore = 0;
    let distance = null; // Initialize distance

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

    // --- SCORING LOGIC (Uses geometry or fallback) ---
    if (currentCountry.geometry) {
        const isInside = isPointInCountry(playerGuess, currentCountry.geometry);
        if (isInside) {
            console.log("Guess is INSIDE country boundary!");
            roundScore = 1000;
            distance = 0; // Still display 0 distance for perfect guess
        } else {
            console.log("Guess is OUTSIDE country boundary. Calculating score by distance to GEOMETRIC center.");
            // Calculate distance to the GEOMETRIC center point
            distance = calculateDistance(
                playerGuess.lat, playerGuess.lon,
                targetCenterLatLon.lat, targetCenterLatLon.lon // <<< USE DERIVED LAT/LON
            );
            // Apply the 3000km threshold scoring
            if (distance <= 3000) {
                roundScore = 2000 - distance;
                console.log(`Distance (${distance}km) <= 3000km. Score: ${roundScore}`);
            } else {
                roundScore = 0;
                 console.log(`Distance (${distance}km) > 3000km. Score: 0`);
            }
        }
    } else { // Fallback if boundary data failed to load
        console.warn("No boundary data for country, calculating score by distance to FALLBACK center point only.");
        // Calculate distance to the FALLBACK center point (which is already derived from .lat/.lon)
        distance = calculateDistance(
            playerGuess.lat, playerGuess.lon,
            targetCenterLatLon.lat, targetCenterLatLon.lon // <<< USE DERIVED LAT/LON (consistent logic)
        );
        // Apply the 3000km threshold scoring (fallback)
        if (distance <= 3000) {
            roundScore = 2000 - distance;
             console.log(`Fallback: Distance (${distance}km) <= 3000km. Score: ${roundScore}`);
        } else {
            roundScore = 0;
             console.log(`Fallback: Distance (${distance}km) > 3000km. Score: 0`);
        }
    }
    // Ensure score is not negative
    roundScore = Math.max(0, roundScore);
    // --- END SCORING LOGIC ---

    // Update total score and UI
    score += roundScore;
    scoreElement.textContent = score;
    distanceElement.textContent = distance !== null ? `${distance}` : 'Error';

    // Display Distance Text Above Pin
    if (distanceTextSprite && pinSprite && distance !== null) {
        distanceContext.clearRect(0, 0, distanceCanvas.width, distanceCanvas.height);
        const distanceString = `${distance} km`;
        distanceContext.fillText(distanceString, distanceCanvas.width / 2, distanceCanvas.height / 2);
        distanceTexture.needsUpdate = true;
        const pinPosition = pinSprite.position;
        const surfaceNormal = pinPosition.clone().normalize();
        const textOffset = PIN_OFFSET + 0.2;
        const textPosition = pinPosition.clone().addScaledVector(surfaceNormal, textOffset);
        distanceTextSprite.position.copy(textPosition);
        distanceTextSprite.visible = true;
        console.log(`Displaying distance text "${distanceString}" above pin.`);
    }


    // Log results
    console.log(`Guessed: ${playerGuess.lat.toFixed(2)}, ${playerGuess.lon.toFixed(2)}`);
    // console.log(`Actual (Center Point): ${currentCountry.lat.toFixed(2)}, ${currentCountry.lon.toFixed(2)}`); // Keep or remove this log
    console.log(`Target Center (Lat/Lon Used for Dist): ${targetCenterLatLon.lat.toFixed(2)}, ${targetCenterLatLon.lon.toFixed(2)}`); // Log the derived coords
    console.log(`Target Center (Calculated Geometry Center 3D): (${targetCountryCenterVector.x.toFixed(2)}, ${targetCountryCenterVector.y.toFixed(2)}, ${targetCountryCenterVector.z.toFixed(2)})`); // Log the used vector
    console.log(`Distance: ${distance} km, Score: ${roundScore}`);


    // --- Draw distance line AND Prepare Curve (Uses calculated targetCountryCenterVector) ---
    // This part remains the same as it already uses targetCountryCenterVector
    const startVec = pinSprite.position.clone().normalize().multiplyScalar(EARTH_RADIUS);
    const endVec = targetCountryCenterVector.clone();
    const points = [];
    const numPoints = 50;
    const arcOffset = DISTANCE_LINE_OFFSET;

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const intermediateVec = new THREE.Vector3().lerpVectors(startVec, endVec, t).normalize();
        intermediateVec.multiplyScalar(EARTH_RADIUS + arcOffset);
        points.push(intermediateVec);
    }

    // --- Create the smooth curve for animation path ---\
    currentLineCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);

    // --- Calculate Dynamic Duration for LINE ---\
    const curveLength = currentLineCurve.getLength();
    let duration = (curveLength / LINE_ANIMATION_SPEED) * 1000;
    currentAnimationDuration = Math.max(MIN_LINE_DURATION, Math.min(duration, MAX_LINE_DURATION));
    console.log(`Line Curve Length: ${curveLength.toFixed(2)}, Calculated Duration: ${duration.toFixed(0)}ms, Clamped Duration: ${currentAnimationDuration}ms`);

    // --- Setup VISIBLE line geometry ---\
    const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const curveMaterial = new THREE.LineBasicMaterial({
        color: LINE_AND_TARGET_COLOR, linewidth: 2, depthTest: true, depthWrite: false,
        transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -0.5, polygonOffsetUnits: -0.5
    });
    if (currentDistanceLine) {
        if(currentDistanceLine.geometry) currentDistanceLine.geometry.dispose();
        if(currentDistanceLine.material) currentDistanceLine.material.dispose();
        scene.remove(currentDistanceLine);
    }
    currentDistanceLine = new THREE.Line(curveGeometry, curveMaterial);
    currentDistanceLine.geometry.setDrawRange(0, 0);
    scene.add(currentDistanceLine);
    lineTotalPoints = points.length;

    // Start Line Animation Timer
    lineAnimationStartTime = performance.now();
    isLineAnimating = true;

    // Highlight Country Boundary
    if (currentCountry.geometry) {
        highlightCountryBoundary(currentCountry.geometry);
    } else {
        console.warn("Skipping boundary highlight because geometry is missing.");
    }

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
} // <<< ADDED Closing brace for handleGuessConfirm function

// --- Marker/Pin/Target Handling ---

// Function to create or update the pin sprite
function createOrUpdatePin(position3D) {
    const currentScale = getPinScale(); // <-- Get scale based on device

    if (!pinSprite) {
        // Create sprite material FIRST, using the constant
        const pinMaterial = new THREE.SpriteMaterial({
            map: null, // Start with no map, will be set by loader
            color: PIN_COLOR_DEFAULT.clone(), // Now this constant is defined
            depthTest: true,
            depthWrite: false,
            sizeAttenuation: false
        });

        // Create the sprite object and assign it to the global variable
        pinSprite = new THREE.Sprite(pinMaterial); // <-- Assign BEFORE texture load
        pinSprite.scale.set(currentScale, currentScale, currentScale); // <-- Use determined scale
        pinSprite.center.set(0.5, 0); // Set center immediately

        // Now load the texture and update the EXISTING sprite's material
        const pinTexture = new THREE.TextureLoader().load(
            PIN_IMAGE_PATH,
            (texture) => { // On Load
                if (pinSprite) { // Check if pinSprite still exists
                    pinSprite.material.map = texture; // Assign loaded texture to material map
                    pinSprite.material.needsUpdate = true; // Tell three.js material changed
                    pinSprite.position.copy(position3D); // Set position
                    scene.add(pinSprite); // Add to scene AFTER texture is ready
                    console.log("Pin sprite created and texture loaded.");
                } else {
                    console.warn("Texture loaded but pinSprite was removed before completion.");
                    texture.dispose(); // Clean up texture if sprite is gone
                }
            },
            undefined, // Progress
            (err) => { console.error("Error loading pin texture:", err); } // On Error
        );

    } else { // Pin already exists, just update position
        pinSprite.position.copy(position3D);
        // Optionally update scale if window resized while pin exists (might be overkill)
        // pinSprite.scale.set(currentScale, currentScale, currentScale);
    }
    // Update player guess coordinates
    playerGuess = getLatLonFromPoint(position3D);
    if (!isGuessLocked) { // Only enable button if guess isn't locked
         guessButton.disabled = false;
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

    const targetPositionOffset = targetPositionOnSphere.clone().normalize().multiplyScalar(EARTH_RADIUS + PIN_OFFSET); // Apply offset

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

        ringLine.position.copy(targetPositionOffset);
        ringLine.lookAt(globe.position); // Rings face outwards from globe center
        targetRings.push(ringLine);
        scene.add(ringLine);
    }
    console.log(`${targetRings.length} target ring lines created.`);
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
        // --- Add log here ---
        console.log(">>> Dragging pin... Raycasting against globe."); // <-- Important log

        const globeIntersects = raycaster.intersectObject(globe);
        // --- Add log here ---
        console.log(`Globe intersects during drag: ${globeIntersects.length}`);

        if (globeIntersects.length > 0) {
            const intersectionPoint = globeIntersects[0].point;
            const newPinPosition = intersectionPoint.clone().normalize().multiplyScalar(EARTH_RADIUS + PIN_OFFSET);
            // --- Add log here ---
            // console.log(`Updating pin position to: ${newPinPosition.x.toFixed(2)}, ${newPinPosition.y.toFixed(2)}, ${newPinPosition.z.toFixed(2)}`);
            pinSprite.position.copy(newPinPosition);
            playerGuess = getLatLonFromPoint(newPinPosition);
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

    // initMap first, as it appends the renderer's canvas
    initMap();
    console.log(">>> initGame: initMap() called.");

    // Now setup listeners and initialize other parts
    setupEventListeners();
    hideCountryInfoPanel();
    initScoreDisplay();
    initDistanceDisplay();
    initShootingStars();

    // <<< ADDED CHECK for loadCountryData >>>
    console.log(">>> initGame: Checking typeof loadCountryData before use:", typeof loadCountryData);
    if (typeof loadCountryData !== 'function') {
        console.error(">>> CRITICAL: loadCountryData is NOT a function!");
    }
    // <<< ADDED CHECK for loadFactsData (just in case) >>>
    console.log(">>> initGame: Checking typeof loadFactsData before use:", typeof loadFactsData);
     if (typeof loadFactsData !== 'function') {
        console.error(">>> CRITICAL: loadFactsData is NOT a function!");
    }

    const dataPromises = [
        loadCountryData(), // <<< Line causing the error
        loadFactsData(),
    ];

    console.log(">>> initGame: Preparing to load data...");
    try {
        await Promise.all(dataPromises);
        console.log(">>> initGame: All essential data loaded (Promise.all resolved)."); // <<< ADDED LOG

        if (countriesData.length > 0) {
            console.log(">>> initGame: Attempting to start first round..."); // <<< ADDED LOG
            startNewRound(); // Start the first round randomly
            console.log(">>> initGame: startNewRound() called."); // <<< ADDED LOG
        } else {
            console.error(">>> initGame: Cannot start round, no country data loaded.");
             if (guessButton) guessButton.disabled = true;
             if (nextButton) nextButton.disabled = true;
        }
    } catch (error) {
        console.error(">>> initGame: Error during game initialization loading:", error); // <<< Enhanced Log
        if (countryNameElement) countryNameElement.textContent = "Error initializing game!";
         if (guessButton) guessButton.disabled = true;
         if (nextButton) nextButton.disabled = true;
    }

    console.log(">>> initGame: Game initialization sequence complete."); // <<< ADDED LOG
}

// Start Game
// window.onload = initGame; // <<< initGame call happens here // <<< Let's make sure this isn't commented out or removed

// --- Add Global Variables for Dragging ---
let isDraggingPanel = false;
let panelStartY = 0;
let panelStartHeight = 0;
let panelCurrentAnimationFrame = null;

// --- Drag Handler Functions ---
function onPanelPointerDown(event) {
    // Only handle primary pointer (e.g., first touch)
    if (!event.isPrimary) return;
    // Check if the click/touch is directly on the handle
    if (event.target.closest('#info-panel-handle')) {
        isDraggingPanel = true;
        panelStartY = event.clientY; // Use clientY for vertical position
        panelStartHeight = infoPanelElement.offsetHeight;
        infoPanelElement.style.transition = 'none'; // Disable transition during drag
        document.body.style.cursor = 'grabbing'; // Indicate dragging

        // Attach move/up listeners to the window to track pointer anywhere
        window.addEventListener('pointermove', onPanelPointerMove, { passive: false }); // passive: false needed to prevent scroll potentially
        window.addEventListener('pointerup', onPanelPointerUp, { once: true }); // Remove after first 'up'
        window.addEventListener('pointercancel', onPanelPointerUp, { once: true }); // Handle cancellation
         // console.log("Panel drag started");
    }
}

function onPanelPointerMove(event) {
    if (!isDraggingPanel || !event.isPrimary) return;

    // Prevent default scrolling action while dragging panel
    event.preventDefault();

    const currentY = event.clientY;
    const deltaY = currentY - panelStartY; // Negative delta means dragging up

    // Calculate new height
    let newHeight = panelStartHeight - deltaY;

    // Clamp height between min (handle height) and max (viewport * factor)
    const minHeight = 60; // From CSS initial height
    const maxHeight = window.innerHeight * 0.7; // Cap at 70% viewport height, adjust as needed
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

    // Throttle updates using requestAnimationFrame
    cancelAnimationFrame(panelCurrentAnimationFrame); // Cancel previous frame
    panelCurrentAnimationFrame = requestAnimationFrame(() => {
        infoPanelElement.style.height = `${newHeight}px`;
        // Update .up class based on whether it's significantly expanded
        if (newHeight > minHeight + 20) { // Threshold to add/remove 'up'
            infoPanelElement.classList.add('up');
    } else {
            infoPanelElement.classList.remove('up');
        }
    });
}

function onPanelPointerUp(event) {
    if (!isDraggingPanel) return; // Only act if we were dragging
     // console.log("Panel drag ended");

    isDraggingPanel = false;
    infoPanelElement.style.transition = 'height 0.3s ease-in-out'; // Re-enable transition
    document.body.style.cursor = ''; // Reset cursor

    // Remove window listeners
    window.removeEventListener('pointermove', onPanelPointerMove);
    window.removeEventListener('pointerup', onPanelPointerUp);
    window.removeEventListener('pointercancel', onPanelPointerUp);

    // Optional: Snap open/closed logic could be added here
    // For now, just leave it at the dragged height
    const currentHeight = infoPanelElement.offsetHeight;
    const minHeight = 60;
    const maxHeight = window.innerHeight * 0.7;
    // Example Snap:
    // if (currentHeight > maxHeight / 2) { // Snap open if more than half way
    //     infoPanelElement.style.height = `${maxHeight}px`;
    //     infoPanelElement.classList.add('up');
    // } else { // Snap closed
    //     infoPanelElement.style.height = `${minHeight}px`;
    //     infoPanelElement.classList.remove('up');
    // }
}


// --- Update show/hide functions ---

function showCountryInfoPanel(country) {
    console.log(">>> showCountryInfoPanel called with country:", country);
    if (!country || !country.name) {
        console.warn(">>> showCountryInfoPanel: Invalid country object received.");
        return;
    }
    const countryName = country.name;
    const countryCode = country.alpha2Code;

    // --- Prepare Content Parts ---
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
    // --- End Content Parts ---

    // --- Construct Panel Inner HTML ---
    infoPanelElement.innerHTML = `
        <div id="info-panel-handle">
             <span>${country.name}</span> <!-- REMOVED ' - Drag Handle' -->
        </div>
        <div id="info-panel-content">
             ${flagHtml}
             <hr>
             ${factsHtml}
        </div>
    `;

    // --- Set Initial Height & Overflow Based on Viewport Width ---
    const isDesktop = window.innerWidth > 768;
    const handleElement = infoPanelElement.querySelector('#info-panel-handle');
    const contentElement = infoPanelElement.querySelector('#info-panel-content');

    // Make panel visible before measurements/styling
    infoPanelElement.style.display = 'block';
    infoPanelElement.classList.remove('up');
    // Ensure panel itself doesn't scroll initially
    infoPanelElement.style.overflow = 'hidden';

    if (!handleElement || !contentElement) {
        console.error("Cannot find handle or content element. Panel setup aborted.");
        return;
    }

    // Get handle height (use fallback if measurement fails)
    let handleHeight = handleElement.offsetHeight;
    if (!handleHeight || handleHeight <= 0) {
        console.warn("Measured handle height is 0 or invalid, using fallback 30px");
        handleHeight = 30; // Fallback handle height
    }

    if (isDesktop) {
        console.log("Setting up panel for Desktop view (scrollable content)...");
        // Defer measurement for reliability
        requestAnimationFrame(() => {
            // Temporarily allow panel to take natural height for measurement
            infoPanelElement.style.height = 'auto';
            let contentHeight = contentElement.scrollHeight;
            let panelRequiredHeight = contentHeight + handleHeight + 30; // Base required height + buffer
            console.log(`rAF - Measured: Content Scroll=${contentHeight}, Handle Offset=${handleHeight}, Required Panel=${panelRequiredHeight}`);

            const maxHeight = window.innerHeight * 0.85; // Max panel height
            let finalPanelHeight = Math.min(panelRequiredHeight, maxHeight);

            // Apply final styles
            infoPanelElement.style.height = `${finalPanelHeight}px`;
            infoPanelElement.style.overflow = 'hidden'; // Panel does not scroll

            // Set content height to fill the panel (minus handle) and enable scrolling
            contentElement.style.height = `${finalPanelHeight - handleHeight}px`;
            contentElement.style.overflowY = 'auto'; // Always allow content scrolling on desktop

            console.log(`rAF - Final Desktop: Panel Height=${finalPanelHeight}px, Content Height=${contentElement.style.height}, Content Overflow=auto`);
        });

    } else {
        // Mobile view: Start collapsed, enable content scrolling
        console.log("Setting up panel for Mobile view (scrollable content)...");
        infoPanelElement.style.height = '60px'; // Panel starts small

        // Set content height to fill panel (minus handle) and enable scrolling
        contentElement.style.height = `calc(100% - ${handleHeight}px)`;
        contentElement.style.overflowY = 'auto'; // Always allow content scrolling on mobile

        console.log(`Mobile view: Panel Height=60px, Content Height=${contentElement.style.height}, Content Overflow=auto`);
    }
    // --- End Height Logic ---

    // Attach listener
    infoPanelElement.removeEventListener('pointerdown', onPanelPointerDown);
    infoPanelElement.addEventListener('pointerdown', onPanelPointerDown);
}

function hideCountryInfoPanel() {
    infoPanelElement.style.display = 'none'; // Hide
    infoPanelElement.classList.remove('up'); // Reset state

    // Remove listener when panel is hidden
    infoPanelElement.removeEventListener('pointerdown', onPanelPointerDown);
     // console.log("Removed panel pointerdown listener");

    // Just in case drag was interrupted, remove window listeners too
    if (isDraggingPanel) {
         window.removeEventListener('pointermove', onPanelPointerMove);
         window.removeEventListener('pointerup', onPanelPointerUp);
         window.removeEventListener('pointercancel', onPanelPointerUp);
         isDraggingPanel = false;
         document.body.style.cursor = '';
    }

    infoPanelElement.innerHTML = ''; // Clear content
}

// --- Add Event Listener for Toggle ---
function setupEventListeners() {
    if (guessButton) guessButton.addEventListener('click', handleGuessConfirm);
    if (nextButton) nextButton.addEventListener('click', startNewRound);

    if (cloudToggleCheckbox) cloudToggleCheckbox.addEventListener('change', handleCloudToggle);
    if (shadowToggleCheckbox) shadowToggleCheckbox.addEventListener('change', handleShadowToggle);

    // Pointer/Map interaction listeners
    if (mapContainer) {
        mapContainer.addEventListener('pointerdown', onPointerDown, false);
        mapContainer.addEventListener('pointermove', onPointerMove, false);
        mapContainer.addEventListener('pointerup', onPointerUp, false);
        mapContainer.addEventListener('pointerleave', onPointerUp, false);
    } else {
        console.error("setupEventListeners: mapContainer not found, cannot add map interaction listeners.");
    }

    window.addEventListener('resize', onWindowResize);
}

// --- Handler function for the toggle ---
function handleCloudToggle(event) {
    if (cloudMesh) { // Check if cloud mesh exists
        cloudMesh.visible = event.target.checked; // Set visibility based on checkbox state
        console.log(`Cloud visibility set to: ${cloudMesh.visible}`);
    } else {
        console.warn("Cloud toggle changed, but cloudMesh doesn't exist.");
    }
}

// --- Handler function for the shadow toggle ---
function handleShadowToggle(event) {
    const shadowsEnabled = event.target.checked;
    renderer.shadowMap.enabled = shadowsEnabled; // Toggle renderer shadows

    if (shadowsEnabled) {
        // --- Shadows ON ---
        if (sunLight) {
            scene.add(sunLight); // Add directional light back
            console.log("Shadows ON: Added sunLight.");
        } else {
            console.error("Cannot enable shadows: sunLight not initialized.");
        }
        // Optional: Lower ambient light intensity
        if (ambientLight) ambientLight.intensity = 0.6; // e.g., moderate ambient

    } else {
        // --- Shadows OFF ---
        if (sunLight) {
            scene.remove(sunLight); // Remove directional light
            console.log("Shadows OFF: Removed sunLight.");
        }
        // Optional: Increase ambient light intensity for even illumination
        if (ambientLight) ambientLight.intensity = 1.2; // e.g., brighter ambient
    }
} 

// --- Point-in-Polygon Logic --- // *** KEEP DEFINITIONS HERE (Before HandleGuessConfirm) ***
function pointInPolygon(point, polygon) {
    const x = point[0]; // lon
    const y = point[1]; // lat
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}
function isPointInCountry(pointCoords, countryGeometry) {
    if (!pointCoords || !countryGeometry) return false;
    const point = [pointCoords.lon, pointCoords.lat];
    const type = countryGeometry.type;
    const coordinates = countryGeometry.coordinates;
    if (type === 'Polygon') {
        const outerRing = coordinates[0];
        if (pointInPolygon(point, outerRing)) return true;
    } else if (type === 'MultiPolygon') {
        for (const polygon of coordinates) {
            const outerRing = polygon[0];
            if (pointInPolygon(point, outerRing)) return true;
        }
    }
    return false;
}
// --- End Point-in-Polygon Logic ---

const TARGET_RING_MAX_RADIUS = EARTH_RADIUS * 0.15;

// --- NEW FUNCTION: Initialize Score Display --- {{ insert }}
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
// --- END NEW FUNCTION ---

// --- NEW FUNCTION: Initialize Distance Text Display --- // <<< PASTE THE FUNCTION DEFINITION HERE
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
// --- END DISTANCE FUNCTION ---

// ... Constants ...
const NUM_SHOOTING_STARS = 15; // How many potential shooting stars in the pool
const SHOOTING_STAR_SPEED = 150; // Speed of the stars (units per second)
const SHOOTING_STAR_LENGTH = 2; // Length of the star streak
const SHOOTING_STAR_SPAWN_RADIUS = STARFIELD_RADIUS * 1.1; // Radius where stars spawn
const SHOOTING_STAR_DESPAWN_RADIUS_SQ = (STARFIELD_RADIUS * 1.3) ** 2; // Squared radius for despawn check
const SHOOTING_STAR_SPAWN_CHANCE = 0.003; // Chance per frame to spawn a star

// ... Three.js Variables ...
let shootingStars = []; // Array to hold shooting star data ({mesh, velocity, active})
let shootingStarMaterial; // Shared material

// --- Initialize Shooting Stars ---
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

console.log(">>> script.js: Reached end of script, checking initGame type before assigning listener...");
console.log(">>> Type of initGame just before listener assignment:", typeof initGame);
if (typeof initGame !== 'function') {
    console.error(">>> CRITICAL: initGame is NOT a function at the time of listener assignment!");
}

window.addEventListener('load', initGame); // <<< RESTORE this line
// window.addEventListener('load', function() { // <<< REMOVE the temporary test
//     console.log(">>> Load event fired successfully! (Basic test)");
// });

// --- Add Global Variables for Dragging ---
// ... (rest of the code) ...