import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Calculate view direction (simplified as 0,0,1 for standard camera facing)
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  
  // Fresnel effect: intense at edges
  float fresnel = pow(0.7 - dot(vNormal, viewDirection), 3.0);
  
  // Top-down gradient (Simulate day/night terminator or just aesthetic fade)
  // We want the top of the arc to be bright, fading down
  float height = vPosition.y; 
  
  // Cyberpunk Color Palette
  vec3 colorA = vec3(0.6, 0.2, 0.9); // Bright Violet
  vec3 colorB = vec3(0.1, 0.05, 0.3); // Deep Indigo
  vec3 colorC = vec3(0.0, 0.0, 0.0); // Black

  // Mix based on freshness
  vec3 finalColor = mix(colorB, colorA, fresnel);
  
  // Alpha control for "Glassy" atmosphere look
  float alpha = fresnel * 1.5;
  
  // Hard cut at bottom to simulate horizon if needed, or just let sphere curvature handle it
  gl_FragColor = vec4(finalColor, alpha);
}
`;

function Planet() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            // Subtle slow rotation
            meshRef.current.rotation.z += 0.0002;
            meshRef.current.rotation.x += 0.0001;
        }
    });

    const uniforms = useMemo(() => ({
        time: { value: 0 },
    }), []);

    return (
        <mesh
            ref={meshRef}
            position={[0, -12, 0]}
            rotation={[0.2, 0, 0]}
            scale={[14, 14, 14]}
        >
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
                side={THREE.FrontSide}
                transparent={true}
                blending={THREE.AdditiveBlending} // Additive blending makes it glow against black
                vertexShader={VERTEX_SHADER}
                fragmentShader={FRAGMENT_SHADER}
                uniforms={uniforms}
            />
        </mesh>
    );
}

function Stars() {
    const count = 500;
    const [positions] = useMemo(() => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 40; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 40; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 10; // z (behind everything)
        }
        return [positions];
    }, []);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#ffffff"
                transparent
                opacity={0.4}
                sizeAttenuation
            />
        </points>
    )
}

export function ThreeBackground() {
    return (
        <div className="absolute inset-0 z-0 bg-black">
            <Canvas
                camera={{ position: [0, 0, 10], fov: 45 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]} // Handle high-DPI screens
            >
                <color attach="background" args={['#000000']} />

                {/* Subtle Ambient Light (doesn't affect ShaderMaterial much but good practice) */}
                <ambientLight intensity={0.2} />

                {/* The Main Event: The Planet Horizon */}
                <Planet />

                {/* Deep Space Dust/Stars */}
                <Stars />

            </Canvas>

            {/* Overlay Gradient to blend the bottom seamlessly if needed */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
        </div>
    );
}
