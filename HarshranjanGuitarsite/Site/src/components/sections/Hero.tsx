"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, Environment, ContactShadows, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

const GuitarModel = () => {
  // Using a realistic acoustic guitar model
  const { scene } = useGLTF("https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/acoustic-guitar/model.gltf");
  const guitarRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (guitarRef.current) {
      // Gentle rotation
      guitarRef.current.rotation.y += 0.005;
      // Mouse parallax
      const x = (state.mouse.x * Math.PI) / 10;
      const y = (state.mouse.y * Math.PI) / 15;
      guitarRef.current.rotation.x = THREE.MathUtils.lerp(guitarRef.current.rotation.x, y, 0.1);
      guitarRef.current.rotation.z = THREE.MathUtils.lerp(guitarRef.current.rotation.z, -x, 0.1);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <primitive 
        ref={guitarRef} 
        object={scene} 
        scale={2.5} 
        position={[0, -1, 0]} 
        rotation={[0, Math.PI / 4, 0]}
      />
    </Float>
  );
};

export const Hero = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-space-black">
      {/* 3D Background / Hero Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
          <color attach="background" args={["#0A0A0F"]} />
          <fog attach="fog" args={["#0A0A0F", 5, 15]} />
          
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#D4AF37" />
          
          <Suspense fallback={null}>
            <GuitarModel />
            <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
            <Environment preset="night" />
          </Suspense>
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <h1 className="text-6xl md:text-8xl font-playfair font-bold text-gradient-gold mb-4 tracking-tighter">
            HARSH RANJAN
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="text-lg md:text-xl text-cream/60 font-light tracking-[0.3em] uppercase"
          >
            Where Every String Tells a Story
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.5 }}
          className="mt-12"
        >
          <button className="group relative px-8 py-3 overflow-hidden rounded-full border border-gold/30 hover:border-gold transition-colors duration-500">
            <span className="relative z-10 text-gold uppercase tracking-widest text-sm font-semibold">Enter My Universe</span>
            <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="absolute inset-0 flex items-center justify-center text-space-black opacity-0 group-hover:opacity-100 transition-opacity duration-500 uppercase tracking-widest text-sm font-semibold">
              Enter Universe
            </span>
          </button>
        </motion.div>
      </div>

      {/* Particle Overlay (CSS for now, later Three.js) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
    </section>
  );
};
