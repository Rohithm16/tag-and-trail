import { useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useMotionTemplate, useAnimationFrame, type MotionValue } from "framer-motion";

const GridPatternCard = ({ offsetX, offsetY }: { offsetX: MotionValue<number>; offsetY: MotionValue<number> }) => (
  <svg className="w-full h-full">
    <defs>
      <motion.pattern
        id="grid-pattern-card"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
        x={offsetX}
        y={offsetY}
      >
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-400" />
      </motion.pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern-card)" />
  </svg>
);

export function GridCardBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);
  const speedX = 0.5;
  const speedY = 0.5;

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + speedX) % 40);
    gridOffsetY.set((gridOffsetY.get() + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl"
    >
      <div className="absolute inset-0 z-0 opacity-[0.05]">
        <GridPatternCard offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      <motion.div
        className="absolute inset-0 z-0 opacity-40"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPatternCard offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>
    </div>
  );
}