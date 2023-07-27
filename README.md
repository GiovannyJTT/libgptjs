# libgptjs
Graphical Programming with ThreeJS

* Main classes for graphics pipeline
* WebGL project using ThreeJS, HTML5 and OOJS (object oriented javasctipt) for exploring several computer-graphics techniques:
    * Geometry and Normals calculation for complex models
    * UV coordinates calculation
    * Surface Smoothing by using Vertices Normals
    * Lighting and Shadows
    * Skybox and reflections
    * User Interface (sliders, toggles, buttons)
    * Finite State Machine to handle "shooting robot"
    * Collision detection using AABB
    * Particles System with Nebula-Threejs

## LIBGPT - Core

* [three-global.js](./external-libs/three-global.js)
    * It is used to create a global object `THREE` and add functionalities to it
        1. Imports `three.js` library as module from npm
        2. Names it `THREE` (following the nomenclature used in other modules)
        3. Exports the object `THREE` from this script / module to be imported into the rest (ex: in OrbitControls.js)
        4. In [OrbitControls.js](./external-libs/OrbitControls.js), or other scripts, new functionality is added to `THREE` object
* Graphical Programming with Threejs [libgptjs](./)
    * The classes at `libgptjs/` are importing `three-global.js`
    * Wrapper / Library to facilitate re-use of code and organize the graphics pipeline
    * It contains several objects (classes) for wrapping all the logic required for creating an scene with threejs
        * This allows modularity and we can reuse code creating instances of those clases
* [GPT_Coords](./core/GPT_Coords.js)
    * Gets vertices (Float32Array) and edges array (Uint32Array)
    * Calculates the normal vector for each triangle
    * Provides a method for calculating the UV coordinates for each triangle
* [GPT_Model](./core/GPT_Model.js)
    * Simple class to integrate mesh + geometry + material
    * Provides method for cleaning gl buffers that were reserved
* [GPT_LinkedModel](./core/GPT_LinkedModel.js)
    * Model formed of joining several `THREE.Object3D` in order to create articulated models like robot arms
    * Provides method for adding a new link between two Object3D and finally linking all of them in sequence
* [GPT_ModelCollider](./core/GPT_ModelCollider.js)
    * Attaches an AABB (axis aligned bounding box) to an existign Mesh
    * Provides a method for detecting collision with another AABB
* [GPT_Scene](./core/GPT_Scene.js)
    * List of `GPT_Model`s and `GPT_Light`
    * Provides abstract methods for initial configuration and updates in every frame
        * These methods have to be overriden when creating the instance of the `GPT_Scene`
    * Provides methods for adding and removing models at runtime
* [GPT_Render](./core/GPT_Renderer.js)
    * It initializes the camera and camera-handler
    * This is the main object that creates a `webgl-renderer` and invokes methods of `GPT_Scene`
* [GPT_App](./core/GPT_App.js)
    * Top-level object that configures the `window` and uses `GPT_Render`
    * It contains the main loop for animation in which the `update` and `render` are being invoked

## SceneDragon scripts

* [Common.js](./scene-dragon/Common.js)
    * Contains all constants to be re-used in several points in the code
* [CoordsDragon.js](./scene-dragon/CoordsDragon.js)
    * Stores arrays of dragon model (vertices and edges)
    * Since it inherits from `GPT_Coords` it provides methods for computing normals and UVs coordinates
* [CoordsGripper.js](./scene-dragon/CoordsGripper.js)
    * Stores arrays of gripper model (vertices and edges)
    * Since it inherits from `GPT_Coords` it provides methods for computing normals and UVs coordinates
* [ModelSkybox.js](./scene-dragon/ModelSkybox.js)
    * Creates a big cube and maps the texture to simulate environment
    * These skybox images will be reflected on the Dragon surface and Gripper surface
* [ModelDragon.js](./scene-dragon/ModelDragon.js)
    * Inherits from `GPT_Model` and overrides `get_geometry` and `get_material` methods
    * Creates and initializes `geometry` and `material` objects to be inserted into a `mesh`
    * Computes `UV` coordinates per face (triangle) in order to simulate reflections of the skybox onto the dragon surface
    * Contains a `GPT_ModelCollider`
* [ModelGripper.js](./scene-dragon/ModelGripper.js)
    * Idem to ModelDragon
* [ModelRobot.js](./scene-dragon/ModelRobot.js)
    * Inherits from `GPT_LinkedModel`
    * Creates separately the parts of the robot (base, arm, forearm, hand and gripper). Then links them all in sequence
* [ModelTrajectory.js](./scene-dragon/ModelTrajectory.js)
    * Given 2 initial points to be used as direction vector
        * It computes the control points (`p1, p2, p3, peak and end`) to be used later into the spline points calculation
        * Control points form a triangle with one of the edges following the `p1` and `p2` direction
            * `Peak` point is in the middle of triangle and is the highest point
            * `End` point is on the floor
        * Spline points are calculated using the control points and `catmullrom` with N (30) segments
        * Final spline points are used to create line geometry to be rendered
* [ModelBullet.js](./scene-dragon/ModelBullet.js)
    * Creates the geometry, material, mesh, and GPT_ModelCollider
    * Needs a trajectory and a starting point3D
    * Provides a method for moving the bullet between 2 consecutive points3D of the trajectory based on time passed since last frame
* [InputManager.js](./scene-dragon/InputManager.js)
    * Checks if it is running on mobile device or desktop
    * Creates the UI (sliders, toggles, etc.) and installs the `onChange` callbacks to be executed when a value is updated by the user
    * Creates html button for "shoot" and attaches the corresponding callback
* [FSM_Robot.js](./scene-dragon/FSM_Robot.js)
    * Defines a finite state machine for robot shooter
    * Defines `States`, `Events` and `Transitions`
    * Defines Transitions as a dictionary of allowed state-event pairs
    * Provides methods for `transiting` from one state to other depending on the "Event"
    * Provides method for `updating` the current state based on timers expiration
* [SceneDragon.js](./scene-dragon/SceneDragon.js)
    * Contains the handling of main interactions: InputManager, animation (update) of objects, etc.
    * Inherits from `GPT_Scene` and overrides `createObjects`, `createLights`, `updateObjects` and `updateLights` methods
    * Performs all setting up of models and lights: floor, dragon, skybox, robot, trajectory, etc.
    * Performs periodic updates of models and lights: translate, rotate, destroy and create new trajectory, etc.
    * Contains a method where actions are triggered depending on the change of state of `FSM_Robot`
        * Any change of state is reflected into the UI
        * `Idle`
            * Rotate Dragon, update AABB
        * `loading_bullet`
            * Rotate shooting arm
            * Increase power while user keeps clicking and update UI slider
            * When power increased set shooting arm to red color
        * `bullet_traveling`
            * Draw the trajectory
            * Move the bullet along the trajectory
            * Rotate while traveling
        * `hit`
            * Blink dragon to red
            * Stop bullet at collision point
    * Limits the reaction to the incoming "shoot events" by checking if current robot state is `idle`

## Computer Graphics Techniques

### Geometry and Normals calculation for complex models

* A triangle is the basic polygone
    * It is formed of 3 vertices, each vertex has 3 components float (x, y, z)
    * Its vertices are defined clockwise by default. This is taken into account when computing the face (triangle) normal vector
* A `geometry` in threejs is formed of several arrays
    * `position`
        * It is a `Float32Array` in which all the coordinates of all vertices of all triangles are packed together
        * Array lenght is `3 * num vertices`
        * Example forming the first __2 triangles__
            ```javascript
            CoordsGripper.prototype.getArrayVertices = function () {
                return new Float32Array([
                    0, 0, 0,
                    0, 20, 0,
                    19, 20, 0,
                    19, 0, 0,
                    0, 20, 4,
                    0, 0, 4,
            ```
        * `itemSize` 3 because there are 3 components per vertex
            ```javascript
            ModelDragon.prototype.get_geometry = function () {
                const _geom = new THREE.BufferGeometry();

                _geom.setAttribute(
                    "position",
                    new THREE.BufferAttribute(this.coords.vertices_coordinates, 3)
                );
            ```
    * `normal`
        * It is a `Float32Array` containing all the normal vectors for all triangles
        * Array lenght is `3 * num triangles`
        * It is computed at [GPT_Coords](./core/GPT_Coords.js) `calculateNormals`
        * Idem to `positions`
    * `indices`
        * It is a `UInt32Array` containing all the sequence of  indices (of `positions` array) to form triangles
        * Example forming the first __2 triangles__
            ```javascript
            CoordsGripper.prototype.getArrayEdges = function () {
                return new Uint32Array([
                    2, 0, 1,
                    3, 0, 2,
            ```
        * `itemSize` 1 because there are 1 component per vertex-index
            ```javascript
            _geom.setIndex(new THREE.BufferAttribute(this.coords.edges_indices, 1));
            ```
    * `uv`
        * It is a `Float32Array` containing the UV coordinates for all vertices of all triangles
        * Each vertex will have 2 UV components (texture coordinates)
        * UV coordinate values are in range [0.0, 1.0]
        * Array lenght is `6 * num triangles`
        * It is computed at [GPT_Coords.js](./core/GPT_Coords.js) `getUVs`
        * `itemSize` 2 because each vertex has 2 UV componets
            ```javascript
            _geom.setAttribute(
                "uv",
                new THREE.BufferAttribute(uvs, 2)
            );
            ```
* A `Mesh Phong Material` in threejs is needed to define the rendering of the geometry
    ```javascript
    ModelDragon.prototype.get_material = function () {
        // loading TextureCube as skybox
        const _mat = new THREE.MeshPhongMaterial(
            {
                color: 0xe5ffe5,
                emissive: 0xb4ef3e,
                flatShading: true, // initially per-triangle normals
                specular: 0x003300,
                shininess: 70,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 0.75,
                envMap: Common.SKYBOX_CUBE_TEXTURE
            }
        );
    ```
* A mesh in threejs is formed of a geometry and a material
    ```javascript
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    ```

### UV coordinates calculation

[GPT_Coords.js](./core/GPT_Coords.js) `getUVs`

1. Calculates UV for planar surface (x, y, z) where z = 0
2. Depends on geometry bounding box
3. Computes the UV values for each face (triangle)
4. Stores UV coordinates for each triangle (6 float components)

### Surface Smoothing by using Vertices Normals

1. First you need to have per-face (triangle) normals
    * [GPT_Coords.js](./core/GPT_Coords.js) `calculateNormals`
        * Creates `points3D` array by grouping 3 values from `positions` array
        * Creates triagles array by grouping 3 values from `points3D` array
        * Computes normals for each triangle clockwise
            1. v1 = p2 - p1
            2. v2 = p3 - p2
            3. cross_product(v1, v2)
            4. Applies modulus
            5. Stores normal (3 float components)
2. Then you can invoke `computeVertexNormals` in order to make the transition between faces (triangles) smoother when computing the lighting
    ```javascript
    SceneDragon.prototype.createDragon = function () {
        // pre-calculated for surface smoothing
        this.dragon_model.geometry.computeVertexNormals();
    ```
3. You must update the material to be `smooth shading` ( `flatShading` = false)
    ```javascript
    _cbs.on_change_dragon_smoothing = (new_val_) => {
        const _dragon = this.gpt_models.get("dragon");

        // boolean
        if (new_val_) {
            _dragon.material.flatShading = false;
        }
        else {
            _dragon.material.flatShading = true;
        }
        _dragon.material.needsUpdate = true;
    };
    ```

### Lighting and Shadows

[SceneDragon.js](./scene-dragon/SceneDragon.js) `createLights`

1. Creates an `ambient light` that will be added when shading the models surface
    * 5% white
    * It doesn't need a position into the Scene
2. Creates a `point light`
    * 75% white
    * Emits in all directions
3. Creates a `directional light`
    * 75% white
    * Emits only in the direction vector provided (-200, 200, 0)
4. Creates a `focal light`
    * 75% white
    * Emits light in a cone volume
    * Direction of the central lighting vector is pointing to the center of the floor (0,0,0)
    * Defines `angle` and `distance` to make a `fading lighting` from the center of the cone to the exterior
    * Defines the cone like shape by defining parameters of shador: `near`, `far` and `fov`

### Skybox and reflections

1. [ModelSkyBox.js](./scene-dragon/ModelSkybox.js)
    * Creates a `BoxGeometry`
    * Attaches a texture (material) per face
        * The texture images must be specifically for a cube texture
        * They need to be mapped properly ordered
            * `posx, negx, posy, negy, posz, negz`
    * Makes the inner of the box visible instead of the outside
        ```javascript
        ModelSkybox.prototype.get_material = function () {
            ...
                _cubeFacesMaterials.push(
                new THREE.MeshBasicMaterial({
                    map: _loader.load(_img_path),
                    color: 0xffffff, // white
                    side: THREE.BackSide // inside the cube
                })
            ...
        ```
2. Reflections on [ModelDragon.js](./scene-dragon/ModelDragon.js)
    * Sets `transparent`, `opacity`, and `shinines` to simulate "glass"
    * Sets the `Skybox Textures Array` as `envMap`
    ```javascript
    ModelDragon.prototype.get_material = function () {
        const _mat = new THREE.MeshPhongMaterial(
            {
                color: 0xe5ffe5,
                emissive: 0xb4ef3e,
                flatShading: true, // initially per-triangle normals
                specular: 0x003300,
                shininess: 70,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 0.75,
                envMap: Common.SKYBOX_CUBE_TEXTURE
            }
        );
    ```
3. Idem for hand of the robot [ModelGripper.js](./scene-dragon/ModelGripper.js)

### User Interface (sliders, toggles, buttons)

[InputManager.js](./scene-dragon/InputManager.js)

1. It creates a `dat.gui` object
    *  dat.gui assumes the GUI type based on the target's initial value type:
        * boolean: `checkbox`
        * int / float: `slider`
        * string: `text input`
        * function: `button`
    * When user updates a value with the UI we store the new value in `effect` variables
2. It attaches the corresponding `onChange` callbacks to be executed when a new value is set using the UI
3. Saves references to UI controllers, so we can reflect updates on the UI
    * Reflects text of `robot_state`
    * Reflects value of `robot_power`
4. Creates a custom html button for `shoot`, which is separated from the rest of the panel for better usability
5. Creates a `stats` widget at the bottom of the canvas container. This reflects the frames per second

### Finite State Machine to handle "shooting robot"

[FSM_Robot.js](./scene-dragon/FSM_Robot.js)

1. Defines `States`, `Events` and allowed `Transitions`
2. A transition is defined as `destination state` given a pair `State-Event`
3. Updates the current state based on the expiration of timers
    * `IDLE` --> shoot --> `LOADING_BULLET`
    * `LOADING_BULLET` --> timer.expired --> `BULLET_TRAVELING`
    * `BULLET_TRAVELING` --> collision -->  `HIT`
    * `BULLET_TRAVELING` --> timer.expired --> `NO_HIT`
    * `HIT` / `NO_HIT` --> timer.expired --> `IDLE`

### Collision detection using AABB

[GPT_ModelCollider.js](./core/GPT_ModelCollider.js)

* Main concept can be read at [link](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection)
1. Attaches an AABB (axis aligned bounding box)
2. Updates the dimensions of the AABB at runtime
3. Checks if intersects with other AABB (collided)

### Particle System with Nebula-Threejs

* Follow tutorial at [three-nebula.org](https://three-nebula.org/)
* Nebula is a particle system engine that works with threejs
* It provides an editor to create manually and save to json file

#### Integration with libgptjs

[DragonFireParticles.json](./scene-dragon/DragonFireParticles.json)

1. Adapted manually for our SceneDragon scale:
    ```json
        {
            "type": "Radius",
            "properties": {
                "width": 20,
                "height": 80,
                "isEnabled": true
        },
        {
            "type": "RadialVelocity",
            "properties": {
                "radius": 400,
                "x": 0,
                "y": 0,
                "z": 1,
                "theta": 10,
                "isEnabled": true
        }
    ```
2. The rest of values (color, sprite, life cycle, etc.) were edited using the Nebula editor (windows)

[DragonFire.js](./scene-dragon/DragonFire.js)

1. Loads the particle system from json file and creates an instance of `nebula` that will be used to render
    * `Nebula.SpriteRenderer` needs the main `THREE.Scene`
2. Provides a method for updating the `dragon fire particles` according to dragon mouth position
    * `DragonFire.update_to_dragon_mouth` performs a sequence of translations and rotations to place / update properly the particles emitter while dragon is rotating