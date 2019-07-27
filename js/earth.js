import * as THREE from 'three';

export default class Earth {
    createPlanet(options) {
        // Create the planet's Surface
        var surfaceGeometry = new THREE.SphereGeometry(options.surface.size, 50, 50);
        var surfaceMaterial = Earth.material(options.surface.material);
        var surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

        // Create the planet's Atmosphere
        var atmosphereGeometry = new THREE.SphereGeometry(options.surface.size + options.atmosphere.size);
        var atmosphereMaterialDefaults = {
            side: THREE.DoubleSide,
            transparent: true
        };
        var atmosphereMaterialOptions = Object.assign(atmosphereMaterialDefaults, options.atmosphere.material);
        var atmosphereMaterial = Earth.material(atmosphereMaterialOptions);
        var atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

        // Create the planet's Atmospheric glow
        var atmosphericGlowGeometry = new THREE.SphereGeometry(options.surface.size + options.atmosphere.size + options.atmosphere.glow.size);
        var atmosphericGlowMaterial = Earth.glowMaterial(options.camera, options.atmosphere.glow.intensity, options.atmosphere.glow.fade, options.atmosphere.glow.color);
        var atmosphericGlow = new THREE.Mesh(atmosphericGlowGeometry, atmosphericGlowMaterial);

        // Nest the planet's Surface and Atmosphere into a planet object
        var planet = new THREE.Object3D();
        surface.name = 'surface';
        atmosphere.name = 'atmosphere';
        atmosphericGlow.name = 'atmosphericGlow';
        planet.add(surface);
        planet.add(atmosphere);
        planet.add(atmosphericGlow);

        // Load the Surface's textures
        for (var textureProperty in options.surface.textures) {
            this.texture(
                surfaceMaterial,
                textureProperty,
                options.surface.textures[textureProperty]
            );
        }

        // Load the Atmosphere's texture
        for (textureProperty in options.atmosphere.textures) {
            this.texture(
                atmosphereMaterial,
                textureProperty,
                options.atmosphere.textures[textureProperty]
            );
        }

        return planet;
    }

    static material(s_material) {
        var material = new THREE.MeshPhongMaterial();
        if (s_material) {
            for (var property in s_material) {
                material[property] = s_material[property];
            }
        }

        return material;
    }

    texture(material, property, uri) {
        var textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = true;
        textureLoader.load(
            uri,
            function(texture) {
                material[property] = texture;
                material.needsUpdate = true;
            }
        );
    }

    static glowMaterial(camera, intensity, fade, color) {
        return new THREE.ShaderMaterial({
            uniforms: {
                'c': {
                    type: 'f',
                    value: intensity
                },
                'p': {
                    type: 'f',
                    value: fade
                },
                glowColor: {
                    type: 'c',
                    value: new THREE.Color(color)
                },
                viewVector: {
                    type: 'v3',
                    value: camera.position
                }
            },
            vertexShader: `
                        uniform vec3 viewVector;
                        uniform float c;
                        uniform float p;
                        varying float intensity;
                        void main() {
                          vec3 vNormal = normalize( normalMatrix * normal );
                          vec3 vNormel = normalize( normalMatrix * viewVector );
                          intensity = pow( c - dot(vNormal, vNormel), p );
                          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                        }`
            ,
            fragmentShader: `
                        uniform vec3 glowColor;
                        varying float intensity;
                        void main()
                        {
                          vec3 glow = glowColor * intensity;
                          gl_FragColor = vec4( glow, 1.0 );
                        }`
            ,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
    }
}