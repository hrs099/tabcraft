"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, Instagram, Youtube, Mail } from "lucide-react";

export const Contact = () => {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    // Simulate paper airplane launch soon
  };

  return (
    <section id="contact" className="min-h-screen w-full bg-space-black relative flex items-center justify-center py-20 px-6 overflow-hidden">
      {/* 3D Background Vibes */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-burnt-orange/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="max-w-4xl w-full relative z-10 glassmorphism p-8 md:p-16 rounded-[2rem] border border-gold/10">
        <div className="text-center mb-12">
          <h2 className="text-sm uppercase tracking-[0.4em] text-gold mb-4 font-inter">Send A Note</h2>
          <h3 className="text-4xl md:text-6xl font-playfair font-bold text-cream">Let&apos;s Create Magic</h3>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-gold/60 font-semibold ml-2">Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name"
                  className="bg-transparent border-b border-gold/20 focus:border-gold py-3 px-2 text-cream outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-gold/60 font-semibold ml-2">Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@email.com"
                  className="bg-transparent border-b border-gold/20 focus:border-gold py-3 px-2 text-cream outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-gold/60 font-semibold ml-2">Message</label>
              <textarea 
                required
                rows={4}
                placeholder="What music are we making?"
                className="bg-transparent border-b border-gold/20 focus:border-gold py-3 px-2 text-cream outline-none transition-colors resize-none"
              />
            </div>

            <button 
              type="submit"
              className="group h-16 relative flex items-center justify-center gap-3 bg-gold text-space-black rounded-xl overflow-hidden font-bold uppercase tracking-widest transition-transform active:scale-95"
            >
              <span className="relative z-10">Launch Message</span>
              <Send size={18} className="relative z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
              <div className="absolute inset-0 bg-cream translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </button>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Send size={40} className="text-gold" />
            </div>
            <h4 className="text-3xl font-playfair font-bold text-cream mb-4">Message Launched!</h4>
            <p className="text-cream/60">The paper airplane is in the air. Harsh will reply to you soon.</p>
            <button 
              onClick={() => setIsSent(false)}
              className="mt-8 text-gold border-b border-gold/30 hover:border-gold transition-colors pb-1 uppercase tracking-widest text-xs"
            >
              Send another note
            </button>
          </motion.div>
        )}

        {/* Social Bar */}
        <div className="mt-20 flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-12 border-t border-gold/10">
          <a href="#" className="flex items-center gap-3 text-cream/40 hover:text-gold transition-colors">
            <Instagram size={20} />
            <span className="text-xs uppercase tracking-widest">Instagram</span>
          </a>
          <a href="#" className="flex items-center gap-3 text-cream/40 hover:text-gold transition-colors">
            <Youtube size={20} />
            <span className="text-xs uppercase tracking-widest">YouTube</span>
          </a>
          <a href="#" className="flex items-center gap-3 text-cream/40 hover:text-gold transition-colors">
            <Mail size={20} />
            <span className="text-xs uppercase tracking-widest">Email</span>
          </a>
        </div>
      </div>

      <footer className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center w-full px-6">
        <p className="text-[10px] uppercase tracking-[0.5em] text-cream/20">
          Harsh Ranjan © 2025 • Crafted with Six Strings & Code
        </p>
      </footer>
    </section>
  );
};
