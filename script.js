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

// --- Three.js Variables ---
let scene, camera, renderer, globe, controls, raycaster, mouse;
let sunLight = null; // <-- Declare DirectionalLight globally
let ambientLight = null; // <-- Declare AmbientLight globally

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
    // --- Globe Receives Shadows ---
    globe.receiveShadow = true; // Globe can always receive shadows if enabled
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
        // --- Clouds Receive Shadows ---
        cloudMesh.receiveShadow = true; // Clouds can always receive shadows if enabled
        // --- Clouds Can Cast Shadows (optional, can be expensive) ---
        // cloudMesh.castShadow = true;
        cloudMesh.visible = cloudToggleCheckbox.checked;
        scene.add(cloudMesh);
        console.log(`Cloud layer added. Initial visibility: ${cloudMesh.visible}`);
    } catch (error) {
        console.error("Failed to create cloud layer:", error);
    }
    // --- End Cloud Layer ---

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
    controls.minDistance = GLOBE_RADIUS + 1; // Prevent zooming inside globe
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

    console.log("Map initialized with shadows enabled.");
}

function onWindowResize() {
    camera.aspect = mapContainer.clientWidth / mapContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mapContainer.clientWidth, mapContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    // --- IMPORTANT: Update Controls for Damping ---
    controls.update(); // MUST be called each frame if enableDamping is true
    // ---------------------------------------------

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
        nextButton.disabled = true;
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
    removeTargetRings();
    targetRingClock.start();

    console.log("Creating target ring lines...");

    const targetPositionOnSphere = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
    const targetPositionOffset = targetPositionOnSphere.clone().normalize().multiplyScalar(GLOBE_RADIUS + PIN_OFFSET);

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
        ringLine.lookAt(globe.position);
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
        mapContainer.style.cursor = 'grabbing';
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

    if (!isDraggingPin) {
        if (pinIntersects.length > 0) {
            // --- REMOVE Scale and Color changes for hover ---
            // pinSprite.scale.set(PIN_SCALE_HOVER, PIN_SCALE_HOVER, PIN_SCALE_HOVER);
            // pinSprite.material.color.copy(PIN_COLOR_HOVER);
            // --- Keep Cursor Change ---
            mapContainer.style.cursor = 'grab';
        } else {
            // --- REMOVE Scale and Color reset ---
            // if (pinSprite) {
            //    pinSprite.scale.set(PIN_SCALE_DEFAULT, PIN_SCALE_DEFAULT, PIN_SCALE_DEFAULT);
            //    pinSprite.material.color.copy(PIN_COLOR_DEFAULT);
            // }
            // --- Keep Cursor Change ---
            mapContainer.style.cursor = 'auto';
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
            const newPinPosition = intersectionPoint.clone().normalize().multiplyScalar(GLOBE_RADIUS + PIN_OFFSET);
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
    console.log("Initializing game...");
    setupEventListeners(); // Sets up all listeners including shadow toggle
    hideCountryInfoPanel();
    initMap(); // Creates scene, enables/disables shadows based on checkbox default

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

// Function to show the info panel (Mobile layout structure built here)
function showCountryInfoPanel(country) {
    if (!country || !country.name) return;
    const countryName = country.name;
    const countryCode = country.alpha2Code;

    // --- Prepare Content Parts ---
    let flagHtml = '';
    if (countryCode) {
        const flagUrl = `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
        flagHtml = `<img src="${flagUrl}" alt="Flag of ${countryName}" onerror="this.style.display='none'; console.error('Failed to load flag: ${flagUrl}');">`;
    } else {
        flagHtml = `<div class="no-flag">(Flag unavailable)</div>`; // Placeholder if no flag
    }

    let factsHtml = '';
    let facts = null;
    if (allCountryFacts) {
        facts = allCountryFacts[countryName];
    }

    if (facts && typeof facts === 'string') {
        const factList = facts.split('. ').filter(f => f.trim() !== '');
        factsHtml = factList.map(f => `<p>${f}.</p>`).join('');
    } else if (facts) {
        factsHtml = "<p>Fact data is not in the expected format.</p>";
    } else {
        factsHtml = "<p>No specific facts available for this country yet.</p>";
    }

    // --- Construct Panel Inner HTML ---
    infoPanelElement.innerHTML = `
        <div class="info-content-wrapper">
            <div class="info-flag-column">
                ${flagHtml}
            </div>
            <div class="info-text-column">
                <h2 id="panel-country-name">${countryName}</h2>
                <hr>
                <div id="panel-country-facts">
                    ${factsHtml}
                </div>
            </div>
        </div>
    `; // Overwrite entire panel content with new structure

    // --- Visibility Control ---
    infoPanelElement.style.display = 'block'; // Show the panel

    console.log(`Showing info panel for ${countryName}`);
}

// Function to hide the info panel (Clear innerHTML)
function hideCountryInfoPanel() {
    infoPanelElement.style.display = 'none';
    infoPanelElement.innerHTML = ''; // Clear the content completely
}

// --- Add Event Listener for Toggle ---
function setupEventListeners() {
    guessButton.addEventListener('click', handleGuessConfirm);
    nextButton.addEventListener('click', startNewRound);
    cloudToggleCheckbox.addEventListener('change', handleCloudToggle);
    shadowToggleCheckbox.addEventListener('change', handleShadowToggle);

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