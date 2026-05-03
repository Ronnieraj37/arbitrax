"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const WORDS = [
  "Automate",
  "Scale",
  "Backtest",
  "Optimize",
  "Win",
];

export function HeroAnim() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative inline-block h-[1.2em] w-full min-w-[200px] overflow-hidden align-top">
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[index]}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.5, ease: "circOut" }}
          className="absolute left-0 inline-block w-full text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-indigo-600 font-bold"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
