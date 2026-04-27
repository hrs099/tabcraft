"use client";

import React from "react";
import { motion } from "framer-motion";

const collaborators = [
  { name: "John Doe", role: "Percussionist", quote: "Harsh brings a level of complexity that is rare." },
  { name: "Jane Smith", role: "Vocalist", quote: "The way he layers sound is magical." },
  { name: "Alex Reed", role: "Producer", quote: "A true scientist of the six strings." },
  { name: "Sita Sharma", role: "Composer", quote: "Elegant soul in every single note." },
];

export const Collaborations = () => {
  return (
    <section id="collaborations" className="min-h-screen w-full bg-space-black relative py-20 px-6 overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="text-center mb-20 relative z-10"
      >
        <h2 className="text-sm uppercase tracking-[0.4em] text-gold mb-4 font-inter">The Constellation</h2>
        <h3 className="text-5xl md:text-8xl font-playfair font-bold text-cream">Collaborations</h3>
      </motion.div>

      <div className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 z-10">
        {collaborators.map((collab, i) => (
          <motion.div
            key={collab.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 glassmorphism rounded-3xl relative group"
          >
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-gold/10 rounded-full blur-xl group-hover:bg-gold/30 transition-colors" />
            <p className="text-xl italic text-cream/80 mb-6 leading-relaxed font-playfair">
              &quot;{collab.quote}&quot;
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-burnt-orange" />
              <div>
                <h4 className="font-bold text-cream tracking-wider">{collab.name}</h4>
                <p className="text-xs uppercase tracking-widest text-gold/60">{collab.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
