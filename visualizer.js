// visualizer.js - Three.js 3D Engine for NeeDoh Lab
import { sound } from './sound.js';

export class Visualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        
        // Squishy state
        this.squishyGroup = null;
        this.shellMesh = null;
        this.faceMesh = null;
        this.faceTexture = null;
        
        // Filling sub-items
        this.beadsGroup = null;
        this.glitterGroup = null;
        this.shimmerMesh = null;
        
        // Packaging
        this.boxMesh = null;
        this.boxMaterials = [];
        
        // Squeeze & Spring Physics
        this.isSqueezing = false;
        this.currentScale = new THREE.Vector3(1, 1, 1);
        this.targetScale = new THREE.Vector3(1, 1, 1);
        this.scaleVelocity = new THREE.Vector3(0, 0, 0);
        
        // Interaction raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Current customization configurations
        this.config = {
            shape: 'glob',
            size: 'classic',
            filling: 'dough',
            material: 'glossy',
            texture: 'smooth',
            shellColor: '#ff2a85',
            coreColor: '#00ffaa',
            thermochromic: false,
            face: 'none',
            boxType: 'retro',
            customLabel: 'MY SQUISHY',
            showBox: false
        };

        this.init();
        this.animate();
        this.setupInteraction();
    }

    init() {
        // 1. Create WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Clear old contents and append canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // 2. Create Scene
        this.scene = new THREE.Scene();

        // 3. Create Camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(0, 0.5, 4.5);

        // 4. Orbit Controls (restricted limits so user doesn't get lost)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 8;
        this.controls.maxPolarAngle = Math.PI / 1.9; // don't go below floor

        // 5. Lighting Setup
        // Ambient soft light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(ambientLight);

        // Key Light (warm directional, casts shadows)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(5, 8, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.bias = -0.001;
        this.scene.add(keyLight);

        // Neon Rim Light (Right-Back: Cyber Pink)
        const pinkRimLight = new THREE.PointLight(0xff2a85, 2.5, 10);
        pinkRimLight.position.set(-4, 3, -3);
        this.scene.add(pinkRimLight);

        // Neon Fill Light (Left-Front: Cool Cyan)
        const cyanFillLight = new THREE.PointLight(0x00c3ff, 1.5, 10);
        cyanFillLight.position.set(3, -2, 2);
        this.scene.add(cyanFillLight);

        // 6. Floor shadow catcher
        const floorGeo = new THREE.PlaneGeometry(15, 15);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.15 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = -1.4;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        // 7. Initialize Squishy Group
        this.squishyGroup = new THREE.Group();
        this.scene.add(this.squishyGroup);

        // Build Initial Model
        this.rebuildSquishy();

        // Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Remove loading overlay
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.style.opacity = 0;
        setTimeout(() => { if (loader) loader.style.display = 'none'; }, 500);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    // --- GEOMETRY GENERATORS ---
    
    // Generates a rounded cube mathematically
    createRoundedCubeGeometry(width, height, depth, radius, subdivisions) {
        const geo = new THREE.BoxGeometry(width, height, depth, subdivisions, subdivisions, subdivisions);
        const position = geo.attributes.position;
        const temp = new THREE.Vector3();

        const w = (width - radius * 2) / 2;
        const h = (height - radius * 2) / 2;
        const d = (depth - radius * 2) / 2;

        for (let i = 0; i < position.count; i++) {
            temp.fromBufferAttribute(position, i);
            
            // Clamp vertex coordinates to find nearest point on inner box core
            const px = Math.min(Math.max(temp.x, -w), w);
            const py = Math.min(Math.max(temp.y, -h), h);
            const pz = Math.min(Math.max(temp.z, -d), d);
            
            // Vector from inner core to vertex
            const vx = temp.x - px;
            const vy = temp.y - py;
            const vz = temp.z - pz;
            
            const len = Math.sqrt(vx*vx + vy*vy + vz*vz);
            if (len > 0) {
                // Project outward by radius from boundary point
                temp.x = px + (vx / len) * radius;
                temp.y = py + (vy / len) * radius;
                temp.z = pz + (vz / len) * radius;
                position.setXYZ(i, temp.x, temp.y, temp.z);
            }
        }
        geo.computeVertexNormals();
        return geo;
    }

    // Spheroidal Tapered Dome for Gumdrop
    createGumdropGeometry() {
        const geo = new THREE.SphereGeometry(0.9, 64, 64);
        const position = geo.attributes.position;
        const temp = new THREE.Vector3();

        for (let i = 0; i < position.count; i++) {
            temp.fromBufferAttribute(position, i);
            
            // Flatten bottom of gumdrop
            if (temp.y < -0.35) {
                temp.y = -0.35;
            }
            
            // Taper top coordinates
            // temp.y goes from -0.35 to +0.9
            // Taper factor is larger at the bottom, small at top
            const taper = (1.1 - temp.y) / 1.45;
            temp.x *= taper;
            temp.z *= taper;
            
            position.setXYZ(i, temp.x, temp.y, temp.z);
        }
        geo.computeVertexNormals();
        return geo;
    }

    // Applies Spiky or Ribbed deformations physically to vertices
    applyTextureDeformation(geo, type) {
        if (type === 'smooth') return;
        const position = geo.attributes.position;
        const normal = geo.attributes.normal;
        const tempP = new THREE.Vector3();
        const tempN = new THREE.Vector3();

        for (let i = 0; i < position.count; i++) {
            tempP.fromBufferAttribute(position, i);
            tempN.fromBufferAttribute(normal, i);

            if (type === 'spikes') {
                // Use spherical angles to create uniform bumps
                const theta = Math.atan2(tempP.z, tempP.x);
                const phi = Math.acos(Math.min(Math.max(tempP.y / tempP.length(), -1), 1));
                
                // Frequency of spikes
                const freq = 18;
                const spike = Math.sin(theta * freq) * Math.sin(phi * freq);
                
                if (spike > 0) {
                    // Push vertex out along normal
                    tempP.addScaledVector(tempN, spike * 0.05);
                }
            } else if (type === 'ribbed') {
                // Bumps along Y height
                const ring = Math.sin(tempP.y * 18);
                if (ring > 0) {
                    // Bulge out perpendicular to Y
                    const horiz = new THREE.Vector3(tempN.x, 0, tempN.z).normalize();
                    tempP.addScaledVector(horiz, ring * 0.04);
                }
            }

            position.setXYZ(i, tempP.x, tempP.y, tempP.z);
        }
        geo.computeVertexNormals();
    }

    // Creates dynamic 2D canvas texture for the face expressions
    createFaceTexture(expression) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 512, 512);

        if (expression === 'none') {
            return null;
        }

        ctx.fillStyle = '#111827'; // Dark charcoal face lines
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const c = 256; // center

        switch (expression) {
            case 'smiley':
                // Eyes
                ctx.beginPath();
                ctx.arc(c - 65, c - 20, 15, 0, Math.PI * 2);
                ctx.arc(c + 65, c - 20, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Smile
                ctx.beginPath();
                ctx.arc(c, c, 50, 0.1 * Math.PI, 0.9 * Math.PI);
                ctx.stroke();
                break;

            case 'cool':
                // Sunglasses
                ctx.beginPath();
                // Left lens
                ctx.moveTo(c - 120, c - 30);
                ctx.lineTo(c - 20, c - 30);
                ctx.quadraticCurveTo(c - 20, c + 20, c - 70, c + 20);
                ctx.quadraticCurveTo(c - 120, c + 20, c - 120, c - 30);
                
                // Right lens
                ctx.moveTo(c + 20, c - 30);
                ctx.lineTo(c + 120, c - 30);
                ctx.quadraticCurveTo(c + 120, c + 20, c + 70, c + 20);
                ctx.quadraticCurveTo(c + 20, c + 20, c + 20, c - 30);
                ctx.fill();
                
                // Bridge
                ctx.beginPath();
                ctx.moveTo(c - 20, c - 25);
                ctx.lineTo(c + 20, c - 25);
                ctx.stroke();

                // Smug mouth
                ctx.beginPath();
                ctx.moveTo(c - 30, c + 60);
                ctx.quadraticCurveTo(c + 20, c + 80, c + 35, c + 50);
                ctx.stroke();
                break;

            case 'derp':
                // Big silly eyes (unequal sizes)
                ctx.beginPath();
                ctx.arc(c - 60, c - 30, 25, 0, Math.PI * 2); // left big eye
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(c + 60, c - 30, 15, 0, Math.PI * 2); // right small eye
                ctx.fill();
                ctx.stroke();
                
                // Pupils
                ctx.fillStyle = '#111827';
                ctx.beginPath();
                ctx.arc(c - 60 + 8, c - 30 + 8, 8, 0, Math.PI * 2);
                ctx.arc(c + 60 - 4, c - 30 - 4, 5, 0, Math.PI * 2);
                ctx.fill();

                // Mouth & Tongue
                ctx.beginPath();
                ctx.moveTo(c - 50, c + 30);
                ctx.quadraticCurveTo(c, c + 60, c + 50, c + 30);
                ctx.stroke();

                // Tongue
                ctx.fillStyle = '#ff2a85';
                ctx.beginPath();
                ctx.moveTo(c - 15, c + 46);
                ctx.quadraticCurveTo(c, c + 85, c + 15, c + 46);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'grumpy':
                // Angled angry eyebrows
                ctx.beginPath();
                ctx.moveTo(c - 100, c - 50);
                ctx.lineTo(c - 30, c - 25);
                ctx.moveTo(c + 100, c - 50);
                ctx.lineTo(c + 30, c - 25);
                ctx.stroke();

                // Squinting angry eyes
                ctx.beginPath();
                ctx.arc(c - 60, c - 15, 12, 0, Math.PI * 2);
                ctx.arc(c + 60, c - 15, 12, 0, Math.PI * 2);
                ctx.fillStyle = '#111827';
                ctx.fill();

                // Frown
                ctx.beginPath();
                ctx.arc(c, c + 75, 40, 1.2 * Math.PI, 1.8 * Math.PI);
                ctx.stroke();
                break;

            case 'sleepy':
                // Happy curved closed eyes
                ctx.beginPath();
                ctx.arc(c - 60, c - 20, 20, 1.1 * Math.PI, 1.9 * Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(c + 60, c - 20, 20, 1.1 * Math.PI, 1.9 * Math.PI);
                ctx.stroke();
                
                // Small peaceful smile
                ctx.beginPath();
                ctx.arc(c, c + 35, 16, 0, Math.PI);
                ctx.stroke();
                break;
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // --- REBUILD ENGINE ---

    rebuildSquishy() {
        // Clear children
        while(this.squishyGroup.children.length > 0){ 
            this.scene.remove(this.squishyGroup.children[0]); 
            this.squishyGroup.remove(this.squishyGroup.children[0]); 
        }

        // Clean memory
        if (this.shellMesh) {
            this.shellMesh.geometry.dispose();
            if (Array.isArray(this.shellMesh.material)) {
                this.shellMesh.material.forEach(m => m.dispose());
            } else {
                this.shellMesh.material.dispose();
            }
        }
        if (this.beadsGroup) {
            this.beadsGroup.children.forEach(b => b.geometry.dispose());
        }

        this.beadsGroup = null;
        this.glitterGroup = null;
        this.shimmerMesh = null;

        // 1. Generate Geometry based on Shape Selection
        let baseGeo;
        if (this.config.shape === 'glob') {
            baseGeo = new THREE.SphereGeometry(0.9, 64, 64);
        } else if (this.config.shape === 'cube') {
            baseGeo = this.createRoundedCubeGeometry(1.4, 1.4, 1.4, 0.35, 32);
        } else if (this.config.shape === 'donut') {
            baseGeo = new THREE.TorusGeometry(0.65, 0.28, 32, 64);
        } else if (this.config.shape === 'gumdrop') {
            baseGeo = this.createGumdropGeometry();
        } else if (this.config.shape === 'cat') {
            baseGeo = new THREE.SphereGeometry(0.85, 48, 48); // main head
        }

        // Apply Spikes or Ribs (except for cat/donut, which look weird with ribs)
        if (this.config.shape !== 'cat' && this.config.shape !== 'donut') {
            this.applyTextureDeformation(baseGeo, this.config.texture);
        }

        // 2. Generate Shell Material
        const shellMat = this.createShellMaterial();

        // 3. Create Main Shell Mesh
        this.shellMesh = new THREE.Mesh(baseGeo, shellMat);
        this.shellMesh.castShadow = true;
        this.shellMesh.receiveShadow = true;
        this.squishyGroup.add(this.shellMesh);

        // Cat Shape Accessories (Ears!)
        if (this.config.shape === 'cat') {
            this.buildCatEars(shellMat);
        }

        // 4. Generate Face Overlay
        this.buildFace();

        // 5. Generate Internal Filling elements if shell is translucent
        if (this.config.material === 'translucent') {
            this.buildInteriorFillings();
        }

        // 6. Packaging Render Toggle
        this.updatePackaging();

        // Set Scale based on size configuration
        this.updateSize();
    }

    buildCatEars(earMaterial) {
        // Ear Cone Geometry
        const earGeo = new THREE.ConeGeometry(0.24, 0.45, 4);
        
        // Left Ear
        const leftEar = new THREE.Mesh(earGeo, earMaterial);
        leftEar.position.set(-0.48, 0.65, 0.1);
        leftEar.rotation.set(0.1, 0, 0.45);
        leftEar.castShadow = true;
        this.squishyGroup.add(leftEar);

        // Right Ear
        const rightEar = new THREE.Mesh(earGeo, earMaterial);
        rightEar.position.set(0.48, 0.65, 0.1);
        rightEar.rotation.set(0.1, 0, -0.45);
        rightEar.castShadow = true;
        this.squishyGroup.add(rightEar);
    }

    buildFace() {
        if (this.config.face === 'none') return;

        this.faceTexture = this.createFaceTexture(this.config.face);
        if (!this.faceTexture) return;

        // Position face mesh slightly in front of the squishy surface
        let faceGeo, fZ, fY;
        
        if (this.config.shape === 'cube') {
            faceGeo = new THREE.PlaneGeometry(0.7, 0.7);
            fZ = 0.71;
            fY = 0.05;
        } else if (this.config.shape === 'donut') {
            faceGeo = new THREE.PlaneGeometry(0.4, 0.4);
            fZ = 0.88; // sitting on outer ring
            fY = 0;
        } else if (this.config.shape === 'gumdrop') {
            faceGeo = new THREE.PlaneGeometry(0.55, 0.55);
            fZ = 0.65;
            fY = -0.05;
        } else { // glob or cat
            faceGeo = new THREE.SphereGeometry(0.86, 32, 16, 0.5 * Math.PI, 0.3 * Math.PI, 0.35 * Math.PI, 0.3 * Math.PI);
            fZ = 0;
            fY = 0;
        }

        const faceMat = new THREE.MeshBasicMaterial({
            map: this.faceTexture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
        });

        this.faceMesh = new THREE.Mesh(faceGeo, faceMat);
        
        if (this.config.shape === 'cube' || this.config.shape === 'donut' || this.config.shape === 'gumdrop') {
            this.faceMesh.position.set(0, fY, fZ);
        } else {
            // Sphere rotation to align standard UV slice to face front
            this.faceMesh.rotation.set(0.1, Math.PI / 1.7, 0);
        }

        this.squishyGroup.add(this.faceMesh);
    }

    createShellMaterial() {
        const baseColor = new THREE.Color(this.config.shellColor);
        
        const matOptions = {
            color: baseColor,
            roughness: 0.15,
            metalness: 0.05
        };

        if (this.config.material === 'glossy') {
            // High-shine plastic/latex feel
            matOptions.roughness = 0.04;
            matOptions.metalness = 0.05;
            matOptions.clearcoat = 1.0;
            matOptions.clearcoatRoughness = 0.02;
            return new THREE.MeshPhysicalMaterial(matOptions);
        } else if (this.config.material === 'matte') {
            // Powdery, soft flocked look
            matOptions.roughness = 0.95;
            matOptions.metalness = 0.0;
            return new THREE.MeshStandardMaterial(matOptions);
        } else if (this.config.material === 'translucent') {
            // Silicone/glass refraction
            matOptions.roughness = 0.15;
            matOptions.transmission = 0.75;
            matOptions.opacity = 0.98;
            matOptions.transparent = true;
            matOptions.thickness = 1.2;
            matOptions.ior = 1.4; // Index of refraction of water/rubber
            return new THREE.MeshPhysicalMaterial(matOptions);
        }

        return new THREE.MeshStandardMaterial(matOptions);
    }

    buildInteriorFillings() {
        const radiusLimit = this.config.shape === 'cube' ? 0.5 : 0.65;

        if (this.config.filling === 'beads') {
            // Water Beads inside: many small colorful spheres
            this.beadsGroup = new THREE.Group();
            
            const numBeads = this.config.size === 'super' ? 70 : (this.config.size === 'teenie' ? 25 : 45);
            const beadGeo = new THREE.SphereGeometry(0.08, 8, 8);
            
            // Random bead colors (using secondary core color and some variations)
            const baseColor = new THREE.Color(this.config.coreColor);
            const altColor1 = baseColor.clone().multiplyScalar(0.7);
            const altColor2 = baseColor.clone().addScalar(0.2);
            const colors = [baseColor, altColor1, altColor2];

            for (let i = 0; i < numBeads; i++) {
                const beadMat = new THREE.MeshStandardMaterial({
                    color: colors[i % 3],
                    roughness: 0.1,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.9
                });
                
                const bead = new THREE.Mesh(beadGeo, beadMat);
                
                // Position randomly inside a sphere of radiusLimit
                const r = Math.random() * radiusLimit;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                
                bead.position.set(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta) * 0.9,
                    r * Math.cos(phi)
                );
                
                // Random scale variation
                const sc = 0.75 + Math.random() * 0.5;
                bead.scale.set(sc, sc, sc);
                bead.userData = { 
                    origin: bead.position.clone(),
                    speed: 1 + Math.random() * 2
                };
                
                this.beadsGroup.add(bead);
            }
            this.squishyGroup.add(this.beadsGroup);

        } else if (this.config.filling === 'gel') {
            // Glitter Gel: Tiny reflective flat squares
            this.glitterGroup = new THREE.Group();
            const numFlakes = 60;
            const flakeGeo = new THREE.PlaneGeometry(0.04, 0.04);
            const flakeMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(this.config.coreColor),
                roughness: 0.05,
                metalness: 1.0, // Shiny metallic flake
                side: THREE.DoubleSide
            });

            for (let i = 0; i < numFlakes; i++) {
                const flake = new THREE.Mesh(flakeGeo, flakeMat);
                
                const r = Math.random() * radiusLimit;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                
                flake.position.set(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );
                
                flake.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    0
                );
                
                flake.userData = { 
                    origin: flake.position.clone(),
                    rotSpeed: (Math.random() - 0.5) * 2
                };
                this.glitterGroup.add(flake);
            }
            this.squishyGroup.add(this.glitterGroup);

        } else if (this.config.filling === 'shimmer') {
            // Stardust metallic swirling inner core sphere
            const coreGeo = new THREE.SphereGeometry(radiusLimit * 1.05, 32, 32);
            
            // We use a high metalness, low roughness material with custom rim glow
            const coreMat = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(this.config.coreColor),
                metalness: 1.0,
                roughness: 0.15,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1
            });
            
            this.shimmerMesh = new THREE.Mesh(coreGeo, coreMat);
            this.squishyGroup.add(this.shimmerMesh);
        } else {
            // Dough filling: create a solid inner sphere matching coreColor
            // if transparent shell so it looks filled
            const coreGeo = new THREE.SphereGeometry(radiusLimit * 1.08, 32, 32);
            const coreMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(this.config.coreColor),
                roughness: 0.8,
                metalness: 0.0
            });
            this.shimmerMesh = new THREE.Mesh(coreGeo, coreMat);
            this.squishyGroup.add(this.shimmerMesh);
        }
    }

    // --- PACKAGING GENERATOR ---

    updatePackaging() {
        if (this.boxMesh) {
            this.scene.remove(this.boxMesh);
            this.boxMaterials.forEach(m => m.dispose());
            this.boxMesh = null;
        }

        if (!this.config.showBox) return;

        const sizeFactor = this.config.size === 'super' ? 1.4 : (this.config.size === 'teenie' ? 0.7 : 1.0);
        const w = 2.0 * sizeFactor;
        const h = 2.0 * sizeFactor;
        const d = 2.0 * sizeFactor;

        // Custom packaging box textures
        const materials = [];
        
        // 6 faces: Right, Left, Top, Bottom, Front (Window), Back
        for (let i = 0; i < 6; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Draw cardboard theme background
            ctx.fillStyle = '#1e1b18'; // Dark vintage brown-black cardboard
            ctx.fillRect(0, 0, 512, 512);
            
            // Neon border lines
            ctx.strokeStyle = this.config.shellColor;
            ctx.lineWidth = 16;
            ctx.strokeRect(20, 20, 472, 472);
            
            ctx.fillStyle = this.config.shellColor;
            ctx.font = 'bold 36px Outfit';
            ctx.textAlign = 'center';
            
            if (i === 4) { // FRONT window cutout
                // Draw cut borders
                ctx.strokeStyle = '#00c3ff';
                ctx.lineWidth = 8;
                ctx.setLineDash([15, 10]);
                ctx.strokeRect(50, 80, 412, 350);
                
                // Clear the window center for transparency
                ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillRect(52, 82, 408, 346);
                ctx.globalCompositeOperation = 'source-over';
                
                // Text at top
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 42px Outfit';
                ctx.fillText(this.config.customLabel.toUpperCase(), 256, 60);
                
                // Retro badge
                ctx.font = 'bold 22px "Plus Jakarta Sans"';
                ctx.fillStyle = '#00c3ff';
                ctx.fillText("⚠️ DO NOT MICROWAVE", 256, 470);
            } else {
                // Other box faces decor
                ctx.fillStyle = '#ffffff';
                ctx.fillText("NeeDoh Lab", 256, 80);
                
                ctx.fillStyle = this.config.shellColor;
                ctx.font = 'bold 50px Outfit';
                ctx.fillText("GROOVY GLOB", 256, 260);
                
                ctx.fillStyle = '#94a3b8';
                ctx.font = '24px "Plus Jakarta Sans"';
                ctx.fillText("Premium PVA Filling", 256, 310);
                
                ctx.fillStyle = '#00ffaa';
                ctx.font = 'bold 22px Outfit';
                ctx.fillText(`SIZE: ${this.config.size.toUpperCase()}`, 256, 450);
            }

            const texture = new THREE.CanvasTexture(canvas);
            
            const mat = new THREE.MeshPhysicalMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.1,
                transparent: i === 4, // front face transparent for window
                side: THREE.DoubleSide
            });
            materials.push(mat);
            this.boxMaterials.push(mat);
        }

        const boxGeo = new THREE.BoxGeometry(w, h, d);
        this.boxMesh = new THREE.Mesh(boxGeo, materials);
        this.boxMesh.position.y = -0.15;
        this.scene.add(this.boxMesh);
    }

    updateSize() {
        let sizeScale = 1.0;
        if (this.config.size === 'teenie') {
            sizeScale = 0.65;
        } else if (this.config.size === 'super') {
            sizeScale = 1.5;
        }
        
        // Reset scale and targets
        this.squishyGroup.scale.set(sizeScale, sizeScale, sizeScale);
        this.currentScale.set(sizeScale, sizeScale, sizeScale);
        this.targetScale.set(sizeScale, sizeScale, sizeScale);
        this.scaleVelocity.set(0, 0, 0);
    }

    // --- SQUEEZE & PHYSICS INTERACTION ---

    squeeze() {
        if (this.isSqueezing) return;
        this.config.showBox = false; // Hide box on squeeze to reveal squishy properly
        const showBoxCheckbox = document.getElementById('show-box-toggle');
        if (showBoxCheckbox) showBoxCheckbox.checked = false;
        this.updatePackaging();

        this.isSqueezing = true;
        this.controls.enableRotate = false; // lock camera rotations during squeeze
        
        // Trigger sound
        sound.playSquish(this.config.filling);
        
        // Color shift shell color on squish (if thermochromic)
        if (this.config.thermochromic && this.shellMesh) {
            this.shellMesh.material.color.set(this.config.coreColor);
        }
    }

    release() {
        if (!this.isSqueezing) return;
        this.isSqueezing = false;
        this.controls.enableRotate = true; // release camera rotation
        
        sound.playRelease(this.config.filling);
        
        // Cool down thermochromic color
        if (this.config.thermochromic && this.shellMesh) {
            // Slowly return to base color
            let timer = 0;
            const originalColor = new THREE.Color(this.config.shellColor);
            const coolDown = () => {
                if (this.isSqueezing) return; // cancel cool down if squeezed again
                timer += 0.02;
                this.shellMesh.material.color.lerp(originalColor, 0.08);
                if (timer < 1) requestAnimationFrame(coolDown);
            };
            coolDown();
        }
    }

    setupInteraction() {
        const onDown = (event) => {
            // Calculate mouse position relative to canvas container bounds
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.squishyGroup.children, true);

            if (intersects.length > 0) {
                this.squeeze();
            }
        };

        const onUp = () => {
            this.release();
        };

        // Desktop Events
        this.renderer.domElement.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);

        // Mobile Events
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                onDown(e.touches[0]);
            }
        });
        window.addEventListener('touchend', onUp);
    }

    // --- ANIMATION / PHYSICS LOOP ---

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const baseScale = this.config.size === 'teenie' ? 0.65 : (this.config.size === 'super' ? 1.5 : 1.0);
        
        // 1. Squash and Stretch Physics
        if (this.isSqueezing) {
            // Squished Target dimensions
            this.targetScale.y = baseScale * 0.52;
            this.targetScale.x = baseScale * 1.35;
            this.targetScale.z = baseScale * 1.35;
            
            // Maltose is thicker/heavier, so it squeezes a fraction slower
            const lerpSpeed = this.config.filling === 'maltose' ? 0.15 : 0.28;
            this.currentScale.lerp(this.targetScale, lerpSpeed);
        } else {
            // Return back to resting base scale
            this.targetScale.set(baseScale, baseScale, baseScale);
            
            if (this.config.filling === 'maltose') {
                // Maltose expands back EXTREMELY slowly
                this.currentScale.lerp(this.targetScale, 0.02);
            } else {
                // Spring wobble for bouncy fillings (dough, beads, gel)
                const springStrength = 0.18;
                const damping = 0.78;
                
                // Spring calculation for X, Y, Z scales independently
                ['x', 'y', 'z'].forEach(axis => {
                    const force = (this.targetScale[axis] - this.currentScale[axis]) * springStrength;
                    this.scaleVelocity[axis] += force;
                    this.scaleVelocity[axis] *= damping;
                    this.currentScale[axis] += this.scaleVelocity[axis];
                });
            }
        }
        
        // Apply scales to squishy group
        this.squishyGroup.scale.copy(this.currentScale);

        // 2. Animate Filling Elements inside translucent shell
        if (this.config.material === 'translucent') {
            const time = Date.now() * 0.001;

            if (this.beadsGroup) {
                // Float beads around slightly
                this.beadsGroup.children.forEach(bead => {
                    const origin = bead.userData.origin;
                    const speed = bead.userData.speed;
                    // Jiggle speed goes up if squeezed
                    const multi = this.isSqueezing ? 3 : 1;

                    bead.position.x = origin.x + Math.sin(time * speed) * 0.04 * multi;
                    bead.position.y = origin.y + Math.cos(time * speed * 0.8) * 0.04 * multi;
                    bead.position.z = origin.z + Math.sin(time * speed * 1.2) * 0.04 * multi;
                });
            }

            if (this.glitterGroup) {
                // Spin/wobble glitter flakes
                this.glitterGroup.children.forEach(flake => {
                    const rotSpeed = flake.userData.rotSpeed;
                    const multi = this.isSqueezing ? 4 : 1;
                    
                    flake.rotation.x += 0.005 * rotSpeed * multi;
                    flake.rotation.y += 0.008 * rotSpeed * multi;
                });
            }

            if (this.shimmerMesh && this.config.filling === 'shimmer') {
                // Swirl metallic shimmer core
                this.shimmerMesh.rotation.y += 0.003;
                this.shimmerMesh.rotation.x += 0.0015;
            }
        }

        // Slowly rotate model in idle state (only if not holding mouse)
        if (!this.isSqueezing && this.controls.state === -1) {
            this.squishyGroup.rotation.y += 0.003;
        }

        // Update Controls & Render
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Set configuration parameters and rebuild
    updateConfig(key, value) {
        this.config[key] = value;
        
        // Special checks
        if (key === 'shape' || key === 'filling' || key === 'material' || key === 'texture' || key === 'shellColor' || key === 'coreColor' || key === 'face') {
            this.rebuildSquishy();
        } else if (key === 'size') {
            this.updateSize();
            // Re-render package if showBox is on
            if (this.config.showBox) this.updatePackaging();
        } else if (key === 'showBox' || key === 'boxType' || key === 'customLabel') {
            this.updatePackaging();
        }
    }

    // Capture the WebGL canvas as a PNG data URL
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }
}
