// Matter.js setup
let engine, world;

function initMatter() {
    engine = Matter.Engine.create();
    world = engine.world;
    world.gravity.y = 0; // Zero gravity for space environment

    // Create boundaries to keep tasks within view
    const boundaryOptions = {
        isStatic: true,
        render: { visible: false }
    };

    Matter.World.add(world, [
        // Top boundary
        Matter.Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, boundaryOptions),
        // Bottom boundary
        Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, boundaryOptions),
        // Left boundary
        Matter.Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, boundaryOptions),
        // Right boundary
        Matter.Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, boundaryOptions)
    ]);

    // Start the engine
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
}

function createTaskBody(taskData) {
    // Adjust the spread factor to a more moderate value
    const spreadFactor = 30; // Reduced from 100 to 50
    const randomAngle = Math.random() * Math.PI * 2;
    const randomRadius = Math.random() * spreadFactor + spreadFactor;
    
    const x = Math.cos(randomAngle) * randomRadius + window.innerWidth / 2;
    const y = Math.sin(randomAngle) * randomRadius + window.innerHeight / 2;

    const body = Matter.Bodies.circle(
        x,
        y,
        20,
        {
            friction: 0.05,        // Reduced friction
            frictionAir: 0.005,    // Reduced air friction
            restitution: 0.2,      // Reduced bounciness
            density: 0.001,        // Keep low density
            render: { visible: false },
            inertia: Infinity      // Prevent rotation during drag
        }
    );

    // Reduce initial velocity even further
    Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5
    });

    Matter.World.add(world, body);
    return body;
}

function updateTaskPositions() {
    taskObjects.forEach((object, taskId) => {
        const body = taskBodies.get(taskId);
        if (body) {
            // Convert Matter.js coordinates to Three.js coordinates
            object.position.x = (body.position.x - window.innerWidth / 2) * 0.1;
            object.position.y = (body.position.y - window.innerHeight / 2) * 0.1;
        }
    });
}

// Initialize Matter.js when the page loads
window.addEventListener('load', () => {
    initMatter();
    
    // Add physics update to animation loop
    function updatePhysics() {
        updateTaskPositions();
        requestAnimationFrame(updatePhysics);
    }
    updatePhysics();
}); 