import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface AnimatedCTAProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}

export function AnimatedCTA({ children, className, delay = 0, once = false }: AnimatedCTAProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, scale: 0.92, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ scale: 1.04, y: -2, transition: { duration: 0.25, ease: "easeOut" } }}
      whileTap={{ scale: 0.97 }}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.div>
  );
}
