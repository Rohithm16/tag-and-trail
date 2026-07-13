import { motion, type Variants } from 'framer-motion';
import React, { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PresetType = 'fade' | 'slide' | 'scale' | 'blur' | 'blur-slide';

const presetVariants: Record<PresetType, { container: Variants; item: Variants }> = {
  fade: {
    container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } },
    item: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  },
  slide: {
    container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } },
    item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
  },
  scale: {
    container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } },
    item: { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } },
  },
  blur: {
    container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } },
    item: { hidden: { opacity: 0, filter: 'blur(4px)' }, visible: { opacity: 1, filter: 'blur(0px)' } },
  },
  'blur-slide': {
    container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } },
    item: { hidden: { opacity: 0, filter: 'blur(4px)', y: 20 }, visible: { opacity: 1, filter: 'blur(0px)', y: 0 } },
  },
};

interface AnimatedGroupProps {
  children: ReactNode;
  className?: string;
  variants?: { container?: Variants; item?: Variants };
  preset?: PresetType;
}

export function AnimatedGroup({ children, className, variants, preset = 'fade' }: AnimatedGroupProps) {
  const selected = preset ? presetVariants[preset] : presetVariants.fade;
  const containerVariants = variants?.container || selected.container;
  const itemVariants = variants?.item || selected.item;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className={cn(className)}>
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}