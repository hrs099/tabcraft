"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const skills = [
  { string: 1, name: "Natural Harmonics", level: "Expert", desc: "Crystal clear bells across the neck." },
  { string: 2, name: "Fingerpicking Patterns", level: "Advanced", desc: "Complex syncopation and independence." },
  { string: 3, name: "Chord Melody", level: "Pro", desc: "Interweaving bass, harmony and melody." },
  { string: 4, name: "Tapping Technique", level: "Master", desc: "Two-handed piano-like arrangements." },
  { string: 5, name: "Thumb Bass Picking", level: "Expert", desc: "Driving percussive low-end grooves." },
  { string: 6, name: "Percussive Body Hits", level: "Signature", desc: "Turning the guitar into a drum kit." },
];

export const Technique = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);

  return (
    <section id="technique" ref={containerRef} className="h-[200vh] bg-space-black relative overflow-hidden">
      <div className="sticky top-0 h-screen flex flex-col justify-center gap-12">
        <div className="px-6 md:px-24">
          <h2 className="text-sm uppercase tracking-[0.4em] text-gold mb-4 font-inter">The Technique</h2>
          <h3 className="text-4xl md:text-6xl font-playfair font-bold text-cream">Fingerstyle Anatomy</h3>
        </div>

        {/* Fretboard Container */}
        <div className="relative w-full overflow-visible">
          <motion.div 
            style={{ x }}
            className="flex items-center gap-0 w-[300vw]"
          >
            {/* Massive Fretboard Drawing */}
            <div className="relative h-[400px] w-full flex">
              {/* Wood Texture Background */}
              <div className="absolute inset-0 bg-[#1a0f0a] opacity-80" />
              
              {/* Strings */}
              <div className="absolute inset-0 flex flex-col justify-between py-12 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[2px] w-full bg-gradient-to-r from-gold/40 via-gold/10 to-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                ))}
              </div>

              {/* Frets */}
              {[...Array(24)].map((_, i) => (
                <div 
                  key={i} 
                  className="relative group h-full border-r border-gold/20 flex-1 min-w-[150px] flex items-center justify-center"
                >
                  <span className="absolute bottom-4 left-4 text-[10px] text-gold/30 font-mono">{i + 1}</span>
                  
                  {/* Skill Tag on specific "frets" (mapped to strings) */}
                  {skills[i % skills.length] && (
                    <motion.div
                      whileHover={{ scale: 1.1, y: -10 }}
                      className="absolute z-10 p-6 glassmorphism rounded-xl border border-gold/30 cursor-pointer group-hover:border-gold transition-colors w-64"
                    >
                      <span className="text-[10px] text-gold uppercase tracking-widest block mb-1">String {skills[i % skills.length].string}</span>
                      <h4 className="text-lg font-bold text-cream mb-2 font-inter">{skills[i % skills.length].name}</h4>
                      <p className="text-xs text-cream/50">{skills[i % skills.length].desc}</p>
                      
                      {/* Interaction Glow */}
                      <div className="absolute -inset-1 bg-gold/5 blur-xl group-hover:bg-gold/20 transition-colors -z-10 rounded-full" />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
