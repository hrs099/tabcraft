'use client';

import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll, Scroll, Environment, SpotLight, Sparkles, PerformanceMonitor, Html } from '@react-three/drei';
import * as THREE from 'three';

// --------------------------------------------------------
// THE CAMERA RIG
// --------------------------------------------------------
function CameraRig() {
  const scroll = useScroll();
  const cameraTarget = useRef(new THREE.Vector3(0, 0, 0));
  const chamberLight = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const r = scroll.offset;
    let camZ = 7, camY = 0, camX = 0, targetX = 0, targetY = -0.5, targetZ = 0;

    if (r <= 0.10) { camZ = 7; targetZ = 0; }
    else if (r > 0.10 && r <= 0.25) {
      const ease = Math.pow((r - 0.10) / 0.15, 3);
      camZ = THREE.MathUtils.lerp(7, -4, ease);
      camY = THREE.MathUtils.lerp(0, -0.5, ease);
      targetZ = -10;
      if (chamberLight.current) chamberLight.current.intensity = ease * 4;
    }
    else if (r > 0.25 && r <= 0.45) { 
      const p = (r - 0.25) / 0.20;
      camZ = THREE.MathUtils.lerp(-4, -15, p);
      camY = THREE.MathUtils.lerp(-0.5, 1.5, p);
      targetZ = -20; targetY = 1.5;
      if (chamberLight.current) chamberLight.current.intensity = 4;
    }
    else if (r > 0.45 && r <= 0.60) {
      const p = (r - 0.45) / 0.15;
      camX = Math.sin(p * Math.PI) * 6; 
      camZ = THREE.MathUtils.lerp(-15, -5, p); 
      camY = 1.5;
      targetX = Math.sin(p * Math.PI) * 12; 
      targetZ = THREE.MathUtils.lerp(-20, 10, p); 
      targetY = THREE.MathUtils.lerp(1.5, -1, p);
      if (chamberLight.current) chamberLight.current.intensity = 4 - (p * 4);
    }
    else if (r > 0.60 && r <= 0.85) {
      const p = (r - 0.60) / 0.25;
      camZ = THREE.MathUtils.lerp(-5, 30, p);
      camY = THREE.MathUtils.lerp(1.5, -1, p);
      targetZ = camZ + 10;
      targetY = -1;
    }
    else { 
      // Settle phase - ease into the constellation slowly
      const p = Math.min((r - 0.85) / 0.15, 1);
      const easeOut = 1 - Math.pow(1 - p, 3);
      camZ = THREE.MathUtils.lerp(30, 31, easeOut); 
      camY = THREE.MathUtils.lerp(-1, -0.5, easeOut); 
      targetZ = 35; 
      targetY = 0;
    }

    state.camera.position.set(camX, camY, camZ);
    cameraTarget.current.set(targetX, targetY, targetZ);
    state.camera.lookAt(cameraTarget.current);
  });
  
  return (
    <pointLight ref={chamberLight} position={[0, -0.5, -4]} color="#ff7b00" distance={10} intensity={0} castShadow />
  );
}

// --------------------------------------------------------
// INTERACTIVE NAVIGATION NODE
// --------------------------------------------------------
function NavNode({ position, rotation, label, href, activeNode, setActiveNode, children }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const isHovered = activeNode === label;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Natural floating physics
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.1;
      
      if (isHovered) {
        meshRef.current.rotation.y += 0.02;
        meshRef.current.rotation.x += 0.01;
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.2, 0.1));
      } else {
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.0, 0.1));
      }
    }
  });

  return (
    <group position={position} rotation={rotation} ref={meshRef}>
      {children}
      <Html center zIndexRange={[100, 0]}>
        <div className="flex flex-col items-center justify-center relative w-32 h-32">
          {/* Accessible, visually hidden interactive trigger */}
          <button 
            className="w-16 h-16 rounded-full focus:outline-none focus:ring-2 focus:ring-[#c29b7a] absolute cursor-pointer bg-transparent border-none"
            onMouseEnter={() => setActiveNode(label)}
            onMouseLeave={() => setActiveNode(null)}
            onFocus={() => setActiveNode(label)}
            onBlur={() => setActiveNode(null)}
            onClick={() => console.log(`Navigating to ${href}`)}
            aria-label={`Navigate to ${label}`}
          />
          {/* Floating Label */}
          <span className={`absolute bottom-4 font-inter text-[10px] tracking-[0.2em] uppercase transition-all duration-300 pointer-events-none drop-shadow-md ${isHovered ? 'opacity-100 text-[#ffebd6] translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {label}
          </span>
        </div>
      </Html>
    </group>
  );
}

// --------------------------------------------------------
// HIGH-END 3D ARCHITECTURE
// --------------------------------------------------------
function AcousticEnvironment({ tier }: { tier: 'high' | 'low' }) {
  const topPlateShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 3.5);
    shape.bezierCurveTo(2.5, 3.5, 2.5, 1, 2.0, 0);
    shape.bezierCurveTo(1.6, -1, 3.2, -2, 2.8, -4.5);
    shape.bezierCurveTo(1.5, -5.5, -1.5, -5.5, -2.8, -4.5);
    shape.bezierCurveTo(-3.2, -2, -1.6, -1, -2.0, 0);
    shape.bezierCurveTo(-2.5, 1, -2.5, 3.5, 0, 3.5);
    const hole = new THREE.Path();
    hole.absarc(0, -0.5, 0.85, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return shape;
  }, []);

  const enableShadows = tier === 'high';
  const [activeNode, setActiveNode] = useState<string | null>(null);

  return (
    <group>
      <mesh position={[0, 0, 0]} castShadow={enableShadows} receiveShadow={enableShadows}>
        <extrudeGeometry args={[topPlateShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.03 }]} />
        <meshStandardMaterial color="#3a1f10" roughness={0.85} metalness={0.05} />
      </mesh>
      
      <mesh position={[0, -0.5, 0.16]} receiveShadow={enableShadows}>
        <ringGeometry args={[0.88, 1.0, 64]} />
        <meshStandardMaterial color="#b38a5e" roughness={0.7} />
      </mesh>

      <mesh position={[0, -0.5, -12]} rotation={[Math.PI / 2, 0, 0]} receiveShadow={enableShadows}>
        <cylinderGeometry args={[5, 5, 24, 64, 1, true]} />
        <meshStandardMaterial color="#140703" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      
      {[-4, -8, -12, -16].map((z, i) => (
        <group key={z} position={[0, -5, z]}>
          <mesh receiveShadow={enableShadows} castShadow={enableShadows}>
            <boxGeometry args={[10, 0.4, 0.6]} />
            <meshStandardMaterial color="#2b1408" roughness={0.9} />
          </mesh>
          <pointLight position={[-3 + (i % 2) * 6, 1, 0]} color="#d48b55" intensity={0.2} distance={3} />
        </group>
      ))}

      {[-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].map((x, i) => (
        <mesh key={i} position={[x, -0.5, 15]} rotation={[Math.PI / 2, 0, 0]} castShadow={enableShadows} receiveShadow={enableShadows}>
          <cylinderGeometry args={[0.005 + (i > 2 ? 0 : 0.006), 0.005 + (i > 2 ? 0 : 0.006), 32]} />
          <meshStandardMaterial color={i < 3 ? "#a6824a" : "#d1d1d1"} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* --- SCENE 5: THE NAVIGATIONAL CONSTELLATION --- */}
      <group position={[0, 0, 35]}>
        {/* Brass Pick -> Media */}
        <NavNode label="Media" href="/media" position={[-2, 1.5, 0]} rotation={[0.5, 1, 0]} activeNode={activeNode} setActiveNode={setActiveNode}>
          <mesh castShadow={enableShadows} receiveShadow={enableShadows}>
            <cylinderGeometry args={[0.5, 0.05, 0.05, 3]} />
            <meshStandardMaterial color="#c2944f" metalness={0.9} roughness={0.2} emissive={activeNode === 'Media' ? '#c2944f' : '#000'} emissiveIntensity={0.4} />
          </mesh>
        </NavNode>

        {/* Carbon Capo -> Projects */}
        <NavNode label="Projects" href="/projects" position={[2.5, 1, -1]} rotation={[-0.4, -0.8, 0]} activeNode={activeNode} setActiveNode={setActiveNode}>
          <mesh castShadow={enableShadows} receiveShadow={enableShadows}>
            <boxGeometry args={[1.2, 0.2, 0.4]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.8} emissive={activeNode === 'Projects' ? '#333' : '#000'} emissiveIntensity={0.8} />
          </mesh>
        </NavNode>

        {/* Coiled String -> Gear */}
        <NavNode label="Gear" href="/gear" position={[-2.5, -1, -1]} rotation={[1, 0.5, 0]} activeNode={activeNode} setActiveNode={setActiveNode}>
          <mesh castShadow={enableShadows} receiveShadow={enableShadows}>
            <torusGeometry args={[0.6, 0.02, 16, 100]} />
            <meshStandardMaterial color="#a6824a" metalness={0.85} roughness={0.3} emissive={activeNode === 'Gear' ? '#a6824a' : '#000'} emissiveIntensity={0.4} />
          </mesh>
        </NavNode>

        {/* Tuner -> About */}
        <NavNode label="About" href="/about" position={[1.5, -1.5, 1]} rotation={[0, 0.5, 0.2]} activeNode={activeNode} setActiveNode={setActiveNode}>
          <mesh castShadow={enableShadows} receiveShadow={enableShadows}>
            <boxGeometry args={[0.6, 0.8, 0.2]} />
            <meshStandardMaterial color="#444" metalness={0.6} roughness={0.5} emissive={activeNode === 'About' ? '#444' : '#000'} emissiveIntensity={0.4} />
            {/* Tuner Screen Glow */}
            <mesh position={[0, 0, 0.11]}>
              <planeGeometry args={[0.4, 0.4]} />
              <meshBasicMaterial color={activeNode === 'About' ? "#4ade80" : "#050201"} />
            </mesh>
          </mesh>
        </NavNode>

        {/* Slide -> Contact */}
        <NavNode label="Contact" href="/contact" position={[0, 2, 1]} rotation={[1.5, 0, 0]} activeNode={activeNode} setActiveNode={setActiveNode}>
          <mesh castShadow={enableShadows} receiveShadow={enableShadows}>
            <cylinderGeometry args={[0.2, 0.2, 1.2, 32, 1, true]} />
            <meshStandardMaterial color="#e0e0e0" metalness={1} roughness={0.1} side={THREE.DoubleSide} emissive={activeNode === 'Contact' ? '#fff' : '#000'} emissiveIntensity={0.2} transparent opacity={0.8} />
          </mesh>
        </NavNode>
      </group>
    </group>
  );
}

// --------------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------------
export default function Home() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dpr, setDpr] = useState(1.5);
  const [tier, setTier] = useState<'high' | 'low'>('high');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
  }, []);

  return (
    <main className="relative w-full h-screen bg-[#050201] text-[#e8dcc7] overflow-hidden">
      <div className="fixed top-8 right-8 z-50 pointer-events-auto">
        <button className="px-6 py-3 border border-[#c29b7a]/30 text-[#c29b7a] text-xs tracking-widest uppercase hover:bg-[#c29b7a]/10 transition-colors bg-[#050201]/50 backdrop-blur-sm">
          View Project
        </button>
      </div>

      {reducedMotion ? (
        <div className="absolute inset-0 z-10 overflow-y-auto w-full pointer-events-auto custom-scrollbar bg-[#050201]">
           <div className="h-full p-12 md:p-24 flex flex-col gap-32">
             <section>
               <h1 className="text-5xl md:text-7xl font-playfair mb-4 leading-tight">Harsh <br/> Ranjan.</h1>
               <p className="text-lg md:text-xl font-inter text-[#c29b7a] font-light max-w-md">India's most immersive fingerstyle guitarist.</p>
             </section>
             <section>
               <h2 className="text-4xl md:text-6xl font-playfair mb-6 text-[#ffebd6]">The Architecture <br/> of Sound.</h2>
               <p className="text-md md:text-lg font-inter text-[#e8dcc7]/80 leading-relaxed max-w-md">Every tap, harmonic, and struck wood creates a percussive identity. You are not just hearing strings; you are inside the instrument.</p>
             </section>
             <section>
               <h2 className="text-4xl md:text-6xl font-playfair mb-6 text-[#ffebd6]">Technique <br/><span className="text-[#c29b7a] italic">& Legacy.</span></h2>
               <p className="text-md md:text-lg font-inter text-[#e8dcc7]/80 leading-relaxed max-w-md">Six strings equal a perimeter for an orchestra. Rhythmic architecture separating bass, melody, and percussion.</p>
             </section>
             {/* REDUCED MOTION NAV FALLBACK */}
             <section className="pt-24 border-t border-[#c29b7a]/20">
               <h2 className="text-3xl font-playfair mb-8 text-[#c29b7a]">Explore</h2>
               <nav className="flex flex-col gap-6">
                 {[
                   { label: "Media", path: "/media", desc: "Performances & Audio" },
                   { label: "Projects", path: "/projects", desc: "Discography & Collaborations" },
                   { label: "About", path: "/about", desc: "Story & Philosophy" },
                   { label: "Gear", path: "/gear", desc: "Instruments & Setup" },
                   { label: "Contact", path: "/contact", desc: "Booking & Press" }
                 ].map(link => (
                   <a key={link.label} href={link.path} className="group flex items-baseline gap-4 w-fit">
                     <span className="text-2xl font-inter text-[#ffebd6] group-hover:text-[#c29b7a] transition-colors">{link.label}</span>
                     <span className="text-sm font-inter text-[#e8dcc7]/40 uppercase tracking-widest">{link.desc}</span>
                   </a>
                 ))}
               </nav>
             </section>
           </div>
        </div>
      ) : (
        <Canvas shadows={tier === 'high'} dpr={dpr} camera={{ position: [0, 0, 7], fov: 35 }}>
          <PerformanceMonitor onDecline={() => { setDpr(1); setTier('low'); }} onIncline={() => { setDpr(1.5); setTier('high'); }} />
          
          <color attach="background" args={['#050201']} />
          <fog attach="fog" args={['#050201', 6, 20]} />
          <ambientLight intensity={0.03} color="#4a2e1b" />
          
          <SpotLight position={[4, 6, 8]} angle={0.4} penumbra={1} intensity={3.5} color="#ffebd6" castShadow={tier === 'high'} shadow-bias={-0.0001} />
          <Environment preset="studio" environmentIntensity={0.15} />

          <ScrollControls pages={25} damping={0.12}>
            <Suspense fallback={null}>
              <CameraRig />
              <AcousticEnvironment tier={tier} />
              {tier === 'high' && <Sparkles count={150} scale={40} size={1.5} speed={0.1} opacity={0.15} color="#d4b595" />}
            </Suspense>

            <Scroll html style={{ width: '100vw', height: '100vh' }}>
              <div className="w-full relative h-[2500vh]">
                <section className="absolute top-[2vh] left-[5vw] w-[90vw] md:w-[40vw] flex flex-col justify-center h-[30vh]">
                  <h1 className="text-5xl md:text-7xl font-playfair mb-4 leading-tight drop-shadow-xl text-[#F5F0E8]">Harsh <br/> Ranjan.</h1>
                  <p className="text-lg md:text-xl font-inter text-[#c29b7a] font-light max-w-md drop-shadow-md">India's most immersive fingerstyle guitarist.</p>
                </section>

                <section className="absolute top-[350vh] right-[10vw] w-[90vw] md:w-[35vw] flex flex-col justify-center h-[40vh]">
                  <h2 className="text-4xl md:text-6xl font-playfair mb-6 text-[#ffebd6] drop-shadow-xl">The Architecture <br/> of Sound.</h2>
                  <p className="text-md md:text-lg font-inter text-[#e8dcc7]/90 leading-relaxed max-w-md drop-shadow-md">
                    Every tap, harmonic, and struck wood creates a percussive identity. You are not just hearing strings; you are inside the instrument.
                  </p>
                </section>

                <section className="absolute top-[1800vh] left-[10vw] w-[90vw] md:w-[30vw] flex flex-col justify-center h-[50vh]">
                  <h2 className="text-4xl md:text-6xl font-playfair mb-6 text-[#ffebd6] drop-shadow-xl">Technique <br/><span className="text-[#c29b7a] italic">& Legacy.</span></h2>
                  <p className="text-md md:text-lg font-inter text-[#e8dcc7]/90 leading-relaxed max-w-md drop-shadow-md">
                    Six strings equal a perimeter for an orchestra. Rhythmic architecture separating bass, melody, and percussion in complete independence.
                  </p>
                </section>
                
                {/* Scroll hint to guide user into the constellation */}
                <div className="absolute top-[2100vh] w-full flex justify-center opacity-50 font-inter text-xs tracking-widest text-[#c29b7a]">
                  Scroll to explore
                </div>
              </div>
            </Scroll>
          </ScrollControls>
        </Canvas>
      )}
    </main>
  );
}
