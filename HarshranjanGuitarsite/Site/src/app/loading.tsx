"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[10000] bg-space-black flex flex-col items-center justify-center">
      <motion.div
        animate={{ 
          rotateY: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="w-24 h-24 mb-8"
      >
        {/* Guitar Pick SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full fill-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
          <path d="M50 0 L100 80 Q100 100 80 100 L20 100 Q0 100 0 80 Z" />
        </svg>
      </motion.div>
      
      <div className="flex flex-col items-center gap-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gold tracking-[0.5em] uppercase text-xs font-semibold"
        >
          Tuning up...
        </motion.p>
        <div className="w-48 h-[1px] bg-gold/20 relative mt-4">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="absolute top-0 left-0 h-full bg-gold shadow-[0_0_10px_#D4AF37]"
          />
        </div>
      </div>
    </div>
  );
}
