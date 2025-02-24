let scene, camera, renderer, tasks3D;
const taskObjects = new Map();

// Add global mouse position tracking
const mousePosition = {
    x: 0,
    y: 0,
    initialized: false
};

// Add to global variables at the top
let isDragMode = false;
let isDragging = false;
let selectedTask = null;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const intersection = new THREE.Vector3();

// Add to global variables
const dragInterpolation = {
    current: new THREE.Vector3(),
    target: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    dampening: 0.1,  // Reduced from 0.15 for smoother movement
    friction: 0.85   // Added friction coefficient
};

function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        transparent: true
    });

    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add point lights for neon effect
    const pointLight1 = new THREE.PointLight(0x00f3ff, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x9d00ff, 1, 100);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Create stars
    createStars();

    camera.position.z = 30;

    // Add mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        mousePosition.x = mouse.x;
        mousePosition.y = mouse.y;
        mousePosition.initialized = true;

        if (isDragMode && isDragging && selectedTask) {
            raycaster.setFromCamera(mouse, camera);
            if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                // Update target position smoothly
                dragInterpolation.target.copy(intersection);
            }
        } else {
            // Regular hover effect
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            scene.children.forEach(object => {
                if (object.isTask) {
                    object.material.emissive.setHex(0x000000);
                }
            });

            if (intersects.length > 0) {
                const intersected = intersects[0].object;
                if (intersected.isTask) {
                    intersected.material.emissive.setHex(0x00ff00);
                    document.body.style.cursor = isDragMode ? 'move' : 'pointer';
                    playHoverSound();
                }
            } else {
                document.body.style.cursor = 'default';
            }
        }
    });

    window.addEventListener('mousedown', (event) => {
        if (isDragMode) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            if (intersects.length > 0) {
                const intersected = intersects[0].object;
                if (intersected.isTask) {
                    isDragging = true;
                    selectedTask = intersected;
                    
                    // Update drag plane to match camera orientation
                    dragPlane.setFromNormalAndCoplanarPoint(
                        camera.getWorldDirection(dragPlane.normal),
                        selectedTask.position
                    );
                    
                    // Initialize drag interpolation at current position
                    dragInterpolation.current.copy(selectedTask.position);
                    dragInterpolation.target.copy(selectedTask.position);
                    
                    // Get the initial intersection point
                    raycaster.ray.intersectPlane(dragPlane, intersection);
                    dragInterpolation.target.copy(intersection);
                    
                    document.body.style.cursor = 'grabbing';
                }
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragMode) {
            isDragging = false;
            selectedTask = null;
            document.body.style.cursor = 'default';
        }
    });

    window.addEventListener('click', (event) => {
        if (!isDragMode && !isDragging) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            if (intersects.length > 0) {
                const intersected = intersects[0].object;
                if (intersected.isTask) {
                    showTaskDetails(intersected.taskData);
                }
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ... rest of the code remains the same until animate function ...

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Update drag position
    updateDragPosition();

    // Animate tasks
    taskObjects.forEach((object) => {
        // Unique floating animation for each task
        object.position.y += Math.sin(time + object.floatOffset) * 0.01;
        
        // Rotation speed based on priority
        const rotationSpeed = object.taskData.priority * 0.001;
        object.rotation.x += rotationSpeed;
        object.rotation.y += rotationSpeed * 1.5;
        
        // Pulse effect for urgent tasks
        if (object.taskData.urgent) {
            const pulse = Math.sin(time * 5) * 0.1 + 0.9;
            object.scale.set(pulse, pulse, pulse);
            
            // Make the glow pulse too
            if (object.children[0]) {
                const glow = Math.sin(time * 5) * 0.2 + 1.2;
                object.children[0].scale.set(glow, glow, glow);
            }
        }
    });

    // Camera movement
    if (mousePosition.initialized) {
        camera.position.x += (mousePosition.x * 30 - camera.position.x) * 0.05;
        camera.position.y += (mousePosition.y * 30 - camera.position.y) * 0.05;
        
        // Add slight camera rotation
        camera.rotation.z = mousePosition.x * 0.1;
    }
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}

// Add toggle function
function toggleDragMode() {
    isDragMode = !isDragMode;
    const button = document.getElementById('drag-toggle');
    if (isDragMode) {
        button.textContent = 'Disable Drag Mode';
        button.classList.add('active');
    } else {
        button.textContent = 'Enable Drag Mode';
        button.classList.remove('active');
        // Reset any ongoing drag
        selectedTask = null;
        isDragging = false;
    }
}

// Add CSS styles for the active drag mode button
const style = document.createElement('style');
style.textContent = `
    .neon-button.active {
        background: var(--neon-blue);
        color: #000;
        box-shadow: 0 0 20px var(--neon-blue);
    }
`;
document.head.appendChild(style);

// Add updateDragPosition function
function updateDragPosition() {
    if (isDragging && selectedTask) {
        // Get screen to world position
        const worldPosition = new THREE.Vector3(
            dragInterpolation.target.x,
            dragInterpolation.target.y,
            selectedTask.position.z
        );

        // Smooth interpolation
        dragInterpolation.current.lerp(worldPosition, dragInterpolation.dampening);
        
        // Update task position
        selectedTask.position.copy(dragInterpolation.current);
        
        // Update physics body
        const taskId = selectedTask.userData.taskId;
        const body = taskBodies.get(taskId);
        if (body) {
            // Convert Three.js coordinates to Matter.js coordinates
            const matterX = (selectedTask.position.x * 10) + window.innerWidth / 2;
            const matterY = (-selectedTask.position.y * 10) + window.innerHeight / 2;
            
            // Smooth physics body movement
            Matter.Body.setPosition(body, {
                x: matterX,
                y: matterY
            });
            
            // Reset velocity to prevent drift
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(body, 0);
        }
    }
}

// Initialize Three.js when the page loads
window.addEventListener('load', () => {
    initThree();
    animate();
}); 