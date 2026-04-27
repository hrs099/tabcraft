"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 400 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };

    const handleHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsHovering(!!target.closest("button, a, .interactive"));
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleHover);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleHover);
    };
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cursorRef}
      className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[9999] flex items-center justify-center"
      style={{
        x: cursorX,
        y: cursorY,
      }}
    >
      {/* Outer Glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gold/20 blur-md"
        animate={{
          scale: isHovering ? 2 : 1,
          opacity: isHovering ? 0.6 : 0.4,
        }}
      />
      
      {/* Core Pick Shape (simplified as a triangle-ish for now) */}
      <motion.div
        className="w-4 h-4 bg-gold shadow-[0_0_15px_rgba(212,175,55,0.8)]"
        animate={{
          rotate: [0, 10, -10, 0],
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" },
          scale: { duration: 0.2 }
        }}
        style={{
          clipPath: "polygon(50% 0%, 100% 80%, 80% 100%, 20% 100%, 0% 80%)"
        }}
      />

      {/* Particle Trail (Simplified for performance) */}
      <div className="absolute w-1 h-1 bg-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};
