let onPlane = true;

// Wait for scene to load: https://stackoverflow.com/questions/41727501/how-to-detect-when-a-scene-is-loaded-in-a-frame
document.addEventListener('DOMContentLoaded', function () {
let scene = document.querySelector('a-scene'); // Gets the A-Frame scene element
if (scene) {
    // Ensure loaded (I think)
    scene.addEventListener('loaded', function () {
    // Prep inputs
    setupObjects();
    setupMoveForwardButton();
    });
}
});

// Prep objects and controls
function setupObjects() {
    // Store current scene
    let scene = document.querySelector('a-scene');

    // Listen for "E" key presses
    document.addEventListener('keydown', function (event) {
        // If key pressed and player is on platform
        if (event.key === 'E' && onPlane || event.key === 'e' && onPlane) {
            // Allow for picking up and dropping of objects
            interact(scene);
        }
    });

    // Listen for "Q" key presses
    document.addEventListener('keydown', function (event) {
        // If key pressed and player is on platform
        if (event.key === 'Q' && onPlane || event.key === 'q' && onPlane) {
            // If object is not being held, create an object
            if (!scene.isCarrying) createObject(scene);
            // If object is held, delete it
            else destroyObject(scene);
        }
    });

    // Listen for button clicks
    let interactButton = document.getElementById('interact');
    // If the interact button is clicked
    interactButton.addEventListener('click', function() {
        // Pickup / drop off objects
        if (onPlane) interact(scene);
    });
    // If edit button is clicked (create and destroy)
    let editButton = document.getElementById('edit');
    editButton.addEventListener('click', function() {
        // If object is not being held, create an object
        if (!scene.isCarrying && onPlane) createObject(scene);
        // If object is held, delete it
        else destroyObject(scene);
    });
}

// Pickup and dropoff objects
function interact(scene) {
    // If object not already being held
    if (!scene.isCarrying) {
        // Find the nearest "pickupable" object and pick up
        const nearestObject = findNearestObject(scene);
        // If there is an object near
        if (nearestObject) {
            // pick up the object
            pickUpObject(nearestObject, scene.camera.el, scene);
            // Set carrying to true
            scene.isCarrying = true;
        }
    } 
    // If object already being held
    else {
        // Drop the object
        dropObject(scene);
        // Set carrying to false
        scene.isCarrying = false;
    }
}

// Find nearest object
function findNearestObject(scene) {
    // Default object doesn't exist
    let nearestObject = null;
    // Default out of range distance between hypothetical objects
    let shortestDistance = 4;
    // Store camera position as a 3D vector
    let cameraPosition = new THREE.Vector3();

    // Grab camera's position relative to world: https://stackoverflow.com/questions/34447119/positioning-a-three-js-object-in-front-of-the-camera-but-not-tied-to-the-camera
    scene.camera.el.object3D.getWorldPosition(cameraPosition);

    // Iterate through all objects that can be picked up
    scene.querySelectorAll('[pickupable]').forEach((object) => {
        // Store object position
        let objPosition = new THREE.Vector3();
        // Grab world position of object
        object.object3D.getWorldPosition(objPosition);
        // Calculate distance between object and camera
        let distance = objPosition.distanceTo(cameraPosition);

        // If object is in range and closer than previous "closest" object
        if (distance < 2 && distance < shortestDistance) {
            // Update closest distance
            shortestDistance = distance;
            // Update new nearest object
            nearestObject = object;
        }
    });
    // Return the objects
    return nearestObject;
}

// Pick up object in range
function pickUpObject(object, camera, scene) {
    // Initialise camera as 3D object for parenting: https://threejs.org/docs/#api/en/core/Object3D.add
    camera.object3D.add(object.object3D);
    // Set parented object (closest / picked up object) to 2 units away from player's cam
    object.setAttribute('position', {x: 0, y: 0, z: -2});
    // Make object transparent so player can see
    object.setAttribute('material', 'opacity', 0.35); 
    // Store current object (for deletion and dropping)
    scene.carriedObject = object;
    scene.isCarrying = true;

    // Play audio: https://freesound.org/people/greenvwbeetle/sounds/244657/
    let audio = new Audio('pickup.mp3')
    audio.play();

    // Update tutorial to be relevant
    document.getElementById("instructions").textContent = "Press 'E' to DROP a cube! Press 'Q' to DELETE a held cube!";
    console.log('Picked up');
}

// Drop currently held object
function dropObject(scene) {
    // Store camera position as 3D Vector
    let cameraPosition = new THREE.Vector3();
    scene.camera.el.object3D.getWorldPosition(cameraPosition);

    // Locally store the "carried" child
    const carriedObject = scene.camera.el.object3D.children.find(child => child.el && child.el.hasAttribute('pickupable'));

    // If there is an object being carried
    if (carriedObject) {
        // Add object back to scene
        scene.object3D.add(carriedObject);
        // Place here player's camera is
        carriedObject.el.setAttribute('position', {x: cameraPosition.x, y: 0.5, z: cameraPosition.z});
        // Make fully opqaque once more
        carriedObject.el.setAttribute('material', 'opacity', 1.0); 

        // Play audio: https://freesound.org/people/SunnySideSound/sounds/67090/
        let audio = new Audio('dropoff.mp3')
        audio.play();

        // Update tutorial for relevant information
        document.getElementById("instructions").textContent = "Press 'E' to PICKUP a cube! Press 'Q' to CREATE a cube!";
        console.log('Dropped');

        // Set carried object to null
        scene.carriedObject = null;
        scene.isCarrying = false;
    }
}

// Spawn an object in space
function createObject(scene) {
    // Store camera
    let camera = scene.querySelector('[camera]');
    // Generate a random colour: https://css-tricks.com/snippets/javascript/random-hex-color/
    let colour = '#' + Math.floor(Math.random()*16777215).toString(16);

    // Create a cube
    let cube = document.createElement('a-box');
    // Move cube to camera
    cube.setAttribute('position', {x: camera.getAttribute('position').x, y: 0.5, z: camera.getAttribute('position').z});
    // Colour the cube
    cube.setAttribute('color', colour);
    // Allow the cube to be picked up
    cube.setAttribute('pickupable');
    console.log(cube.getAttribute('position'));

    // Add cube to scene
    scene.appendChild(cube);

    // Play audio: https://freesound.org/people/greenvwbeetle/sounds/244657/
    let audio = new Audio('pickup.mp3')
    audio.play();
}

// Destroy and object
function destroyObject(scene) {
    // Check if object is being carried
    if (scene.isCarrying) {
        // "Deparent" child
        scene.carriedObject.parentNode.removeChild(scene.carriedObject);

        // Nothing is being carried anymore
        scene.isCarrying = false;
        scene.carriedObject = null;

        // Update tutorial
        document.getElementById("instructions").textContent = "Press 'E' to PICKUP a cube! Press 'Q' to CREATE a cube!";

        // Play audio: https://freesound.org/people/rendensh/sounds/105413/
        let audio = new Audio('destroy.mp3')
        audio.play();
    }
}

// Check when object is off-screen
AFRAME.registerComponent('boundary-check', {
    // Update constantly
    tick: function () {
        // Store camera
        let camera = this.el.sceneEl.camera.el;
        // Store camera position
        let position = camera.getAttribute('position');
        // Store warning
        /*

            I forget why I chose to use a-frame text instead of a text element from CSS but
            I made this at midnight and was not thinking

        */
        let message = document.getElementById('boundaryMessage');

        // Store sky
        let sky = document.getElementById('sky');
        // Store ground (plane)
        let ground = document.getElementById('ground');
    
        // Plane boundaries (12x12)
        let boundary = {x: 6, z: 6};
  
        // Check if outside boundaries (ABS works for both positive and negative)
        if (Math.abs(position.x) > boundary.x || Math.abs(position.z) > boundary.z) {
            // Reveal message, red sky, white ground
            message.setAttribute('visible', true);
            sky.setAttribute('color', '#8B0000');
            ground.setAttribute('color', '#FFFFFF');
            // Drop currently held object
            dropObject(document.querySelector('a-scene'));

            // Play sound effect exactly once (RIP my ears during testing!!)
            if (onPlane === true) {
                // Play audio: https://freesound.org/people/Serithi/sounds/150326/
                let audio = new Audio('warning.mp3')
                audio.play();
            }

            // No longer on plane
            onPlane = false;
        } else {
            // Revert
            message.setAttribute('visible', false);
            sky.setAttribute('color', '#DDDDFF');
            ground.setAttribute('color', '#090980');
            onPlane = true;
        }
    }
});

// Initialise move forward button
function setupMoveForwardButton() {
    // Add listener
    document.getElementById('moveForward').addEventListener('click', function() {
        // Store camera reference
        let camera = document.querySelector('[camera]');
        // Move forward facing camera
        moveCameraForward(camera);
    });
}

// Move the camera forward
function moveCameraForward(cameraEl) {
    // Store direction camera is facing
    let direction = new THREE.Vector3();
    cameraEl.object3D.getWorldDirection(direction);
    // I don't know why but the direction was inverted by default
    direction.multiplyScalar(-1);
    
    // Travel distance
    let distance = 1.5; 
    let newPosition = cameraEl.getAttribute('position');
    
    // Move along X and Z axes (not Y, because then players can fly into space or directly to hell)
    newPosition.x += direction.x * distance;
    newPosition.z += direction.z * distance;
    
    // Update position of camera
    cameraEl.setAttribute('position', newPosition);
}
  