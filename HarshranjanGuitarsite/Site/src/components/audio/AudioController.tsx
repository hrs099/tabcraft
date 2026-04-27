"use client";

import React, { useState, useEffect } from "react";
import { Howl } from "howler";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

export const AudioController = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ambient, setAmbient] = useState<Howl | null>(null);

  useEffect(() => {
    // Placeholder guitar chord
    const sound = new Howl({
      src: ["https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"],
      loop: true,
      volume: 0.2,
    });

    setAmbient(sound);

    return () => {
      sound.stop();
      sound.unload();
    };
  }, []);

  const toggleAudio = () => {
    if (!ambient) return;
    if (isPlaying) {
      ambient.pause();
    } else {
      ambient.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed bottom-12 right-12 z-[1000] w-12 h-12 glassmorphism rounded-full flex items-center justify-center text-gold border border-gold/30 hover:border-gold transition-colors"
      onClick={toggleAudio}
    >
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
      
      {/* Visualizer bars */}
      <div className="absolute -top-8 flex items-end gap-[2px] h-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: isPlaying ? [4, 16, 8, 20, 4] : 2 }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              delay: i * 0.1,
              ease: "easeInOut"
            }}
            className="w-[2px] bg-gold/40"
          />
        ))}
      </div>
    </motion.button>
  );
};
