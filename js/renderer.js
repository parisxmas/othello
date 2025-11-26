// 3D Renderer with Three.js and WebXR
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.board = null;
        this.discs = new Map();
        this.validMoveIndicators = [];
        this.hoveredCell = null;
        this.selectedCell = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.xrSession = null;
        this.vrController1 = null;
        this.vrController2 = null;
        this.controllerGrip1 = null;
        this.controllerGrip2 = null;
        
        // Animation state
        this.animatingDiscs = [];
        this.pendingAnimations = [];
        
        // Callbacks
        this.onCellClick = null;
        this.onCellHover = null;
        
        // Materials
        this.materials = {};
        
        // Constants
        this.BOARD_SIZE = 4;
        this.CELL_SIZE = 0.45;
        this.DISC_RADIUS = 0.18;
        this.DISC_HEIGHT = 0.06;
        
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Create beautiful gradient background
        const bgColor = new THREE.Color(0x050510);
        this.scene.background = bgColor;
        this.scene.fog = new THREE.Fog(bgColor, 12, 30);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 3.5, 6);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // XR Support
        this.renderer.xr.enabled = true;
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 12;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        this.controls.minPolarAngle = Math.PI / 8;
        this.controls.target.set(0, 0, 0);
        
        // Initialize materials
        this.createMaterials();
        
        // Create scene elements
        this.createLights();
        this.createBoard();
        this.createEnvironment();
        
        // Event listeners
        this.setupEventListeners();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    createMaterials() {
        // Board material - rich green felt texture
        this.materials.board = new THREE.MeshStandardMaterial({
            color: 0x0d5c2f,
            roughness: 0.9,
            metalness: 0.1,
        });
        
        // Board frame material - polished wood
        this.materials.frame = new THREE.MeshStandardMaterial({
            color: 0x2d1810,
            roughness: 0.4,
            metalness: 0.2,
        });
        
        // Black disc
        this.materials.blackDisc = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.3,
            metalness: 0.5,
        });
        
        // White disc
        this.materials.whiteDisc = new THREE.MeshStandardMaterial({
            color: 0xf5f5dc,
            roughness: 0.2,
            metalness: 0.3,
        });
        
        // Valid move indicator
        this.materials.validMove = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            transparent: true,
            opacity: 0.6,
            roughness: 0.3,
            metalness: 0.7,
        });
        
        // Hover highlight
        this.materials.hover = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.4,
            roughness: 0.3,
            metalness: 0.8,
        });
        
        // Grid lines
        this.materials.grid = new THREE.MeshBasicMaterial({
            color: 0x084423,
        });
    }

    createLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
        // Main spotlight from above
        const mainLight = new THREE.SpotLight(0xfffaf0, 2);
        mainLight.position.set(0, 8, 0);
        mainLight.angle = Math.PI / 4;
        mainLight.penumbra = 0.5;
        mainLight.decay = 1.5;
        mainLight.distance = 20;
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 1;
        mainLight.shadow.camera.far = 15;
        mainLight.shadow.bias = -0.0001;
        this.scene.add(mainLight);
        
        // Accent lights
        const accentLight1 = new THREE.PointLight(0xd4af37, 0.5);
        accentLight1.position.set(-4, 3, 4);
        this.scene.add(accentLight1);
        
        const accentLight2 = new THREE.PointLight(0x4a90d4, 0.3);
        accentLight2.position.set(4, 3, -4);
        this.scene.add(accentLight2);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffd700, 0.3);
        rimLight.position.set(0, 2, -5);
        this.scene.add(rimLight);
    }

    createBoard() {
        this.board = new THREE.Group();
        
        const boardWidth = this.CELL_SIZE * 8;
        const frameWidth = 0.15;
        
        // Main board surface
        const boardGeom = new THREE.BoxGeometry(boardWidth, 0.1, boardWidth);
        const boardMesh = new THREE.Mesh(boardGeom, this.materials.board);
        boardMesh.position.y = -0.05;
        boardMesh.receiveShadow = true;
        this.board.add(boardMesh);
        
        // Board frame
        const frameGeom = new THREE.BoxGeometry(
            boardWidth + frameWidth * 2,
            0.15,
            boardWidth + frameWidth * 2
        );
        const innerGeom = new THREE.BoxGeometry(boardWidth, 0.2, boardWidth);
        
        // Use CSG-like approach with simple geometry
        const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
        frameMesh.position.y = -0.1;
        frameMesh.receiveShadow = true;
        frameMesh.castShadow = true;
        this.board.add(frameMesh);
        
        // Grid lines
        const lineGeom = new THREE.BoxGeometry(boardWidth, 0.01, 0.01);
        for (let i = 0; i <= 8; i++) {
            const offset = (i - 4) * this.CELL_SIZE;
            
            // Horizontal lines
            const hLine = new THREE.Mesh(lineGeom.clone(), this.materials.grid);
            hLine.position.set(0, 0.001, offset);
            this.board.add(hLine);
            
            // Vertical lines
            const vLine = new THREE.Mesh(lineGeom.clone(), this.materials.grid);
            vLine.rotation.y = Math.PI / 2;
            vLine.position.set(offset, 0.001, 0);
            this.board.add(vLine);
        }
        
        // Center dot markers
        const dotGeom = new THREE.CircleGeometry(0.03, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x084423 });
        
        const dotPositions = [
            [-1.5, -1.5], [-1.5, 1.5], [1.5, -1.5], [1.5, 1.5]
        ];
        
        dotPositions.forEach(([x, z]) => {
            const dot = new THREE.Mesh(dotGeom, dotMaterial);
            dot.rotation.x = -Math.PI / 2;
            dot.position.set(x * this.CELL_SIZE, 0.002, z * this.CELL_SIZE);
            this.board.add(dot);
        });
        
        // Create clickable cells
        this.cells = [];
        const cellGeom = new THREE.PlaneGeometry(this.CELL_SIZE - 0.02, this.CELL_SIZE - 0.02);
        const cellMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        
        for (let row = 0; row < 8; row++) {
            this.cells[row] = [];
            for (let col = 0; col < 8; col++) {
                const cell = new THREE.Mesh(cellGeom, cellMaterial.clone());
                cell.rotation.x = -Math.PI / 2;
                cell.position.set(
                    (col - 3.5) * this.CELL_SIZE,
                    0.01,
                    (row - 3.5) * this.CELL_SIZE
                );
                cell.userData = { row, col, isCell: true };
                this.cells[row][col] = cell;
                this.board.add(cell);
            }
        }
        
        this.scene.add(this.board);
    }

    createEnvironment() {
        // Floor/table surface
        const floorGeom = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a14,
            roughness: 0.95,
            metalness: 0.05,
        });
        const floor = new THREE.Mesh(floorGeom, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Decorative particles
        this.createParticles();
    }

    createParticles() {
        const particleCount = 500;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const goldColor = new THREE.Color(0xd4af37);
        const whiteColor = new THREE.Color(0xffffff);
        const blueWhite = new THREE.Color(0xaaccff);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Distribute particles across a full sky dome
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.6; // More coverage of the sky
            const radius = 8 + Math.random() * 12;
            
            positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
            positions[i3 + 1] = Math.cos(phi) * radius * 0.8 + 1; // Lower base, taller dome
            positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
            
            // Varied star colors
            const colorRand = Math.random();
            let color;
            if (colorRand > 0.85) {
                color = goldColor;
            } else if (colorRand > 0.7) {
                color = blueWhite;
            } else {
                color = whiteColor;
            }
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            // Varied star sizes
            sizes[i] = 0.02 + Math.random() * 0.06;
        }
        
        const particleGeom = new THREE.BufferGeometry();
        particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
        });
        
        this.particles = new THREE.Points(particleGeom, particleMaterial);
        this.scene.add(this.particles);
    }

    setupEventListeners() {
        // Mouse/touch events
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    onPointerMove(event) {
        if (this.renderer.xr.isPresenting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.board.children);
        
        let foundCell = null;
        for (const intersect of intersects) {
            if (intersect.object.userData.isCell) {
                foundCell = intersect.object.userData;
                break;
            }
        }
        
        if (foundCell) {
            if (!this.hoveredCell || 
                this.hoveredCell.row !== foundCell.row || 
                this.hoveredCell.col !== foundCell.col) {
                this.hoveredCell = foundCell;
                if (this.onCellHover) {
                    this.onCellHover(foundCell.row, foundCell.col);
                }
            }
        } else {
            this.hoveredCell = null;
        }
    }

    onPointerDown(event) {
        if (this.renderer.xr.isPresenting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.board.children);
        
        for (const intersect of intersects) {
            if (intersect.object.userData.isCell) {
                const { row, col } = intersect.object.userData;
                if (this.onCellClick) {
                    this.onCellClick(row, col);
                }
                break;
            }
        }
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    // Disc management
    createDisc(row, col, player) {
        const discGeom = new THREE.CylinderGeometry(
            this.DISC_RADIUS,
            this.DISC_RADIUS,
            this.DISC_HEIGHT,
            32
        );
        
        // Create a disc with two materials (top/bottom black/white)
        const material = player === 1 ? this.materials.blackDisc : this.materials.whiteDisc;
        const disc = new THREE.Mesh(discGeom, material);
        
        // Add a subtle rim
        const rimGeom = new THREE.TorusGeometry(this.DISC_RADIUS, 0.008, 8, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: player === 1 ? 0x222222 : 0xdddddd,
            metalness: 0.8,
            roughness: 0.2
        });
        const rim = new THREE.Mesh(rimGeom, rimMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = this.DISC_HEIGHT / 2;
        disc.add(rim);
        
        const rimBottom = rim.clone();
        rimBottom.position.y = -this.DISC_HEIGHT / 2;
        disc.add(rimBottom);
        
        disc.position.set(
            (col - 3.5) * this.CELL_SIZE,
            this.DISC_HEIGHT / 2 + 0.01,
            (row - 3.5) * this.CELL_SIZE
        );
        
        disc.castShadow = true;
        disc.receiveShadow = true;
        disc.userData = { row, col, player };
        
        return disc;
    }

    placeDisc(row, col, player, animate = true) {
        const key = `${row},${col}`;
        
        // Remove existing disc if any
        if (this.discs.has(key)) {
            const oldDisc = this.discs.get(key);
            this.scene.remove(oldDisc);
        }
        
        const disc = this.createDisc(row, col, player);
        
        if (animate) {
            // Drop animation
            disc.position.y = 2;
            disc.scale.set(0.1, 0.1, 0.1);
            
            this.animatingDiscs.push({
                disc,
                targetY: this.DISC_HEIGHT / 2 + 0.01,
                targetScale: 1,
                type: 'drop',
                progress: 0
            });
        }
        
        this.scene.add(disc);
        this.discs.set(key, disc);
    }

    flipDisc(row, col, player) {
        const key = `${row},${col}`;
        const disc = this.discs.get(key);
        
        if (disc) {
            this.animatingDiscs.push({
                disc,
                newPlayer: player,
                type: 'flip',
                progress: 0
            });
        }
    }

    updateValidMoves(moves) {
        // Clear existing indicators
        this.clearValidMoveIndicators();
        
        // Create new indicators
        const indicatorGeom = new THREE.RingGeometry(
            this.DISC_RADIUS * 0.4,
            this.DISC_RADIUS * 0.6,
            32
        );
        
        moves.forEach(move => {
            const indicator = new THREE.Mesh(indicatorGeom, this.materials.validMove.clone());
            indicator.rotation.x = -Math.PI / 2;
            indicator.position.set(
                (move.col - 3.5) * this.CELL_SIZE,
                0.01,
                (move.row - 3.5) * this.CELL_SIZE
            );
            indicator.userData = { row: move.row, col: move.col };
            
            this.validMoveIndicators.push(indicator);
            this.scene.add(indicator);
        });
    }

    clearValidMoveIndicators() {
        this.validMoveIndicators.forEach(indicator => {
            this.scene.remove(indicator);
        });
        this.validMoveIndicators = [];
    }

    highlightCell(row, col, show) {
        const cell = this.cells[row]?.[col];
        if (cell) {
            cell.material.opacity = show ? 0.3 : 0;
            cell.material.color.setHex(show ? 0xffd700 : 0xffffff);
        }
    }

    clearBoard() {
        // Remove all discs
        this.discs.forEach(disc => {
            this.scene.remove(disc);
        });
        this.discs.clear();
        
        // Clear indicators
        this.clearValidMoveIndicators();
        
        // Reset animations
        this.animatingDiscs = [];
    }

    // Update game state visually
    updateFromGameState(board, validMoves) {
        // Update discs based on board state
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const key = `${row},${col}`;
                const cell = board[row][col];
                const existingDisc = this.discs.get(key);
                
                if (cell !== 0) {
                    if (!existingDisc) {
                        this.placeDisc(row, col, cell, false);
                    } else if (existingDisc.userData.player !== cell) {
                        // Color changed - update material
                        existingDisc.material = cell === 1 ? 
                            this.materials.blackDisc : this.materials.whiteDisc;
                        existingDisc.userData.player = cell;
                    }
                } else if (existingDisc) {
                    this.scene.remove(existingDisc);
                    this.discs.delete(key);
                }
            }
        }
        
        this.updateValidMoves(validMoves);
    }

    // Animation update
    updateAnimations(deltaTime) {
        const toRemove = [];
        
        this.animatingDiscs.forEach((anim, index) => {
            anim.progress += deltaTime * 3;
            
            if (anim.type === 'drop') {
                const t = Math.min(anim.progress, 1);
                const eased = this.easeOutBounce(t);
                
                anim.disc.position.y = 2 + (anim.targetY - 2) * eased;
                anim.disc.scale.setScalar(0.1 + 0.9 * eased);
                
                if (t >= 1) {
                    toRemove.push(index);
                }
            } else if (anim.type === 'flip') {
                const t = Math.min(anim.progress, 1);
                
                // Flip animation
                anim.disc.rotation.x = Math.PI * t;
                anim.disc.position.y = this.DISC_HEIGHT / 2 + 0.01 + Math.sin(Math.PI * t) * 0.3;
                
                // Change color at midpoint
                if (t >= 0.5 && !anim.colorChanged) {
                    anim.disc.material = anim.newPlayer === 1 ? 
                        this.materials.blackDisc : this.materials.whiteDisc;
                    anim.disc.userData.player = anim.newPlayer;
                    anim.colorChanged = true;
                }
                
                if (t >= 1) {
                    anim.disc.rotation.x = 0;
                    anim.disc.position.y = this.DISC_HEIGHT / 2 + 0.01;
                    toRemove.push(index);
                }
            }
        });
        
        // Remove completed animations (in reverse order)
        toRemove.sort((a, b) => b - a).forEach(index => {
            this.animatingDiscs.splice(index, 1);
        });
    }

    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    // WebXR Setup
    setupVR() {
        const vrButton = VRButton.createButton(this.renderer);
        vrButton.id = 'vr-session-button';
        vrButton.style.display = 'none';
        document.body.appendChild(vrButton);
        
        // Check VR availability
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                if (supported) {
                    document.getElementById('vr-button').classList.remove('hidden');
                    document.getElementById('vr-button').addEventListener('click', () => {
                        vrButton.click();
                    });
                }
            });
        }
        
        // VR Controllers
        const controllerModelFactory = new XRControllerModelFactory();
        
        this.vrController1 = this.renderer.xr.getController(0);
        this.vrController1.addEventListener('selectstart', () => this.onVRSelect(this.vrController1));
        this.scene.add(this.vrController1);
        
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
        this.scene.add(this.controllerGrip1);
        
        this.vrController2 = this.renderer.xr.getController(1);
        this.vrController2.addEventListener('selectstart', () => this.onVRSelect(this.vrController2));
        this.scene.add(this.vrController2);
        
        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));
        this.scene.add(this.controllerGrip2);
        
        // Controller ray
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const rayMaterial = new THREE.LineBasicMaterial({ 
            color: 0xd4af37,
            transparent: true,
            opacity: 0.5
        });
        
        const ray1 = new THREE.Line(rayGeometry, rayMaterial);
        this.vrController1.add(ray1);
        
        const ray2 = new THREE.Line(rayGeometry.clone(), rayMaterial.clone());
        this.vrController2.add(ray2);
        
        // VR camera positioning
        this.renderer.xr.addEventListener('sessionstart', () => {
            // Position camera for VR viewing
            this.camera.position.set(0, 1.6, 2);
            document.body.classList.add('vr-active');
        });
        
        this.renderer.xr.addEventListener('sessionend', () => {
            this.camera.position.set(0, 5, 5);
            document.body.classList.remove('vr-active');
        });
    }

    onVRSelect(controller) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        const intersects = this.raycaster.intersectObjects(this.board.children);
        
        for (const intersect of intersects) {
            if (intersect.object.userData.isCell) {
                const { row, col } = intersect.object.userData;
                if (this.onCellClick) {
                    this.onCellClick(row, col);
                }
                break;
            }
        }
    }

    // Render loop
    render(deltaTime) {
        // Update controls
        if (!this.renderer.xr.isPresenting) {
            this.controls.update();
        }
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += deltaTime * 0.02;
        }
        
        // Animate valid move indicators
        const time = performance.now() * 0.002;
        this.validMoveIndicators.forEach((indicator, i) => {
            indicator.material.opacity = 0.4 + Math.sin(time + i * 0.5) * 0.2;
            indicator.scale.setScalar(0.9 + Math.sin(time * 1.5 + i * 0.3) * 0.1);
        });
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    startRenderLoop(callback) {
        let lastTime = 0;
        
        this.renderer.setAnimationLoop((time) => {
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;
            
            if (callback) callback(deltaTime);
            this.render(deltaTime);
        });
    }
}

