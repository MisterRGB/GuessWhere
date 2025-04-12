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

// --- Three.js Variables ---
let scene, camera, renderer, globe, controls, raycaster, mouse;
let sunLight; // Defined if needed globally

// --- Constants ---
const GLOBE_RADIUS = 5;
const MARKER_COLOR = 0xff0000; // Red
const MARKER_SIZE = 0.1;
const STAR_COUNT = 5000;
const STARFIELD_RADIUS = 500; // Make it much larger than the globe and camera distance
const PIN_SCALE_DEFAULT = 0.05; // Or your current adjusted value
const PIN_SCALE_HOVER = 0.06;   // Or your current adjusted value
const PIN_IMAGE_PATH = 'assets/pin.svg';
const PIN_OFFSET = 0.1; // Keep or adjust pin offset from surface

const TARGET_RING_COLOR = 0x00ff00; // Green rings
const NUM_TARGET_RINGS = 4;       // How many rings in the pulse effect
const TARGET_RING_MAX_SCALE = 0.4; // Max size the rings expand to (adjust)
const TARGET_RING_THICKNESS = 0.01; // How thick the ring geometry is
const PULSE_DURATION = 1.5; // Seconds for one pulse cycle (expand/fade)
const TARGET_OFFSET = 0.06; // Keep offset from surface

const LINE_ANIMATION_DURATION = 1000;
const CLOUD_TEXTURE_PATH = 'assets/4k_earth_clouds.jpg'; // <-- Point to your file
const CLOUD_ALTITUDE = 0.05; // <-- How high clouds float above surface (adjust)
const CLOUD_ROTATION_SPEED = 0.0002; // <-- Speed clouds rotate (adjust)
const SUN_DISTANCE = 1000; // How far away the sun light source is
const LENSFLARE_TEXTURE0_PATH = 'assets/lensflare0.png'; // Path to main flare texture
const LENSFLARE_TEXTURE3_PATH = 'assets/lensflare3.png'; // Path to ghost flare texture

// --- PIN CONSTANTS (Ensure these are here and defined) ---
const PIN_COLOR_DEFAULT = new THREE.Color(0xff0000);
const PIN_COLOR_HOVER = new THREE.Color(0xffa500);

// --- DEFINE SHARED COLOR FIRST ---
const LINE_AND_TARGET_COLOR = 0xffff00; // Yellow

// --- Shared Ring Geometry and Base Material ---
const targetRingGeometry = new THREE.RingGeometry(
    TARGET_RING_MAX_SCALE * 0.95, // Inner radius (slightly smaller than max scale)
    TARGET_RING_MAX_SCALE,      // Outer radius (defines max size)
    32                          // Segments
);
const targetRingBaseMaterial = new THREE.MeshBasicMaterial({
    color: LINE_AND_TARGET_COLOR,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide, // Render both sides
    depthTest: true,       // Enable occlusion
    depthWrite: false
});

// --- GraphQL API Interaction ---
const GRAPHQL_ENDPOINT = 'https://countries-274616.ew.r.appspot.com'; // From graphcountries README

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
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mapContainer.clientWidth, mapContainer.clientHeight);
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

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Adjusted ambient light
    scene.add(ambientLight);
    // Remove or comment out old directional light:
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    // directionalLight.position.set(5, 3, 5);
    // scene.add(directionalLight);

    // --- Sun Light Source ---
    const sunLight = new THREE.PointLight(0xffffff, 1.5, SUN_DISTANCE * 2); // Color, Intensity, Distance
    sunLight.position.set(0, 0, SUN_DISTANCE); // Position far along Z axis
    scene.add(sunLight);

    // --- Lens Flare ---
    try {
        const textureLoader = new THREE.TextureLoader();
        const textureFlare0 = textureLoader.load(LENSFLARE_TEXTURE0_PATH);
        const textureFlare3 = textureLoader.load(LENSFLARE_TEXTURE3_PATH);

        if (!THREE.Lensflare || !THREE.LensflareElement) {
             console.error("Lensflare or LensflareElement not loaded. Check script includes.");
             throw new Error("Lensflare scripts missing.");
        }

        const lensflare = new THREE.Lensflare();

        // Main flare
        lensflare.addElement(new THREE.LensflareElement(textureFlare0, 700, 0, sunLight.color)); // size, distance (0=at light source), color

        // Add some 'ghost' flares
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 60, 0.6)); // size, distance (0-1, 1=opposite side)
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 0.7));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 120, 0.9));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 1.0));

        sunLight.add(lensflare); // Attach the lensflare to the light source
        console.log("Lens flare added to sun light.");

    } catch (error) {
        console.error("Failed to create lens flare:", error);
    }
    // --- End Lens Flare ---

    // Globe
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    // --- Texture Loading ---
    // Loading the local texture file
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
        'assets/world_texture_2.jpg', // <--- Change this line to the local path
        () => { console.log("Texture loaded successfully."); },
        undefined,
        (err) => { console.error('Error loading texture:', err); }
    );
     const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8, // Adjust appearance as needed
        metalness: 0.2
    });
    globe = new THREE.Mesh(globeGeometry, material);
    scene.add(globe);

    // --- Cloud Layer ---
    console.log("Creating cloud layer...");
    try {
        const cloudTexture = new THREE.TextureLoader().load(
            CLOUD_TEXTURE_PATH,
             () => { console.log("Cloud texture loaded successfully."); },
             undefined,
             (err) => { console.error("Error loading cloud texture:", err); }
        );

        const cloudGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + CLOUD_ALTITUDE, 64, 64);

        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.2, // <-- Set to 50% of the previous value (e.g., 0.4 * 0.5 = 0.2)
            depthWrite: false
        });

        cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudMesh.visible = cloudToggleCheckbox.checked;
        scene.add(cloudMesh);
        console.log(`Cloud layer added. Initial visibility: ${cloudMesh.visible}`);
    } catch (error) {
        console.error("Failed to create cloud layer:", error);
    }
    // --- End Cloud Layer ---

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooths rotation
    controls.dampingFactor = 0.05;
    controls.minDistance = GLOBE_RADIUS + 1; // Prevent zooming inside globe
    controls.maxDistance = 50;
    controls.rotateSpeed = 0.5; // Reduce rotation speed (default is 1.0, try 0.3-0.7)
    controls.zoomSpeed = 0.8;   // Optionally reduce zoom speed (default is 1.0)
    controls.panSpeed = 0.5;    // Optionally reduce panning speed (default is 1.0)

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

    console.log("Map initialized with pin drag/hover and sun.");
}

function onWindowResize() {
    camera.aspect = mapContainer.clientWidth / mapContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mapContainer.clientWidth, mapContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // --- Cloud Rotation ---
    if (cloudMesh) {
        cloudMesh.rotation.y += CLOUD_ROTATION_SPEED; // Rotate cloud layer slowly
    }
    // --- End Cloud Rotation ---

    // --- Line Animation Logic ---
    if (isLineAnimating && currentDistanceLine) {
        const elapsedTime = performance.now() - lineAnimationStartTime;
        const progress = Math.min(elapsedTime / LINE_ANIMATION_DURATION, 1.0);
        const pointsToDraw = Math.ceil(lineTotalPoints * progress);
        const verticesToDraw = Math.max(0, pointsToDraw);
        currentDistanceLine.geometry.setDrawRange(0, verticesToDraw);

        if (progress >= 1.0) {
            isLineAnimating = false;
            createTargetRings();
            showCountryInfoPanel(currentCountry);
        }
    }
    // --- End Line Animation Logic ---

    // --- Target Rings Pulsating Animation ---
    if (targetRings.length > 0) {
        const elapsedTime = targetRingClock.getElapsedTime(); // Time since rings were created

        targetRings.forEach((ring, index) => {
            // Calculate time offset for this specific ring to stagger the pulses
            const timeOffset = (index / NUM_TARGET_RINGS) * PULSE_DURATION;
            // Calculate current time within this ring's pulse cycle
            const cycleTime = (elapsedTime + timeOffset) % PULSE_DURATION;
            // Calculate progress within the cycle (0 to 1)
            const progress = cycleTime / PULSE_DURATION;

            // Animate scale: Start small, grow to 1 (geometry defines max size)
            const scale = progress;
            ring.scale.set(scale, scale, scale);

            // Animate opacity: Start opaque, fade out (e.g., using pow for easing)
            const opacity = Math.pow(1.0 - progress, 2); // Fade out faster at the end
            ring.material.opacity = opacity;

             // Ensure rings become invisible when fully faded to avoid depth fighting
             ring.visible = ring.material.opacity > 0.01;

        });
    }
    // --- End Target Rings Animation ---

    renderer.render(scene, camera);
}

// --- Coordinate Conversion ---

// --- NEW Function derived as INVERSE of the reverted getPointFromLatLon ---
function getLatLonFromPoint(point) {
    // Normalize first to remove offset effect
    const normalizedPoint = point.clone().normalize();
    // Use radius 1 for calculations on the normalized point
    const R = 1.0;

    const x = normalizedPoint.x;
    const y = normalizedPoint.y;
    const z = normalizedPoint.z;

    // --- Latitude calculation ---
    // From y = R * sin(phi)
    let phi = Math.asin(y / R); // Result is in radians (-PI/2 to PI/2)
    // Handle potential floating point inaccuracies at poles
    if (isNaN(phi)) {
       phi = y > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    const latitude = (phi * 180) / Math.PI;

    // --- Longitude calculation ---
    // We need theta_adj = atan2(sin_component, cos_component)
    // From z = R * cos(phi) * sin(theta_adj) => sin(theta_adj) = z / (R * cos(phi))
    // From x = -R * cos(phi) * cos(theta_adj) => cos(theta_adj) = -x / (R * cos(phi))
    // So, theta_adj = atan2( z / (R * cos(phi)), -x / (R * cos(phi)) )
    // Simplified: theta_adj = atan2(z, -x)
    // But avoid division by zero if cos(phi) is near zero (at poles)
    let longitude;
    if (Math.abs(latitude) > 89.99) { // At or very near a pole
        longitude = 0; // Longitude is irrelevant at the poles, assign 0
    } else {
        const theta_adj = Math.atan2(z, -x); // Result is in radians (-PI to PI)
        // Now convert theta_adj back to longitude using lon = (theta_adj * 180 / PI) + 180
        const longitude_deg_from_adj = (theta_adj * 180) / Math.PI;
        longitude = longitude_deg_from_adj + 180; // Result likely in 0 to 360 range

        // Optional: Normalize to -180 to 180 if preferred
        if (longitude > 180) {
             longitude -= 360;
        }
    }

    return { lat: latitude, lon: longitude };
}

// --- REVERTED Function (Keep this one as is) ---
function getPointFromLatLon(lat, lon) {
    const phi = lat * (Math.PI / 180);
    const theta = (lon - 180) * (Math.PI / 180);

    const x = -(GLOBE_RADIUS * Math.cos(phi) * Math.cos(theta));
    const y = GLOBE_RADIUS * Math.sin(phi);
    const z = GLOBE_RADIUS * Math.cos(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// --- Country Data ---
async function loadCountryData() {
    console.log("Loading country data from GeoJSON...");
    try {
        const response = await fetch('assets/countries.geojson');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const geojsonData = await response.json();

        countriesData = geojsonData.features.map(feature => {
            if (!feature.geometry || !feature.geometry.coordinates || !feature.properties) {
                // console.warn("Skipping feature with missing geometry or properties:", feature); // Optional: keep or remove log
                return null;
            }
            // console.log("Processing properties:", feature.properties); // Optional: keep or remove log

            const [lon, lat] = feature.geometry.coordinates;
            const name = feature.properties.COUNTRY || feature.properties.name || feature.properties.ADMIN || feature.properties.NAME_EN;

            // --- MODIFIED LINE ---
            // Check for 'ISO' first, then fall back to others
            const alpha2Code = feature.properties.ISO || feature.properties.ISO_A2 || feature.properties.iso_a2 || feature.properties.alpha2Code || feature.properties.ISO_A2_EH;

            if (!name || typeof lat !== 'number' || typeof lon !== 'number') {
                // console.warn("Skipping feature with missing name or invalid coordinates:", feature.properties); // Optional log
                return null;
            }
             const validAlpha2Code = (alpha2Code && typeof alpha2Code === 'string' && alpha2Code.length === 2) ? alpha2Code : null;
             if (!validAlpha2Code && name) {
                 console.warn(`Could not find valid alpha2Code for country: ${name}`, feature.properties); // Keep this warning
             }

            return { name, lat, lon, alpha2Code: validAlpha2Code };
        }).filter(country => country !== null);

        if (countriesData.length === 0) {
            console.error("No valid country data extracted from GeoJSON.");
        } else {
            console.log(`Loaded ${countriesData.length} countries.`);
        }

    } catch (error) {
        console.error("Failed to load or parse country data:", error);
        countryNameElement.textContent = "Error loading countries!";
        countriesData = [];
    }
}

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

// --- Game Logic ---
function selectRandomCountry() {
    if (countriesData.length === 0) {
        console.error("No country data loaded!");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * countriesData.length);
    return countriesData[randomIndex];
}

function startNewRound() {
    console.log("Starting new round...");
    nextButton.style.display = 'none';
    isLineAnimating = false;
    hideCountryInfoPanel();
    isGuessLocked = false;

    // Remove previous pin, line, and rings
    removePin();
    removeTargetRings();
    if (currentDistanceLine) {
        scene.remove(currentDistanceLine);
        currentDistanceLine = null;
    }

    // ... (rest of selecting country, updating UI) ...
    currentCountry = selectRandomCountry();
    if (!currentCountry) {
        console.error("Failed to select new country in startNewRound.");
        countryNameElement.textContent = "Error! Reload?";
        guessButton.disabled = true;
        return;
    }
    countryNameElement.textContent = currentCountry.name;
    distanceElement.textContent = 'N/A';
    guessButton.disabled = true;

    console.log(`New round: Guess ${currentCountry.name}`);
}

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
        const pinPosition = intersectionPoint.clone().normalize().multiplyScalar(GLOBE_RADIUS + PIN_OFFSET); // Use PIN_OFFSET

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
    return Math.round(R * c);
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function calculateScore(distance) {
    const maxDistance = 20000; // Approx max distance on Earth
    const score = Math.max(0, Math.round((1 - (distance / maxDistance)) * 1000));
    return score;
}

function handleGuessConfirm() {
    if (!playerGuess || !currentCountry || !pinSprite) {
         console.warn("Cannot confirm guess. Pin not placed or country not loaded.");
         return;
    }
    guessButton.disabled = true;
    nextButton.style.display = 'none'; // Ensure next button is hidden while processing

    isGuessLocked = true; // <-- LOCK the pin position here

    console.log("Confirming guess...");

    // --- Log the coordinates being used ---
    console.log(`Calculating distance for Guess: lat=${playerGuess.lat.toFixed(4)}, lon=${playerGuess.lon.toFixed(4)}`);
    console.log(`Calculating distance for Answer: lat=${currentCountry.lat.toFixed(4)}, lon=${currentCountry.lon.toFixed(4)}`);
    // --- End Log ---

    // Calculate distance using the playerGuess object
    const distance = calculateDistance(
        playerGuess.lat, playerGuess.lon,
        currentCountry.lat, currentCountry.lon
    );
    const roundScore = calculateScore(distance);

    score += roundScore;
    scoreElement.textContent = score;
    distanceElement.textContent = `${distance}`;

    console.log(`Guessed: ${playerGuess.lat.toFixed(2)}, ${playerGuess.lon.toFixed(2)}`);
    console.log(`Actual: ${currentCountry.lat.toFixed(2)}, ${currentCountry.lon.toFixed(2)}`);
    console.log(`Distance: ${distance} km, Score: ${roundScore}`);

    // --- Add the CURVED distance line ---
    const startVec = pinSprite.position.clone().normalize(); // Guess position (normalized)

    // Calculate end position using the REVERTED function
    const endVec = getPointFromLatLon(currentCountry.lat, currentCountry.lon).normalize(); // Use reverted function and normalize

    const points = [];
    const numPoints = 30;
    const arcOffset = TARGET_OFFSET; // Or PIN_OFFSET, assuming they are the same

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const intermediateVec = new THREE.Vector3().lerpVectors(startVec, endVec, t);
        intermediateVec.normalize();
        intermediateVec.multiplyScalar(GLOBE_RADIUS + arcOffset);
        points.push(intermediateVec);
    }

    const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const curveMaterial = new THREE.LineBasicMaterial({ color: LINE_AND_TARGET_COLOR, linewidth: 2 });

    if (currentDistanceLine) {
        scene.remove(currentDistanceLine);
        // Dispose geometry/material if needed, though re-creating might be simpler here
    }
    currentDistanceLine = new THREE.Line(curveGeometry, curveMaterial);

    // --- Animation Setup ---
    // 1. Set initial draw range to zero vertices
    currentDistanceLine.geometry.setDrawRange(0, 0);

    // 2. Add the line to the scene (it's invisible initially)
    scene.add(currentDistanceLine);

    // 3. Store total points and start time for animation
    lineTotalPoints = points.length; // Store how many points define the full line
    lineAnimationStartTime = performance.now(); // Get high-resolution timestamp
    isLineAnimating = true; // Set the flag to start animation in the animate() loop
    // --- End Animation Setup ---

    nextButton.style.display = 'block'; // Show the next button
}

// --- Marker/Pin/Target Handling ---

// Function to create or update the pin sprite
function createOrUpdatePin(position3D) {
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
        pinSprite.scale.set(PIN_SCALE_DEFAULT, PIN_SCALE_DEFAULT, PIN_SCALE_DEFAULT);
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
function createTargetRings() {
    if (!currentCountry) return;
    removeTargetRings(); // Clear previous rings first
    targetRingClock.start(); // Start/reset the animation clock

    console.log("Creating target rings...");

    // Calculate target position ON the sphere surface
    const targetPositionOnSphere = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
    // Calculate offset position
    const targetPositionOffset = targetPositionOnSphere.clone().normalize().multiplyScalar(GLOBE_RADIUS + TARGET_OFFSET);

    for (let i = 0; i < NUM_TARGET_RINGS; i++) {
        // Clone the base material so each ring can have independent opacity/color later if needed
        const ringMaterial = targetRingBaseMaterial.clone();
        const ringMesh = new THREE.Mesh(targetRingGeometry, ringMaterial);

        // Position the ring
        ringMesh.position.copy(targetPositionOffset);

        // Orient the ring to lie flat on the globe surface at that point
        // Make it look towards the center of the globe (adjust if globe isn't at 0,0,0)
        ringMesh.lookAt(globe.position); // Or new THREE.Vector3(0,0,0)

        targetRings.push(ringMesh); // Add to our array
        scene.add(ringMesh);        // Add to the scene
    }
    console.log(`${targetRings.length} target rings created.`);
}

function removeTargetRings() {
    if (targetRings.length > 0) {
        console.log("Removing target rings...");
        targetRings.forEach(ring => {
            scene.remove(ring);
            // Dispose of the cloned material
            if (ring.material) {
                ring.material.dispose();
            }
            // Geometry is shared, only dispose if sure it's not needed elsewhere
            // if (ring.geometry) ring.geometry.dispose();
        });
        targetRings = []; // Clear the array
        targetRingClock.stop(); // Stop the clock
    }
}

// --- Drag and Hover Logic ---

function onPointerDown(event) {
    console.log("onPointerDown fired!");
    // --- Add check for locked guess early ---
    // if (isGuessLocked) {
    //     console.log("Guess is locked, ignoring pointer down on pin.");
    //     return; // Option 1: Exit entirely if guess is locked
    // }

    mouse.x = ((event.clientX - renderer.domElement.getBoundingClientRect().left) / renderer.domElement.width) * 2 - 1;
    mouse.y = -((event.clientY - renderer.domElement.getBoundingClientRect().top) / renderer.domElement.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    console.log("Checking for pin intersection. pinSprite:", pinSprite);
    const pinIntersects = pinSprite ? raycaster.intersectObject(pinSprite) : [];
    console.log("pinIntersects length:", pinIntersects.length);

    // --- Modify this condition ---
    // Only start dragging if the pin is clicked AND the guess isn't locked
    if (pinIntersects.length > 0 && !isGuessLocked) {
        // Start dragging the existing pin
        console.log("Intersection detected with pinSprite. Starting drag.");
        isDraggingPin = true;
        controls.enabled = false;
        mapContainer.style.cursor = 'grabbing';
        pinSprite.material.color.copy(PIN_COLOR_HOVER);
    }
    // --- Only call handleMapClick if not dragging AND guess not locked ---
    // (This part assumes handleMapClick is only for *placing* the pin initially,
    // if it also handles moving existing pins, the logic needs adjustment)
    else if (!isDraggingPin && !isGuessLocked) {
        // If not clicking the pin, treat as a potential map click
        console.log("No intersection with pinSprite or guess locked. Calling handleMapClick.");
        handleMapClick(event); // Call the original click handler to place/move pin
    } else if (!isDraggingPin && isGuessLocked) {
         console.log("Clicked map, but guess is locked."); // Log if clicking map when locked
    }
}

function onPointerMove(event) {
    // --- Hover Effect ---
    mouse.x = ((event.clientX - renderer.domElement.getBoundingClientRect().left) / renderer.domElement.width) * 2 - 1;
    mouse.y = -((event.clientY - renderer.domElement.getBoundingClientRect().top) / renderer.domElement.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const pinIntersects = pinSprite ? raycaster.intersectObject(pinSprite) : [];

    if (!isDraggingPin) { // Only handle hover if not dragging
        if (pinIntersects.length > 0) {
            // Hovering over pin
            pinSprite.scale.set(PIN_SCALE_HOVER, PIN_SCALE_HOVER, PIN_SCALE_HOVER);
            pinSprite.material.color.copy(PIN_COLOR_HOVER); // Set hover color
            mapContainer.style.cursor = 'grab';
        } else {
            // Not hovering over pin
             if (pinSprite) { // Reset scale and color only if pin exists
               pinSprite.scale.set(PIN_SCALE_DEFAULT, PIN_SCALE_DEFAULT, PIN_SCALE_DEFAULT);
               pinSprite.material.color.copy(PIN_COLOR_DEFAULT); // Reset to default color
             }
            mapContainer.style.cursor = 'auto';
        }
    }

    // --- Dragging Logic ---
    if (isDraggingPin && pinSprite) {
        // Pin color should already be orange from the hover/pointerdown event
        // Raycast against the *globe*...
        const globeIntersects = raycaster.intersectObject(globe);
        // ... (update pin position based on globe intersection) ...
        if (globeIntersects.length > 0) {
            const intersectionPoint = globeIntersects[0].point;
            const newPinPosition = intersectionPoint.clone().normalize().multiplyScalar(GLOBE_RADIUS + PIN_OFFSET);
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
    console.log("Initializing game...");
    setupEventListeners(); // <-- Call function to set up ALL listeners
    hideCountryInfoPanel();
    initMap(); // Creates scene, globe, clouds (visibility set based on checkbox)

    await loadCountryData();
    await loadFactsData();

    if (countriesData.length > 0) {
        startNewRound();
    } else {
        console.error("Cannot start round, no country data loaded.");
        countryNameElement.textContent = "Failed to load countries.";
        // Maybe disable buttons if game can't start
        guessButton.disabled = true;
        nextButton.disabled = true;
    }
    console.log("Game initialized.");
}

// Start Game
window.onload = initGame;

// Function to show the info panel with facts and feed source names
function showCountryInfoPanel(country) {
    if (!country || !country.name) return;
    const countryName = country.name;
    const countryCode = country.alpha2Code; // Get the code loaded earlier

    panelCountryName.textContent = countryName;

    let facts = null;
    if (allCountryFacts) {
         facts = allCountryFacts[countryName];
    }

    let htmlContent = '';

    // --- Add Flag Image ---
    if (countryCode) {
        const flagUrl = `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`; // Use lowercase code, w160 = 160px width
        // Add onerror to hide if flag fails to load
        htmlContent += `<img src="${flagUrl}" alt="Flag of ${countryName}" style="width: 80px; height: auto; margin-bottom: 10px; border: 1px solid #ccc;" onerror="this.style.display='none'; console.error('Failed to load flag: ${flagUrl}');">`;
    } else {
        htmlContent += `<p><small>(Flag image unavailable)</small></p>`; // Fallback if no code
    }
    // --- End Flag Image ---


    if (facts && typeof facts === 'string') {
        console.log(`Formatting facts string for ${countryName}`);
        const factList = facts.split('. ').filter(f => f.trim() !== '');
        // Append facts after the image
        htmlContent += factList.map(f => `<p>${f}.</p>`).join('');
    }
    else if (facts) {
         console.warn(`Data found for ${countryName} in facts.json, but it's not a string (type: ${typeof facts}). Check facts.json structure.`);
         htmlContent += "<p>Fact data is not in the expected format.</p>";
    }
     else {
        // Append fallback message if facts are missing
        htmlContent += "<p>No specific facts available for this country yet.</p>";
        if (!allCountryFacts) { console.warn("Facts not loaded."); }
        else { console.warn(`Facts not found for country key: ${countryName}`); }
    }

    panelCountryFacts.innerHTML = htmlContent;

    // Make panel visible
    infoPanelElement.style.display = 'block';
    requestAnimationFrame(() => {
        infoPanelElement.classList.add('visible');
    });

    console.log(`Showing info panel for ${countryName}`);
}

// Function to hide the info panel
function hideCountryInfoPanel() {
    infoPanelElement.classList.remove('visible');
    infoPanelElement.style.display = 'none';
    panelCountryName.textContent = '';
    panelCountryFacts.innerHTML = ''; // Clear content
}

// --- Add Event Listener for Toggle ---
function setupEventListeners() {
    guessButton.addEventListener('click', handleGuessConfirm);
    nextButton.addEventListener('click', startNewRound);
    // Add listener for cloud toggle
    cloudToggleCheckbox.addEventListener('change', handleCloudToggle);

    // Pointer/Map interaction listeners (in initMap or here)
    // mapContainer.addEventListener('click', handleMapClick);
    mapContainer.addEventListener('pointerdown', onPointerDown, false);
    mapContainer.addEventListener('pointermove', onPointerMove, false);
    mapContainer.addEventListener('pointerup', onPointerUp, false);
    mapContainer.addEventListener('pointerleave', onPointerUp, false);
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