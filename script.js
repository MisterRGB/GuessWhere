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
const CLOUD_TEXTURE_PATH = 'assets/8k_earth_clouds.jpg'; // <<< ADDED DEFINITION {{ insert }}
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
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    const now = performance.now();

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

    if (isLineAnimating) {
        const lineElapsedTime = now - lineAnimationStartTime;
        const progress = Math.min(lineElapsedTime / currentAnimationDuration, 1.0);

        if (currentDistanceLine) {
        const pointsToDraw = Math.ceil(lineTotalPoints * progress);
        const verticesToDraw = Math.max(0, pointsToDraw);
        currentDistanceLine.geometry.setDrawRange(0, verticesToDraw);
        }

        // --- Score Sprite Animation --- {{ modify }}
        if (scoreSprite && currentLineCurve) {
            if (progress < 1.0) { // Only animate while line is moving
                const currentCurvePos = currentLineCurve.getPointAt(progress);
                const surfaceNormal = currentCurvePos.clone().normalize();
                const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                const upOffset = easedProgress * SCORE_ANIMATION_MAX_HEIGHT;
                const scoreSpritePosition = currentCurvePos.clone()
                    .addScaledVector(surfaceNormal, SCORE_OFFSET_ABOVE_LINE + upOffset);

                // --- Animate Score Value --- {{ insert }}
                const targetScore = progress * currentRoundScore; // Target score based on progress
                // Lerp the displayed value towards the target score
                animatedScoreDisplayValue = THREE.MathUtils.lerp(animatedScoreDisplayValue, targetScore, 0.08); // Adjust lerp factor (0.08) for speed
                // --- End Animate Score Value ---

                // Update Canvas Text with the animated value
                scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
                // Display the rounded, animated score
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
                 // Hide slightly after finishing (handled below)
            }
        }
        // --- End Score Sprite Animation ---

        if (progress >= 1.0) {
            isLineAnimating = false; // Stop line animation flag

            // Hide score sprite shortly after animation ends
            if (scoreSprite) setTimeout(() => { scoreSprite.visible = false; }, 100); // Hide after 100ms delay

            // --- Animation End Handling ---
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
            // --- End Animation End Handling ---

            createTargetRings();
            showCountryInfoPanel(currentCountry);
        }
    } else {
         // If line is not animating, ensure score is hidden
         if (scoreSprite && scoreSprite.visible) {
             scoreSprite.visible = false;
    }
    }

    if (targetRings.length > 0) {
        const elapsedTime = targetRingClock.getElapsedTime();

        targetRings.forEach((ring, index) => {
            const timeOffset = (index / NUM_TARGET_RINGS) * PULSE_DURATION;
            const cycleTime = (elapsedTime + timeOffset) % PULSE_DURATION;
            const progress = cycleTime / PULSE_DURATION;

            const scale = progress;
            ring.scale.set(scale, scale, scale);

            // --- Use a linear fade-out ---
            const opacity = 1.0 - progress; // <<< Changed to linear fade
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
    console.log("Loading country data and shapes from GeoJSON...");
    try {
        const response = await fetch('assets/countries_shapes.geojson');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const geojsonData = await response.json();

        // --- Log properties of the first feature for debugging property names ---
        if (geojsonData.features && geojsonData.features.length > 0) {
            console.log("Properties of the first feature:", geojsonData.features[0].properties);
        }
        // --- End log ---

        countriesData = geojsonData.features.map(feature => {
            const properties = feature.properties;
            const geometry = feature.geometry;
            const name = properties.COUNTRY || properties.name || properties.ADMIN || properties.NAME_EN || properties.NAME || properties.NAME_LONG;

            // --- Determine and Validate Alpha2Code ---
            const alpha2Code = properties.ISO ||
                               properties.ISO_A2 ||
                               properties.iso_a2 ||
                               properties.alpha2Code ||
                               properties.ISO_A2_EH ||
                               properties["ISO3166-1-Alpha-2"];

            // Validate the code strictly: must be a 2-character string, not '-99' etc.
            const validAlpha2Code = (alpha2Code && typeof alpha2Code === 'string' && alpha2Code.length === 2 && alpha2Code !== '-99')
                                   ? alpha2Code.toLowerCase()
                                   : null;
            // --- End Alpha2Code Validation ---


            // Find representative point (BEST EFFORT - Do not require)
            let lat = null, lon = null;
            if (geometry && geometry.type === 'Point' && geometry.coordinates) {
                 [lon, lat] = geometry.coordinates;
            } else if (properties.lat && properties.lon) {
                 lat = properties.lat;
                 lon = properties.lon;
            } else if (properties.latitude && properties.longitude) {
                 lat = properties.latitude;
                 lon = properties.longitude;
            }
             // Convert found lat/lon to numbers if they are strings
             if (lat !== null && typeof lat === 'string') lat = parseFloat(lat);
             if (lon !== null && typeof lon === 'string') lon = parseFloat(lon);


            // --- STRONGER Validation: Require name, valid geometry, AND valid alpha2Code ---
            if (!name || !geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') || !validAlpha2Code) {
                // Skip if essential info is missing (name, valid shape, or valid 2-letter code)
                 console.warn(`Filtering out feature: Missing name, invalid geometry, or invalid/missing alpha2Code.`,
                              { name, type: geometry?.type, codeFound: alpha2Code, codeValid: !!validAlpha2Code });
                return null; // <<< Return null to filter this feature out
            }
            // --- End STRONGER Validation ---

            // Log if representative lat/lon was NOT found (keep this logic)
            if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
                console.log(`Note: Representative lat/lon properties not found or invalid for ${name}. Center will be calculated from geometry.`);
                lat = 0;
                lon = 0;
            }

            return {
                name,
                lat,
                lon,
                alpha2Code: validAlpha2Code, // Store the validated, non-null code
                geometry: geometry
            };
        }).filter(country => country !== null); // Filter out the nulls returned above

        if (countriesData.length === 0) {
            console.error("No valid country data extracted from countries_shapes.geojson. Check the first feature properties log above and adjust property names in the script if needed.");
            countryNameElement.textContent = "Error loading countries!";
             if (guessButton) guessButton.disabled = true;
             if (nextButton) nextButton.disabled = true;
        } else {
            console.log(`Loaded ${countriesData.length} countries with shapes from list.`);
        }

    } catch (error) {
        console.error("Failed to load or parse country shapes data:", error);
        countryNameElement.textContent = "Error loading countries!";
        countriesData = [];
         if (guessButton) guessButton.disabled = true;
         if (nextButton) nextButton.disabled = true;
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
    return Math.round(R * c); // Returns distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

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
    console.log("Initializing game...");
    // initMap first, as it appends the renderer's canvas
    initMap();

    // Now setup listeners and initialize other parts
    setupEventListeners();
    hideCountryInfoPanel();
    initScoreDisplay();
    initDistanceDisplay(); // <<< Call should be here, AFTER the function definition

    const dataPromises = [
        loadCountryData(),
        loadFactsData(),
    ];

    try {
        await Promise.all(dataPromises);
        console.log("All essential data loaded.");

        if (countriesData.length > 0) {
            startNewRound(); // Start the first round randomly
        } else {
            console.error("Cannot start round, no country data loaded.");
             if (guessButton) guessButton.disabled = true;
             if (nextButton) nextButton.disabled = true;
        }
    } catch (error) {
        console.error("Error during game initialization loading:", error);
        if (countryNameElement) countryNameElement.textContent = "Error initializing game!";
         if (guessButton) guessButton.disabled = true;
         if (nextButton) nextButton.disabled = true;
    }

    console.log("Game initialization sequence complete.");
}

// Start Game
window.onload = initGame; // <<< initGame call happens here

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