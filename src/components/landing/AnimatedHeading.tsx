import type { ElementType, ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

type Variant = "default" | "cinematic";

interface AnimatedHeadingProps {
  as?: ElementType;
  text?: string;
  children?: ReactNode;
  className?: string;
  variant?: Variant;
  delay?: number;
  once?: boolean;
}

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: { delay: number; stagger: number }) => ({
    transition: {
      delayChildren: custom.delay,
      staggerChildren: custom.stagger,
    },
  }),
};

const wordVariantsDefault: Variants = {
  hidden: { y: "110%", opacity: 0, filter: "blur(8px)" },
  visible: {
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const wordVariantsCinematic: Variants = {
  hidden: {
    y: "120%",
    opacity: 0,
    filter: "blur(14px)",
    rotateX: -75,
    scale: 0.85,
  },
  visible: {
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    rotateX: 0,
    scale: 1,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

export function AnimatedHeading({
  as: Tag = "h2",
  text,
  children,
  className,
  variant = "default",
  delay = 0,
  once = false,
}: AnimatedHeadingProps) {
  const source = text ?? (typeof children === "string" ? children : "");
  const words = source.split(/\s+/).filter(Boolean);
  const wordVariants = variant === "cinematic" ? wordVariantsCinematic : wordVariantsDefault;
  const stagger = variant === "cinematic" ? 0.1 : 0.07;

  const MotionTag = motion(Tag);

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={containerVariants}
      custom={{ delay, stagger }}
      style={{ perspective: variant === "cinematic" ? 800 : undefined }}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
        >
          <motion.span
            variants={wordVariants}
            style={{ display: "inline-block", transformOrigin: "50% 100%" }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
