"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const albums = [
  { id: 1, title: "Fingerstyle Mastery", type: "Original", color: "#D4AF37", videoId: "123" },
  { id: 2, title: "Bollywood Soul", type: "Cover", color: "#C8511A", videoId: "456" },
  { id: 3, title: "Neo-Soul Vibes", type: "Original", color: "#6366F1", videoId: "789" },
  { id: 4, title: "Percussive Beats", type: "Technique", color: "#10B981", videoId: "012" },
];

export const Groove = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => setActiveIndex((prev) => (prev + 1) % albums.length);
  const prev = () => setActiveIndex((prev) => (prev - 1 + albums.length) % albums.length);

  return (
    <section id="groove" className="min-h-screen w-full bg-space-navy flex flex-col items-center justify-center py-20 px-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h2 className="text-sm uppercase tracking-[0.4em] text-gold mb-4 font-inter">The Groove</h2>
        <h3 className="text-4xl md:text-6xl font-playfair font-bold text-cream">Cinematic Soundscapes</h3>
      </motion.div>

      <div className="relative w-full max-w-5xl h-[500px] flex items-center justify-center">
        {/* Carousel Logic */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {albums.map((album, i) => {
              const distance = i - activeIndex;
              const isActive = i === activeIndex;
              const isVisible = Math.abs(distance) <= 1 || (i === 0 && activeIndex === albums.length - 1) || (i === albums.length - 1 && activeIndex === 0);

              if (!isVisible) return null;

              return (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, scale: 0.8, x: distance * 300 }}
                  animate={{ 
                    opacity: isActive ? 1 : 0.4, 
                    scale: isActive ? 1 : 0.8,
                    x: (distance === 0 ? 0 : distance > 0 ? 300 : -300),
                    zIndex: isActive ? 10 : 0
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute cursor-pointer group"
                  onClick={() => setActiveIndex(i)}
                >
                  <div className="relative aspect-square w-[300px] md:w-[400px] bg-zinc-900 rounded-lg overflow-hidden shadow-2xl border border-white/5">
                    {/* Vinyl Record Simulation */}
                    <motion.div 
                      className="absolute right-[-40%] top-1/2 -translate-y-1/2 w-[80%] aspect-square bg-[#111] rounded-full border-[10px] border-[#222] shadow-inner flex items-center justify-center overflow-hidden"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-1/3 h-1/3 rounded-full" style={{ backgroundColor: album.color }} />
                      <div className="absolute inset-0 bg-[repeating-radial-gradient(circle,transparent,transparent_2px,rgba(255,255,255,0.02)_3px)]" />
                    </motion.div>

                    {/* Album Art Placeholder */}
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 p-8 flex flex-col justify-end group-hover:scale-105 transition-transform duration-700">
                      <span className="text-[10px] uppercase tracking-widest text-gold mb-2">{album.type}</span>
                      <h4 className="text-2xl font-playfair font-bold text-cream mb-4">{album.title}</h4>
                      <button className="w-12 h-12 rounded-full border border-gold flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-space-black transition-all">
                        <Play fill="currentColor" size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4 z-20">
          <button onClick={prev} className="p-4 rounded-full border border-gold/20 text-gold hover:bg-gold/10 transition-colors">
            <ChevronLeft />
          </button>
          <button onClick={next} className="p-4 rounded-full border border-gold/20 text-gold hover:bg-gold/10 transition-colors">
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
};
