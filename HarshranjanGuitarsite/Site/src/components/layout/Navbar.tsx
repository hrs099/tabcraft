"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Menu, X, Instagram, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "The Artist", href: "#artist" },
  { name: "The Groove", href: "#groove" },
  { name: "The Technique", href: "#technique" },
  { name: "The Stage", href: "#stage" },
  { name: "Send A Note", href: "#contact" },
];

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 w-full z-[1000] transition-all duration-500 px-6 md:px-12 py-4",
        isScrolled ? "glassmorphism py-3" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="relative">
            <span className="text-2xl font-playfair font-bold text-gold">HR</span>
            <motion.div 
              className="absolute -bottom-1 left-0 w-full h-[1px] bg-gold"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="hidden md:block text-sm tracking-widest text-cream/70 uppercase">Harsh Ranjan</span>
        </motion.div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.name}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-sm font-medium text-cream/80 hover:text-gold transition-colors duration-300 uppercase tracking-wider"
            >
              {link.name}
            </motion.a>
          ))}
          
          <div className="flex items-center gap-4 ml-4 border-l border-cream/10 pl-8">
            <a href="https://instagram.com/groovethestrings" target="_blank" className="hover:text-gold transition-colors">
              <Instagram size={18} />
            </a>
            <a href="https://youtube.com/@harshsranjan" target="_blank" className="hover:text-gold transition-colors">
              <Youtube size={18} />
            </a>
          </div>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-cream p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glassmorphism mt-4 rounded-xl overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-playfair text-cream hover:text-gold transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
