"use client";

import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { PresentationControls, Stage, useGLTF } from "@react-three/drei";

const StudioModel = () => {
  // Using a room/studio model placeholder
  const { scene } = useGLTF("https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/room/model.gltf");
  return <primitive object={scene} scale={0.5} position={[0, -1, 0]} />;
};

export const About = () => {
  return (
    <section id="artist" className="min-h-screen w-full relative flex flex-col md:flex-row items-center justify-between px-6 md:px-24 bg-space-black overflow-hidden py-20">
      {/* 3D Scene Container */}
      <div className="w-full md:w-1/2 h-[400px] md:h-[600px] relative">
        <Canvas shadows camera={{ position: [0, 0, 4], fov: 50 }}>
          <Suspense fallback={null}>
            <PresentationControls
              global
              config={{ mass: 2, tension: 500 }}
              snap={{ mass: 4, tension: 1500 }}
              rotation={[0, 0.3, 0]}
              polar={[-Math.PI / 3, Math.PI / 3]}
              azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
            >
              <Stage environment="city" intensity={0.5} contactShadow={false}>
                <StudioModel />
              </Stage>
            </PresentationControls>
          </Suspense>
        </Canvas>
      </div>

      {/* Bio Text */}
      <div className="w-full md:w-1/2 flex flex-col gap-8 z-10">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-sm uppercase tracking-[0.4em] text-gold mb-4 font-inter">The Artist</h2>
          <h3 className="text-5xl md:text-7xl font-playfair font-bold text-cream mb-6">
            Soul in every <br /> <span className="italic text-gold">Strum.</span>
          </h3>
          <p className="text-xl text-cream/70 leading-relaxed font-light max-w-xl">
            I am Harsh Ranjan. I don&apos;t just play guitar — I speak through it. 
            Every note is a conversation, every percussive tap a heartbeat. 
            Rooted in India, inspired by the world, I blend complex fingerstyle 
            techniques with deep musicality to create immersive soundscapes.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-cream/10">
          {[
            { label: "Views", value: "500K+" },
            { label: "Originals", value: "50+" },
            { label: "Students", value: "1000+" },
            { label: "Years", value: "10+" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <p className="text-3xl font-playfair font-bold text-gold">{stat.value}</p>
              <p className="text-sm uppercase tracking-widest text-cream/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
