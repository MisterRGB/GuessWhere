const EARTH_RADIUS = 5;
const AIRPLANE_SCALE = 0.04;
const AIRPLANE_MIN_SCALE_FACTOR = 0.01;
const AIRPLANE_OFFSET_ABOVE_LINE = 0.05;

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
let currentAnimationDuration = 2000; // <<< ADDED: Variable to hold current duration, default value

// --- Three.js Variables ---
let scene, camera, renderer, globe, controls, raycaster, mouse;
let sunLight = null; // <-- Declare DirectionalLight globally
let ambientLight = null; // <-- Declare AmbientLight globally
let airplaneModel = null; // To store the loaded airplane scene
let activeAirplane = null; // The currently animating airplane instance
let currentLineCurve = null; // To store the curve path for the line/plane
let slipstreamParticles = null; // Points object for the slipstream
let slipstreamGeometry = null; // Geometry for particles
let particleMaterial = null; // Material for particles
let particleData = []; // Array to hold individual particle info (age, position)
const MAX_PARTICLES = 500; // Max number of particles in the system
const PARTICLE_LIFETIME = 1.0; // How long particles last in seconds
const PARTICLES_PER_FRAME = 3; // How many particles to emit each frame plane moves
const clock = new THREE.Clock();

// --- Camera Animation State ---
let isCameraFollowing = false;
let isCameraPullingBack = false;
let cameraPullBackStartTime = 0;
const CAMERA_PULL_BACK_DURATION = 1500;
const CAMERA_FOLLOW_DISTANCE = 2.5;
const CAMERA_FOLLOW_HEIGHT = 0.3;
const CAMERA_PULL_BACK_ALTITUDE = EARTH_RADIUS * 3.5;
const CAMERA_DISTANCE_PADDING_FACTOR = 1.2; // Padding factor for framing (1.0 = exact fit)
let initialCameraPosition = new THREE.Vector3();
let initialControlsTarget = new THREE.Vector3();
let targetCameraPosition = new THREE.Vector3();
let pullBackTargetPosition = new THREE.Vector3(); // Final position for pull-back
let pullBackLookAtTarget = new THREE.Vector3(); // Point camera looks at (pin position)
let finalLookAtPoint = new THREE.Vector3(); // Will now hold the country center vector
let pullBackStartPosition = new THREE.Vector3();
let pullBackStartQuaternion = new THREE.Quaternion(); // Camera rotation when pull-back starts
let pullBackTargetQuaternion = new THREE.Quaternion(); // Target rotation for pull-back
const tempMatrix = new THREE.Matrix4(); // For lookAt calculation

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
const DISTANCE_LINE_OFFSET = 0.0015; // <<< ADDED: Specific small offset for the distance line
const AIRPLANE_SPEED = 4.0;         // <<< ADDED: World units per second
const MIN_ANIMATION_DURATION = 750;   // <<< ADDED: Minimum duration in ms
const MAX_ANIMATION_DURATION = 5000;  // <<< ADDED: Maximum duration in ms
const TARGET_RING_COUNT = 5;
const PIN_MARKER_OFFSET = 0.005;
const CLOUD_ALTITUDE = 0.05;                   // <<< ADDED (Used in cloud geometry) {{ insert }}
const CLOUD_ROTATION_SPEED = 0.01;        // <<< RESTORED Constant Y Speed {{ insert }}
const CLOUD_X_OSCILLATION_AMPLITUDE = 0.03; // <<< ADDED: Max X rotation (radians) {{ insert }}
const CLOUD_X_OSCILLATION_FREQUENCY = 0.4; // <<< ADDED: Speed of X oscillation {{ insert }}
// const CLOUD_Y_OSCILLATION_AMPLITUDE = 0.08; // <<< REMOVED Y Amplitude {{ delete }}
// const CLOUD_Y_OSCILLATION_FREQUENCY = 1;    // <<< REMOVED Y Frequency {{ delete }}
const CLOUD_TEXTURE_PATH = 'assets/8k_earth_clouds.jpg'; // <<< ADDED DEFINITION {{ insert }}

// --- PIN CONSTANTS (Ensure these are here and defined) ---
const PIN_COLOR_DEFAULT = new THREE.Color(0xff0000);
const PIN_COLOR_HOVER = new THREE.Color(0xffa500);

// --- DEFINE SHARED COLOR FIRST ---
const LINE_AND_TARGET_COLOR = 0xffff00; // Yellow

// --- GraphQL API Interaction ---
const GRAPHQL_ENDPOINT = 'https://countries-274616.ew.r.appspot.com'; // From graphcountries README

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
    const globeGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
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

    console.log("Map initialized with shadows enabled.");
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
    return distance * CAMERA_DISTANCE_PADDING_FACTOR;
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime(); // Still needed for X oscillation

    if (cloudMesh) { // Ensure cloudMesh exists before rotating
        // X-axis rotation oscillates smoothly
        cloudMesh.rotation.x = Math.sin(elapsedTime * CLOUD_X_OSCILLATION_FREQUENCY) * CLOUD_X_OSCILLATION_AMPLITUDE;

        // Y-axis rotation is back to constant increment
        cloudMesh.rotation.y += CLOUD_ROTATION_SPEED * deltaTime; // <<< REVERTED to constant speed increment {{ modify }}
    }

    // --- Camera Logic ---
    if (isCameraFollowing && activeAirplane) {
        console.log("Camera Following: Entered follow block.");
        const planePos = activeAirplane.position;
        const planeDir = activeAirplane.getWorldDirection(new THREE.Vector3());
        const surfaceNormal = planePos.clone().normalize();
        targetCameraPosition.copy(planePos)
            .addScaledVector(planeDir, -CAMERA_FOLLOW_DISTANCE)
            .addScaledVector(surfaceNormal, CAMERA_FOLLOW_HEIGHT);
        camera.position.lerp(targetCameraPosition, 0.08);
        camera.lookAt(activeAirplane.position);
    } else if (isCameraPullingBack) {
        console.log("Camera Pull-Back: Entered pull-back block.");

        const pullBackElapsed = performance.now() - cameraPullBackStartTime;
        let pullBackProgress = Math.min(pullBackElapsed / CAMERA_PULL_BACK_DURATION, 1.0);
        const easedProgress = 0.5 - 0.5 * Math.cos(pullBackProgress * Math.PI);
        console.log(`  Pull-back Progress: ${pullBackProgress.toFixed(3)}, Eased: ${easedProgress.toFixed(3)}`);

        // Interpolate position
        const preLerpPos = camera.position.clone();
        camera.position.copy(pullBackStartPosition).lerp(pullBackTargetPosition, easedProgress);
        console.log(`  Cam Pos Lerp: (${preLerpPos.x.toFixed(2)}, ${preLerpPos.y.toFixed(2)}, ${preLerpPos.z.toFixed(2)}) -> (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);

        // Interpolate rotation towards the target quat (which looks at finalLookAtPoint)
        const preSlerpQuat = camera.quaternion.clone();
        camera.quaternion.slerpQuaternions(pullBackStartQuaternion, pullBackTargetQuaternion, easedProgress);
        console.log(`  Cam Quat Slerp: Updated (Values not easily readable, check if changing)`);

        if (pullBackProgress >= 1.0) {
            console.log("Camera pull-back animation logic finished.");
            isCameraPullingBack = false;
            controls.target.copy(finalLookAtPoint);
            console.log(`Final controls target set to country center (finalLookAtPoint): (${finalLookAtPoint.x.toFixed(2)}, ${finalLookAtPoint.y.toFixed(2)}, ${finalLookAtPoint.z.toFixed(2)})`);
            controls.enabled = true;
            controls.update();
        }
    } else if (controls.enabled) {
        controls.update();
    }
     // --- End Camera Logic ---

    if (isLineAnimating) {
        const elapsedTime = performance.now() - lineAnimationStartTime;
        const progress = Math.min(elapsedTime / currentAnimationDuration, 1.0);

        if (currentDistanceLine) {
            const pointsToDraw = Math.ceil(lineTotalPoints * progress);
            const verticesToDraw = Math.max(0, pointsToDraw);
            currentDistanceLine.geometry.setDrawRange(0, verticesToDraw);
        }

        if (activeAirplane && currentLineCurve) {
            const currentCurvePoint = currentLineCurve.getPointAt(progress);
            // Calculate position slightly above the curve point using the *curve point's* normal for offset
            const curveSurfaceNormal = currentCurvePoint.clone().normalize();
            const airplanePosition = currentCurvePoint.clone().addScaledVector(curveSurfaceNormal, AIRPLANE_OFFSET_ABOVE_LINE);
            activeAirplane.position.copy(airplanePosition);

            emitSlipstreamParticle(airplanePosition); // Emit particles

            // --- Correct Orientation Logic ---
            // 1. Calculate the tangent (direction of travel)
            const tangent = currentLineCurve.getTangentAt(progress).normalize();

            // 2. Calculate the surface normal at the airplane's *actual* position
            const surfaceNormal = airplanePosition.clone().normalize();

            // 3. Set the airplane's 'up' vector to the surface normal
            activeAirplane.up.copy(surfaceNormal);

            // 4. Calculate the point to look at (along the tangent)
            const lookAtPoint = airplanePosition.clone().add(tangent);

            // 5. Call lookAt - it will use the .up vector we just set
            activeAirplane.lookAt(lookAtPoint);
            // --- End Correct Orientation Logic ---

            let scaleProgressRatio = 0;
            const peakTime = 0.5;
            if (progress < peakTime) {
                scaleProgressRatio = progress / peakTime;
            } else {
                scaleProgressRatio = (1.0 - progress) / (1.0 - peakTime);
            }
            const easedScaleProgress = 0.5 - 0.5 * Math.cos(scaleProgressRatio * Math.PI);
            const minScale = AIRPLANE_SCALE * AIRPLANE_MIN_SCALE_FACTOR;
            const maxScale = AIRPLANE_SCALE;
            const currentScale = minScale + (maxScale - minScale) * easedScaleProgress;
            activeAirplane.scale.set(currentScale, currentScale, currentScale);
        }

        if (progress >= 1.0) {
            console.log("Line/Plane animation progress reached 1.0.");
            isLineAnimating = false;
            removeActiveAirplane();

            console.log(`Checking transition condition: isCameraFollowing = ${isCameraFollowing}`);

            // --- Transition from Follow to Pull-Back ---
            if (isCameraFollowing) {
                console.log("Transitioning to camera pull-back.");
                isCameraFollowing = false;

                pullBackStartPosition.copy(camera.position);
                pullBackStartQuaternion.copy(camera.quaternion);
                finalLookAtPoint.copy(targetCountryCenterVector);
                console.log(`Final look-at point set to country center: (${finalLookAtPoint.x.toFixed(2)}, ${finalLookAtPoint.y.toFixed(2)}, ${finalLookAtPoint.z.toFixed(2)})`);

                // Calculate final pull-back position based on FOV and Ring Size
                const fovRadians = THREE.MathUtils.degToRad(camera.fov);
                const requiredDistance = calculateCameraDistanceForRadius(TARGET_RING_MAX_RADIUS, fovRadians);
                pullBackTargetPosition.copy(finalLookAtPoint).addScaledVector(targetCountryCenterVector, requiredDistance);

                // Calculate final rotation (looking at the country center from the final position)
                tempMatrix.lookAt(pullBackTargetPosition, finalLookAtPoint, camera.up);
                pullBackTargetQuaternion.setFromRotationMatrix(tempMatrix);
                console.log(`Pull-back target quaternion calculated to look at country center.`);

                // Start pull-back animation
                isCameraPullingBack = true;
                cameraPullBackStartTime = performance.now();
                console.log(`Camera Pull-back START: isCameraPullingBack=${isCameraPullingBack}`);

            } else {
                console.log("Animation finished, but camera was not in following state. Enabling controls.");
                if (!isCameraPullingBack) {
                    controls.enabled = true;
                    finalLookAtPoint.copy(targetCountryCenterVector);
                    controls.target.copy(finalLookAtPoint);
                }
            }

            createTargetRings();
            showCountryInfoPanel(currentCountry);
        }
    }

    updateSlipstream(deltaTime);

    if (targetRings.length > 0) {
        const elapsedTime = targetRingClock.getElapsedTime();

        targetRings.forEach((ring, index) => {
            const timeOffset = (index / NUM_TARGET_RINGS) * PULSE_DURATION;
            const cycleTime = (elapsedTime + timeOffset) % PULSE_DURATION;
            const progress = cycleTime / PULSE_DURATION;

            const scale = progress;
            ring.scale.set(scale, scale, scale);

            const opacity = Math.pow(1.0 - progress, 2);
            ring.material.opacity = opacity;

            ring.visible = ring.material.opacity > 0.01;

        });
    }

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

    const x = -(EARTH_RADIUS * Math.cos(phi) * Math.cos(theta));
    const y = EARTH_RADIUS * Math.sin(phi);
    const z = EARTH_RADIUS * Math.cos(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// --- Country Data ---
async function loadCountryData() {
    console.log("Loading country data list from GeoJSON...");
    try {
        const response = await fetch('assets/countries.geojson');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const geojsonData = await response.json();

        countriesData = geojsonData.features.map(feature => {
            const [lon, lat] = feature.geometry.coordinates;
            const name = feature.properties.COUNTRY || feature.properties.name || feature.properties.ADMIN || feature.properties.NAME_EN;
            const alpha2Code = feature.properties.ISO || feature.properties.ISO_A2 || feature.properties.iso_a2 || feature.properties.alpha2Code || feature.properties.ISO_A2_EH;
            if (!name || typeof lat !== 'number' || typeof lon !== 'number') return null;
            const validAlpha2Code = (alpha2Code && typeof alpha2Code === 'string' && alpha2Code.length === 2) ? alpha2Code.toLowerCase() : null;
            if (!validAlpha2Code && name) console.warn(`Could not find valid alpha2Code for country: ${name}`, feature.properties);
            return { name, lat, lon, alpha2Code: validAlpha2Code, geometry: null };
        }).filter(country => country !== null);

        if (countriesData.length === 0) {
            console.error("No valid country data extracted from GeoJSON.");
            countryNameElement.textContent = "Error loading countries!";
             guessButton.disabled = true;
             nextButton.disabled = true;
        } else {
            console.log(`Loaded ${countriesData.length} countries from list.`);
        }

    } catch (error) {
        console.error("Failed to load or parse country list data:", error);
        countryNameElement.textContent = "Error loading countries!";
        countriesData = [];
         guessButton.disabled = true;
         nextButton.disabled = true;
    }
}

// --- NEW Function to populate dropdown ---
// function populateCountryDropdown() { ... } // Remove this entire function

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

async function loadCountryBoundary(country) {
    if (!country || !country.name) {
        console.error("Cannot load boundary for invalid country object.");
        return false;
    }
    // Simple filename generation: lowercase, replace spaces with underscores
    const filename = country.name.toLowerCase().replace(/ /g, '_') + '.json';
    const filepath = `assets/countries/${filename}`;
    // --- ADD THIS LOG ---
    console.log(`[loadCountryBoundary] Generated filepath: ${filepath} for country: ${country.name}`);
    // --------------------
    console.log(`[loadCountryBoundary] Attempting to load boundary data from: ${filepath}`);

    try {
        const response = await fetch(filepath);
        console.log(`[loadCountryBoundary] Fetch status for ${filepath}: ${response.status}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${filepath}`);
        }
        const boundaryData = await response.json();
        console.log(`[loadCountryBoundary] Successfully fetched and parsed ${filepath}`);

        if (boundaryData && boundaryData.features && boundaryData.features.length > 0 && boundaryData.features[0].geometry) {
            const geomType = boundaryData.features[0].geometry.type;
             console.log(`[loadCountryBoundary] Found geometry type: ${geomType} for ${country.name}`);
            if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                 country.geometry = boundaryData.features[0].geometry;
                 console.log(`[loadCountryBoundary] Successfully stored boundary geometry (${geomType}) for ${country.name}`);
                 return true;
            } else {
                 console.warn(`[loadCountryBoundary] Loaded file for ${country.name}, but geometry type is ${geomType}, not Polygon or MultiPolygon.`);
                 country.geometry = null;
                 return false;
            }
        } else {
             console.error(`[loadCountryBoundary] Invalid GeoJSON structure in ${filepath}`);
            throw new Error(`Invalid GeoJSON structure in ${filepath}`);
        }
    } catch (error) {
        console.error(`[loadCountryBoundary] Failed to load or parse boundary data for ${country.name}:`, error);
        country.geometry = null;
        return false;
    }
}

async function startNewRound() {
    console.log("Starting new round...");
    console.log(`Start of Round - Initial Cam Pos: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`);
    console.log(`Start of Round - Initial Controls Target: ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}`);

    isLineAnimating = false;
    isCameraFollowing = false;
    isCameraPullingBack = false;

    // Ensure controls are enabled
    if (!controls.enabled) {
        console.log("Controls were disabled, re-enabling in startNewRound.");
        controls.enabled = true;
    }

    // <<< --- RESET CONTROLS TARGET --- >>>
    controls.target.set(0, 0, 0); // Reset pivot point to center of the globe
    controls.update(); // Update controls state immediately after resetting target
    console.log(`Controls target reset to origin (0,0,0) for new guess.`);
    // <<< --- END RESET --- >>>

    hideCountryInfoPanel();
    isGuessLocked = false;
    currentLineCurve = null;

    // Remove previous visuals
    removePin();
    removeTargetRings();
    removeHighlightedBoundaries();
    removeActiveAirplane();
    if (currentDistanceLine) {
        scene.remove(currentDistanceLine);
        if(currentDistanceLine.geometry) currentDistanceLine.geometry.dispose();
        if(currentDistanceLine.material) currentDistanceLine.material.dispose();
        currentDistanceLine = null;
    }

    // --- Reset Particle Ages ---
    if (particleData) {
        particleData.forEach(p => p.age = PARTICLE_LIFETIME);
        if (slipstreamGeometry && slipstreamGeometry.attributes.position) {
             slipstreamGeometry.attributes.position.needsUpdate = true;
             slipstreamGeometry.attributes.color.needsUpdate = true;
        }
    }

    // --- Use random selection again ---
    currentCountry = selectRandomCountry();
    // ---------------------------------

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

    // Load boundary data
    console.log(`[startNewRound] About to load boundary for: ${currentCountry.name}`);
    const boundaryLoaded = await loadCountryBoundary(currentCountry);
    console.log(`[startNewRound] Boundary loading completed for ${currentCountry.name}. Success: ${boundaryLoaded}`);
    console.log(`[startNewRound] currentCountry.geometry after load attempt:`, currentCountry.geometry);
    if (!boundaryLoaded) {
        console.warn(`[startNewRound] Could not load boundary for ${currentCountry.name}. Scoring will rely on distance only.`);
    }

    console.log(`[startNewRound] New round setup complete for: ${currentCountry.name}.`);
    console.log(`End of startNewRound setup - Controls Target: ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}`);
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
    return Math.round(R * c);
}

async function handleGuessConfirm() {
    if (!playerGuess || !currentCountry || !pinSprite) {
         console.warn("Cannot confirm guess. Pin not placed or country not loaded.");
         return;
    }
    guessButton.disabled = true;
    nextButton.style.display = 'none';
    isGuessLocked = true;
    // countrySelectElement.disabled = true; // Keep commented if dropdown removed
    console.log("Confirming guess...");
    console.log("Current country geometry before scoring/highlighting:", currentCountry.geometry);

    let roundScore = 0;
    let distance = null; // Initialize distance

    // --- NEW SCORING LOGIC ---
    if (currentCountry.geometry) {
        const isInside = isPointInCountry(playerGuess, currentCountry.geometry);
        if (isInside) {
            console.log("Guess is INSIDE country boundary!");
            roundScore = 1000;
            distance = 0; // Display 0 distance for perfect guess
        } else {
            console.log("Guess is OUTSIDE country boundary. Calculating score by distance.");
            distance = calculateDistance(
                playerGuess.lat, playerGuess.lon,
                currentCountry.lat, currentCountry.lon // Use center point coords
            );
            // Apply the 1000km threshold scoring
            if (distance <= 1000) {
                roundScore = 1000 - distance;
                console.log(`Distance (${distance}km) <= 1000km. Score: ${roundScore}`);
            } else {
                roundScore = 0; // Outside 1000km range
                 console.log(`Distance (${distance}km) > 1000km. Score: 0`);
            }
        }
    } else { // Fallback if boundary data failed to load
        console.warn("No boundary data for country, calculating score by distance only.");
        distance = calculateDistance(
            playerGuess.lat, playerGuess.lon,
            currentCountry.lat, currentCountry.lon // Use center point coords
        );
        // Apply the 1000km threshold scoring (fallback)
        if (distance <= 1000) {
            roundScore = 1000 - distance;
             console.log(`Fallback: Distance (${distance}km) <= 1000km. Score: ${roundScore}`);
        } else {
            roundScore = 0; // Outside 1000km range
             console.log(`Fallback: Distance (${distance}km) > 1000km. Score: 0`);
        }
    }
    // Ensure score is not negative (shouldn't happen with this logic, but safe)
    roundScore = Math.max(0, roundScore);
    // --- END NEW SCORING LOGIC ---


    // Update total score and UI
    score += roundScore;
    scoreElement.textContent = score;
    distanceElement.textContent = distance !== null ? `${distance}` : 'Error'; // Display calculated distance or 0

    // Log results
    console.log(`Guessed: ${playerGuess.lat.toFixed(2)}, ${playerGuess.lon.toFixed(2)}`);
    console.log(`Actual (Center): ${currentCountry.lat.toFixed(2)}, ${currentCountry.lon.toFixed(2)}`);
    console.log(`Distance: ${distance} km, Score: ${roundScore}`);

    // --- Store Country Center Vector ---
    targetCountryCenterVector = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
    console.log(`Stored target country center vector: (${targetCountryCenterVector.x.toFixed(2)}, ${targetCountryCenterVector.y.toFixed(2)}, ${targetCountryCenterVector.z.toFixed(2)})`);

    // --- Start Camera Follow Sequence ---
    if (pinSprite) {
        console.log("Starting camera follow sequence.");
        initialCameraPosition.copy(camera.position);
        initialControlsTarget.copy(controls.target);
        controls.enabled = false;
        isCameraFollowing = true;
        isCameraPullingBack = false;
        pullBackLookAtTarget.copy(pinSprite.position);
    } else {
        console.error("Pin marker not available for camera sequence.");
    }
    // --- End Camera Follow Sequence ---

    // --- Draw distance line AND Prepare Curve for Airplane ---
    const startVec = pinSprite.position.clone().normalize();
    const endVec = getPointFromLatLon(currentCountry.lat, currentCountry.lon).normalize();
    const points = [];
    const numPoints = 50; // Increased points for smoother curve
    const arcOffset = DISTANCE_LINE_OFFSET; // Use the constant for the VISIBLE line

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        // Interpolate linearly in normalized space, then re-normalize and scale
        const intermediateVec = new THREE.Vector3().lerpVectors(startVec, endVec, t).normalize();
        // Add offset from the globe surface for the visible line
        intermediateVec.multiplyScalar(EARTH_RADIUS + arcOffset);
        points.push(intermediateVec);
    }

    // --- Create the smooth curve for animation path ---
    currentLineCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1); // Smoother curve

    // --- Setup VISIBLE line geometry (using original 'points') ---
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
    currentDistanceLine.geometry.setDrawRange(0, 0); // Start invisible
    scene.add(currentDistanceLine);
    lineTotalPoints = points.length; // Keep using original points length for line draw range

    // --- Instantiate Airplane ---
    removeActiveAirplane(); // Remove previous one if any
    if (airplaneModel && currentLineCurve) {
        console.log("Instantiating airplane...");
        activeAirplane = airplaneModel.clone(); // Clone the loaded model

        // Get initial position slightly ABOVE the line start
        const initialPosition = currentLineCurve.getPointAt(0);
        const surfaceNormal = initialPosition.clone().normalize();
        initialPosition.addScaledVector(surfaceNormal, AIRPLANE_OFFSET_ABOVE_LINE);
        activeAirplane.position.copy(initialPosition);

        // Initial orientation
        const tangent = currentLineCurve.getTangentAt(0).normalize();
        const lookAtPos = initialPosition.clone().add(tangent);
        activeAirplane.lookAt(lookAtPos);
        // You might need to add an extra rotation if the model isn't oriented correctly along its local Z axis
        // activeAirplane.rotateX(Math.PI / 2); // <<< COMMENTED OUT corrective rotation

        scene.add(activeAirplane);
    } else if (!airplaneModel) {
         console.warn("Cannot create airplane instance: Model not loaded yet.");
    }
     // --- END Instantiate Airplane ---

    // Start Animation Timer
    lineAnimationStartTime = performance.now();
    isLineAnimating = true;


    // Highlight Country Boundary
    if (currentCountry.geometry) {
        highlightCountryBoundary(currentCountry.geometry);
    } else {
        console.warn("Skipping boundary highlight because geometry is missing.");
    }

    nextButton.style.display = 'block';
}

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
    removeTargetRings();
    targetRingClock.start();

    console.log("Creating target ring lines...");

    const targetPositionOnSphere = getPointFromLatLon(currentCountry.lat, currentCountry.lon);
    const targetPositionOffset = targetPositionOnSphere.clone().normalize().multiplyScalar(EARTH_RADIUS + PIN_OFFSET);

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
    console.log("Initializing game...");
    setupEventListeners();
    hideCountryInfoPanel();
    initMap(); // Init map first
    initSlipstreamParticles(); // Initialize particle system

    // Load data concurrently
    const dataPromises = [
        loadCountryData(),
        loadFactsData(),
        loadAirplaneModel() // Load airplane model
    ];

    try {
        await Promise.all(dataPromises); // Wait for all essential data
        console.log("All essential data loaded.");

        if (countriesData.length > 0) {
            startNewRound();
        } else {
            console.error("Cannot start round, no country data loaded.");
            guessButton.disabled = true;
            nextButton.disabled = true;
        }
    } catch (error) {
        console.error("Error during game initialization loading:", error);
        // Handle critical loading errors (e.g., display message to user)
        countryNameElement.textContent = "Error initializing game!";
        guessButton.disabled = true;
        nextButton.disabled = true;
    }

    console.log("Game initialization sequence complete.");
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

// --- Load Airplane Model ---
async function loadAirplaneModel() {
    return new Promise((resolve, reject) => {
        console.log("Loading airplane model...");
        const loader = new THREE.GLTFLoader();
        loader.load(
            'assets/airplane.glb',
            (gltf) => {
                console.log("Airplane model loaded successfully.");
                airplaneModel = gltf.scene;
                // Apply initial settings (optional, can be done on instantiation)
                airplaneModel.traverse(function (node) {
                    if (node.isMesh) {
                        node.castShadow = true;
                        // Optional: Adjust material properties if needed
                        // node.material.metalness = 0.5;
                    }
                });
                // Initial scale and rotation might be better set when cloning/adding to scene
                // airplaneModel.scale.set(AIRPLANE_SCALE, AIRPLANE_SCALE, AIRPLANE_SCALE); // Uses constant
                resolve();
            },
            undefined, // Progress callback (optional)
            function (error) {
                console.error('An error happened loading the airplane model:', error);
                reject(error);
            }
        );
    });
}

// --- Function to remove the active airplane ---
function removeActiveAirplane() {
    if (activeAirplane) {
        console.log("Removing active airplane...");
        scene.remove(activeAirplane);
        // If you cloned materials, you might need to dispose them too.
        // For simple clones, geometry/material disposal is often handled by the source model.
        activeAirplane = null;
    }
    // Hide particles when plane stops/is removed
    if (slipstreamParticles) {
       slipstreamParticles.visible = false; // Hide until next emission
    }
}

// --- Initialize Slipstream ---
function initSlipstreamParticles() {
    console.log("Initializing slipstream particle system...");
    slipstreamGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3); // r, g, b for each particle

    // Initialize particle data storage
    particleData = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        colors[i * 3] = 1; // Constant White
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
        particleData.push({
            position: new THREE.Vector3(0, 0, 0),
            age: PARTICLE_LIFETIME // Start as "dead"
        });
    }

    slipstreamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    slipstreamGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // Still need color attribute if vertexColors is true

    // Create material
    particleMaterial = new THREE.PointsMaterial({
        size: 0.02, // <<< MADE SMALLER
        vertexColors: true, // Set to false if we don't need per-particle color variation
        transparent: true,
        opacity: 0.6, // <<< SET TO 60%
        depthWrite: false
    });
    // If vertexColors is set to false, you could remove the 'color' attribute setup above
    // and the color update loop in updateSlipstream. But keeping it is flexible.

    slipstreamParticles = new THREE.Points(slipstreamGeometry, particleMaterial);
    slipstreamParticles.visible = false;
    scene.add(slipstreamParticles);
    console.log("Slipstream particle system initialized.");
}

// --- Helper to Emit Particles ---
let nextParticleIndex = 0;
function emitSlipstreamParticle(originPosition) {
    if (!slipstreamParticles || !activeAirplane) return;

    for (let i = 0; i < PARTICLES_PER_FRAME; i++) {
        const pIndex = nextParticleIndex % MAX_PARTICLES;
        const p = particleData[pIndex];

        const backwardOffset = activeAirplane.getWorldDirection(new THREE.Vector3()).multiplyScalar(-0.1);
        p.position.copy(originPosition).add(backwardOffset);
        p.age = 0; // Reset age

        nextParticleIndex++;
    }
     slipstreamParticles.visible = true;
}

// --- Update Slipstream ---
function updateSlipstream(deltaTime) {
    if (!slipstreamParticles || !slipstreamGeometry) return;

    const positions = slipstreamGeometry.attributes.position.array;
    const colors = slipstreamGeometry.attributes.color.array; // Keep color attribute if vertexColors: true
    let needsPosUpdate = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particleData[i];
        if (p.age < PARTICLE_LIFETIME) {
            p.age += deltaTime; // Increment age

            // Update geometry attributes
            positions[i * 3] = p.position.x;
            positions[i * 3 + 1] = p.position.y;
            positions[i * 3 + 2] = p.position.z;
            needsPosUpdate = true;

        } else if (positions[i*3] < 10000) { // Check if it's not already hidden
             // Hide dead particles (move them far away) only once
             positions[i * 3] = 10000;
             positions[i * 3 + 1] = 10000;
             positions[i * 3 + 2] = 10000;
             needsPosUpdate = true;
        }
    }

    if (needsPosUpdate) slipstreamGeometry.attributes.position.needsUpdate = true;
}

const TARGET_RING_MAX_RADIUS = EARTH_RADIUS * 0.15;

function createAndStartAirplaneAnimation(startCoords, endCoords) {
    // Calculate curve points (start, end, control points)
    const startVec = latLonToVector3(startCoords.lat, startCoords.lon, EARTH_RADIUS);
    const endVec = latLonToVector3(endCoords.lat, endCoords.lon, EARTH_RADIUS);
    const distancePoints = [startVec];
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    const midLength = midPoint.length();
    midPoint.normalize().multiplyScalar(midLength + startVec.distanceTo(endVec) * 0.4); // Adjust curve height factor
    const controlPoint1 = startVec.clone().lerp(midPoint, 0.5).normalize().multiplyScalar(EARTH_RADIUS + 0.2);
    const controlPoint2 = endVec.clone().lerp(midPoint, 0.5).normalize().multiplyScalar(EARTH_RADIUS + 0.2);

    // Create the curve
    currentLineCurve = new THREE.CubicBezierCurve3(startVec, controlPoint1, controlPoint2, endVec);
    if (!currentLineCurve) {
        console.error("Failed to create line curve.");
        return;
    }

    // --- Calculate Dynamic Duration ---
    const curveLength = currentLineCurve.getLength();
    let duration = (curveLength / AIRPLANE_SPEED) * 1000; // Duration in ms
    currentAnimationDuration = Math.max(MIN_ANIMATION_DURATION, Math.min(duration, MAX_ANIMATION_DURATION)); // Clamp duration
    console.log(`Curve Length: ${curveLength.toFixed(2)}, Calculated Duration: ${duration.toFixed(0)}ms, Clamped Duration: ${currentAnimationDuration}ms`);
    // --- End Calculate Dynamic Duration ---


    if (!airplaneModel) {
        console.error("Airplane model not loaded yet!");
        return;
    }
    removeActiveAirplane(); // Remove any existing airplane

    activeAirplane = airplaneModel.clone();
    // Set initial position and scale
    const startPoint = currentLineCurve.getPointAt(0);
    const startNormal = startPoint.clone().normalize();
    activeAirplane.position.copy(startPoint.addScaledVector(startNormal, AIRPLANE_OFFSET_ABOVE_LINE));
    activeAirplane.scale.set(AIRPLANE_SCALE * AIRPLANE_MIN_SCALE_FACTOR, AIRPLANE_SCALE * AIRPLANE_MIN_SCALE_FACTOR, AIRPLANE_SCALE * AIRPLANE_MIN_SCALE_FACTOR);
    activeAirplane.visible = true;
    scene.add(activeAirplane);

    // Start animation timers
    lineAnimationStartTime = performance.now();
    isLineAnimating = true;

    // Reset particle system
    // ... (particle reset logic) ...

    console.log("Airplane animation started.");
} 