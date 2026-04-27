"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X } from "lucide-react";

const performances = [
  { id: 1, title: "Live at Mahindra Blues", thumbnail: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80", tag: "LIVE" },
  { id: 2, title: "Studio Sessions: originals", thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80", tag: "STUDIO" },
  { id: 3, title: "TEDx Performance", thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80", tag: "LIVE" },
];

export const Stage = () => {
  const [selectedVideo, setSelectedVideo] = useState<null | number>(null);

  return (
    <section id="stage" className="min-h-screen w-full bg-space-black relative py-20 px-6 overflow-hidden">
      {/* Background Concert Ambience */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gold/20 blur-sm" />
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gold/20 blur-sm" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,81,26,0.1)_0%,transparent_50%)]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="text-center mb-20"
        >
          <h2 className="text-sm uppercase tracking-[0.4em] text-gold mb-4 font-inter">The Stage</h2>
          <h3 className="text-5xl md:text-8xl font-playfair font-bold text-cream">Live Energy</h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {performances.map((perf, i) => (
            <motion.div
              key={perf.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => setSelectedVideo(perf.id)}
            >
              <img 
                src={perf.thumbnail} 
                alt={perf.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-space-black via-transparent to-transparent opacity-80" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <span className="self-start px-3 py-1 rounded-full border border-gold/40 text-[10px] text-gold tracking-widest">{perf.tag}</span>
                
                <div>
                  <h4 className="text-2xl font-playfair font-bold text-cream mb-4">{perf.title}</h4>
                  <div className="flex items-center gap-3 text-gold">
                    <div className="w-10 h-10 rounded-full border border-gold flex items-center justify-center">
                      <Play size={16} fill="currentColor" />
                    </div>
                    <span className="text-sm uppercase tracking-widest font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Watch Now</span>
                  </div>
                </div>
              </div>

              {/* Spotlight Effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(212,175,55,0.1)_0%,transparent_50%)] opacity-0 group-hover:opacity-100 mix-blend-screen pointer-events-none transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-20 bg-space-black/95 backdrop-blur-xl"
          >
            <button 
              className="absolute top-8 right-8 text-cream/70 hover:text-gold transition-colors"
              onClick={() => setSelectedVideo(null)}
            >
              <X size={32} />
            </button>
            <div className="w-full max-w-6xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5">
              <div className="w-full h-full flex items-center justify-center">
                {/* YouTube Embed Placeholder */}
                <span className="text-gold/50 font-playfair italic">Performance Video Playing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
