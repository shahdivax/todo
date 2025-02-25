// Global variables
const taskBodies = new Map();
const completedTasks = new Map();
let audioEnabled = false;
const ambientSound = document.getElementById('ambient-sound');
const completeSound = document.getElementById('complete-sound');
const hoverSound = document.getElementById('hover-sound');
let completedCount = 0;
let currentTaskView = 'all';
let taskCompletionStatus = new Map(); // Track which tasks have been completed

// Audio functions
function toggleAudio() {
    audioEnabled = !audioEnabled;
    if (audioEnabled) {
        ambientSound.play();
    } else {
        ambientSound.pause();
    }
}

function playHoverSound() {
    if (audioEnabled) {
        hoverSound.currentTime = 0;
        hoverSound.play();
    }
}

function playCompleteSound() {
    if (audioEnabled) {
        completeSound.currentTime = 0;
        completeSound.play();
    }
}

// Task management functions
function createTaskObject(taskData) {
    let geometry;
    const priority = taskData.priority || 1;
    
    // Choose geometry based on priority, regardless of completion status
    switch(true) {
        case priority >= 5:
            geometry = new THREE.OctahedronGeometry(1.5, 0);
            break;
        case priority >= 3:
            geometry = new THREE.TetrahedronGeometry(1.5, 0);
            break;
        case priority >= 2:
            geometry = new THREE.IcosahedronGeometry(1, 0);
            break;
        default:
            geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    }

    const material = new THREE.MeshPhongMaterial({
        color: getTaskColor(taskData),
        transparent: true,
        opacity: taskData.completed ? 0.9 : 0.8, // Slightly more solid for completed tasks
        emissive: getTaskEmissiveColor(taskData),
        shininess: taskData.completed ? 100 : 50 // More shine for completed tasks
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add glow effect with adjusted color for completed tasks
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: getTaskColor(taskData),
        transparent: true,
        opacity: taskData.completed ? 0.4 : 0.3, // Stronger glow for completed tasks
        side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(geometry.clone().scale(1.2, 1.2, 1.2), glowMaterial);
    mesh.add(glowMesh);
    
    // Rest of the setup remains the same
    mesh.floatOffset = Math.random() * Math.PI * 2;
    mesh.position.set(
        taskData.position.x,
        taskData.position.y,
        taskData.position.z
    );
    
    mesh.userData.taskId = taskData.id;
    mesh.isTask = true;
    mesh.taskData = taskData;
    
    return mesh;
}

function getTaskColor(taskData) {
    if (taskData.completed) {
        return 0x00ff88; // Completed tasks are always neon green
    }
    
    if (taskData.urgent) {
        return 0xff3366; // Urgent tasks are neon pink
    }
    
    // Regular tasks color based on priority
    const colors = [
        0x00ccff, // Low priority - neon blue
        0xff9900, // Medium priority - neon orange
        0xff00ff, // High priority - neon purple
        0xffff00  // Very high priority - neon yellow
    ];
    return colors[Math.min(taskData.priority - 1, colors.length - 1)] || colors[0];
}

function getTaskEmissiveColor(taskData) {
    const baseColor = getTaskColor(taskData);
    // Create a darker version of the base color for the emissive glow
    const darker = new THREE.Color(baseColor).multiplyScalar(0.3);
    return darker.getHex();
}

async function addTask() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    const urgent = document.getElementById('task-urgent').checked;

    // Add validation for both title and deadline
    if (!title || !deadline) {
        if (!title && !deadline) {
            alert('Please enter a task title and select a deadline');
        } else if (!title) {
            alert('Please enter a task title');
        } else {
            alert('Please select a deadline');
        }
        return;
    }

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                deadline,
                urgent
            })
        });

        const taskData = await response.json();
        
        // Add position data for the new task
        taskData.position = {
            x: (Math.random() - 0.5) * 40,
            y: (Math.random() - 0.5) * 40,
            z: (Math.random() - 0.5) * 40
        };
        
        // Create 3D object
        const taskObject = createTaskObject(taskData);
        scene.add(taskObject);
        taskObjects.set(taskData.id, taskObject);
        
        // Create physics body
        const taskBody = createTaskBody(taskData);
        taskBodies.set(taskData.id, taskBody);

        // Update sidebar
        updateTaskList();
        
        // Clear form and reset date
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-urgent').checked = false;
        setDefaultDate();
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();
        
        tasks.forEach(taskData => {
            // Add position data
            taskData.position = {
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
                z: (Math.random() - 0.5) * 40
            };
            
            const taskObject = createTaskObject(taskData);
            scene.add(taskObject); // Add to scene
            taskObjects.set(taskData.id, taskObject);
            
            const taskBody = createTaskBody(taskData);
            taskBodies.set(taskData.id, taskBody);
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function showTaskDetails(taskData) {
    const detailsPanel = document.getElementById('task-details');
    const titleElement = document.getElementById('detail-title');
    const descriptionElement = document.getElementById('detail-description');
    const deadlineElement = document.getElementById('detail-deadline');

    titleElement.textContent = taskData.title;
    descriptionElement.textContent = taskData.description || 'No description';
    deadlineElement.textContent = taskData.deadline ? `Deadline: ${taskData.deadline}` : 'No deadline';

    detailsPanel.classList.remove('hidden');
    detailsPanel.dataset.taskId = taskData.id;
}

function closeDetails() {
    document.getElementById('task-details').classList.add('hidden');
}

async function completeTask() {
    const detailsPanel = document.getElementById('task-details');
    const taskId = parseInt(detailsPanel.dataset.taskId);
    
    // Check if this task has already been completed
    if (taskCompletionStatus.has(taskId) && taskCompletionStatus.get(taskId)) {
        // Task already completed, just close the details
        closeDetails();
        return;
    }
    
    const taskObject = taskObjects.get(taskId);

    if (taskObject) {
        // Update the task data
        taskObject.taskData.completed = true;
        
        // Mark this task as completed in our tracking map
        taskCompletionStatus.set(taskId, true);
        
        // Update the colors
        taskObject.material.color.setHex(getTaskColor(taskObject.taskData));
        taskObject.material.opacity = 0.9;
        taskObject.material.shininess = 100;
        
        // Update the glow effect
        if (taskObject.children[0]) {
            taskObject.children[0].material.color.setHex(getTaskColor(taskObject.taskData));
            taskObject.children[0].material.opacity = 0.4;
        }

        // Move to completed tasks collection
        completedTasks.set(taskId, taskObject);
        taskObjects.delete(taskId); // Remove from active tasks
        
        // Update completed count
        completedCount++;
        updateCompletedCount();
        
        // Update sidebar
        updateTaskList();
        
        playCompleteSound();
        closeDetails();
    }
}

async function deleteTask(taskId) {
    // If no taskId is provided, get it from the details panel
    if (!taskId) {
        const detailsPanel = document.getElementById('task-details');
        taskId = parseInt(detailsPanel.dataset.taskId);
    }

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Handle completed task deletion
            if (completedTasks.has(taskId)) {
                const completedObject = completedTasks.get(taskId);
                scene.remove(completedObject);
                completedTasks.delete(taskId);
                completedCount--;
                updateCompletedCount();
                updateCompletedShowcase();
            }

            // Handle active task deletion
            if (taskObjects.has(taskId)) {
                const taskObject = taskObjects.get(taskId);
                scene.remove(taskObject);
                taskObjects.delete(taskId);
            }

            // Remove physics body
            if (taskBodies.has(taskId)) {
                const body = taskBodies.get(taskId);
                Matter.World.remove(world, body);
                taskBodies.delete(taskId);
            }

            // Update sidebar
            updateTaskList();

            closeDetails();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

async function clearTasks() {
    try {
        const response = await fetch('/api/clear', {
            method: 'POST'
        });

        if (response.ok) {
            // Remove all tasks from scene and maps
            taskObjects.forEach((object, taskId) => {
                scene.remove(object);
                const body = taskBodies.get(taskId);
                if (body) {
                    Matter.World.remove(world, body);
                }
            });
            
            // Clear all maps
            taskObjects.clear();
            taskBodies.clear();
            completedTasks.clear();
            
            // Reset completed count
            completedCount = 0;
            updateCompletedCount();

            // Clear task completion status tracking
            taskCompletionStatus.clear();

            // Update sidebar
            updateTaskList();
        }
    } catch (error) {
        console.error('Error clearing tasks:', error);
    }
}

// Speech recognition setup
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    let isRecognizing = false;

    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        document.getElementById('task-title').value = text;
        isRecognizing = false;
    };

    recognition.onend = function() {
        isRecognizing = false;
    };

    const voiceButton = document.createElement('button');
    voiceButton.textContent = '🎤 Voice Input';
    voiceButton.className = 'neon-button';
    voiceButton.onclick = () => {
        if (!isRecognizing) {
            isRecognizing = true;
            recognition.start();
        }
    };
    document.getElementById('task-form').appendChild(voiceButton);
}

// Load tasks when the page loads
window.addEventListener('load', loadTasks);

function animateTaskCompletion(taskId, keepTask = false) {
    const object = taskObjects.get(taskId);
    const body = taskBodies.get(taskId);
    
    if (object) {
        if (keepTask) {
            // Transform animation for completion
            const animate = () => {
                object.scale.multiplyScalar(0.95);
                object.material.opacity *= 0.95;
                
                if (object.scale.x > 0.1) {
                    requestAnimationFrame(animate);
                } else {
                    scene.remove(object);
                    taskObjects.delete(taskId);
                    if (body) {
                        Matter.World.remove(world, body);
                        taskBodies.delete(taskId);
                    }
                    
                    // Add the completed task object to the scene
                    const completedObject = completedTasks.get(taskId);
                    if (completedObject) {
                        completedObject.scale.set(0.1, 0.1, 0.1);
                        scene.add(completedObject);
                        
                        // Animate the completed task appearing
                        const animateCompleted = () => {
                            completedObject.scale.multiplyScalar(1.1);
                            if (completedObject.scale.x < 1) {
                                requestAnimationFrame(animateCompleted);
                            }
                        };
                        animateCompleted();
                    }
                }
            };
            animate();
        }
    }
}

function animateTaskDeletion(taskId, isCompleted = false) {
    const taskMap = isCompleted ? completedTasks : taskObjects;
    const object = taskMap.get(taskId);
    const body = taskBodies.get(taskId);
    
    if (object) {
        // Animate the object scaling down and fading out
        const animate = () => {
            object.scale.multiplyScalar(0.9);
            object.material.opacity *= 0.9;
            
            if (object.scale.x > 0.1) {
                requestAnimationFrame(animate);
            } else {
                scene.remove(object);
                taskMap.delete(taskId);
                if (body) {
                    Matter.World.remove(world, body);
                    taskBodies.delete(taskId);
                }
            }
        };
        animate();
    }
}

// Add new functions for completed tasks management
function updateCompletedCount() {
    const countElement = document.querySelector('#completed-count span');
    countElement.textContent = completedCount;
}

function toggleCompletedView() {
    const showcase = document.getElementById('completed-showcase');
    if (showcase.classList.contains('hidden')) {
        updateCompletedShowcase();
        showcase.classList.remove('hidden');
    } else {
        showcase.classList.add('hidden');
    }
}

function updateCompletedShowcase() {
    const completedList = document.getElementById('completed-list');
    completedList.innerHTML = '';
    
    completedTasks.forEach((object, taskId) => {
        const taskData = object.taskData;
        const item = document.createElement('div');
        item.className = 'completed-item';
        
        item.innerHTML = `
            <div class="task-info">
                <h4>${taskData.title}</h4>
                <p>${taskData.description || 'No description'}</p>
                <p>Completed: ${new Date().toLocaleDateString()}</p>
            </div>
            <button onclick="deleteCompletedTask(${taskId})" class="neon-button danger">Delete</button>
        `;
        
        completedList.appendChild(item);
    });
}

// Add new function for deleting completed tasks
function deleteCompletedTask(taskId) {
    deleteTask(parseInt(taskId));
}

// Initialize completed count on load
window.addEventListener('load', () => {
    updateCompletedCount();
});

// Move the sidebar toggle function to the top level and update it
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarToggle.innerHTML = '☰';
        sidebarToggle.style.left = '20px';
    } else {
        sidebar.classList.add('open');
        sidebarToggle.innerHTML = '×';
        sidebarToggle.style.left = `${300 + 20}px`;
    }
}

// Add event listener for sidebar toggle
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    sidebarToggle.addEventListener('click', toggleSidebar);
});

// Update task list in sidebar
function updateTaskList() {
    const container = document.getElementById('task-list-container');
    container.innerHTML = '';
    
    let tasks = [];
    
    // Collect all tasks
    taskObjects.forEach((object, taskId) => {
        tasks.push({
            id: taskId,
            data: object.taskData,
            completed: false
        });
    });
    
    completedTasks.forEach((object, taskId) => {
        tasks.push({
            id: taskId,
            data: object.taskData,
            completed: true
        });
    });

    switch (currentTaskView) {
        case 'date':
            // Sort by date (closest deadline first)
            tasks.sort((a, b) => {
                // Put tasks without deadlines at the end
                if (!a.data.deadline) return 1;
                if (!b.data.deadline) return -1;
                return new Date(a.data.deadline) - new Date(b.data.deadline);
            });
            
            // Group by date
            const dateGroups = {};
            tasks.forEach(task => {
                const date = task.data.deadline ? 
                    new Date(task.data.deadline).toLocaleDateString() : 
                    'No Deadline';
                if (!dateGroups[date]) {
                    dateGroups[date] = [];
                }
                dateGroups[date].push(task);
            });
            
            // Create sections for each date
            for (const [date, dateTasks] of Object.entries(dateGroups)) {
                const heading = document.createElement('h3');
                heading.textContent = date;
                container.appendChild(heading);
                
                dateTasks.forEach(task => {
                    const item = createTaskListItem(task.id, task.data, task.completed);
                    container.appendChild(item);
                });
            }
            break;

        case 'priority':
            // Group by priority
            const priorityGroups = {
                'Urgent': [],
                'High': [],
                'Medium': [],
                'Low': [],
                'Completed': []
            };
            
            tasks.forEach(task => {
                if (task.completed) {
                    priorityGroups['Completed'].push(task);
                } else if (task.data.urgent) {
                    priorityGroups['Urgent'].push(task);
                } else if (task.data.priority >= 4) {
                    priorityGroups['High'].push(task);
                } else if (task.data.priority >= 2) {
                    priorityGroups['Medium'].push(task);
                } else {
                    priorityGroups['Low'].push(task);
                }
            });
            
            for (const [priority, priorityTasks] of Object.entries(priorityGroups)) {
                if (priorityTasks.length > 0) {
                    const heading = document.createElement('h3');
                    heading.textContent = priority;
                    container.appendChild(heading);
                    
                    priorityTasks.forEach(task => {
                        const item = createTaskListItem(task.id, task.data, task.completed);
                        container.appendChild(item);
                    });
                }
            }
            break;

        default: // 'all'
            // Sort by completion status and then by priority
            tasks.sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return (b.data.priority || 1) - (a.data.priority || 1);
            });
            
            tasks.forEach(task => {
                const item = createTaskListItem(task.id, task.data, task.completed);
                container.appendChild(item);
            });
            break;
    }
}

// Create a task list item
function createTaskListItem(taskId, taskData, isCompleted) {
    const item = document.createElement('div');
    item.className = 'task-list-item';
    item.dataset.taskId = taskId;
    
    // Determine priority class
    let priorityClass = isCompleted ? 'completed' : 
                        taskData.urgent ? 'urgent' : 
                        `priority-${taskData.priority || 1}`;
    
    item.innerHTML = `
        <div class="priority-indicator ${priorityClass}"></div>
        <h4>${taskData.title}</h4>
        <p>${taskData.description || 'No description'}</p>
        ${taskData.deadline ? `<p>Deadline: ${taskData.deadline}</p>` : ''}
    `;
    
    // Add click event to show task details
    item.addEventListener('click', () => {
        showTaskDetails(taskData);
    });
    
    return item;
}

// Toggle between task views
function toggleTaskView(view) {
    currentTaskView = view;
    
    // Update active button
    const buttons = document.querySelectorAll('.view-toggle button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    const activeButton = Array.from(buttons).find(button => 
        button.textContent.toLowerCase().includes(view)
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    updateTaskList();
}

// Set today's date as default for task deadline
function setDefaultDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    document.getElementById('task-deadline').value = formattedDate;
}

// Update the window load event listener to include setDefaultDate
window.addEventListener('load', () => {
    // Existing load event handlers
    initMatter();
    loadTasks().then(() => {
        updateTaskList();
    });
    updateCompletedCount();
    
    // Add the new function call
    setDefaultDate();
}); 