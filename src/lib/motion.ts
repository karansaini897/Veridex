import type { Variants, Transition } from 'motion/react';

/**
 * MotionSites-inspired easing and spring physics for VERIDEX.
 * Tuned for responsive, polished entrances without sluggishness or abrupt jumps.
 */
export const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_CARD: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.75,
};

export const SPRING_MODAL: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 30,
  mass: 0.78,
};

export const SPRING_DRAWER: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 32,
  mass: 0.82,
};

/**
 * Staggered container for KPI strips, Bento grids, and dashboard card lists.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

/**
 * Individual dashboard card entrance (subtle vertical lift + scale + opacity).
 */
export const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: SMOOTH_EASE,
    },
  },
};

/**
 * Larger dashboard section / table panel entrance.
 */
export const sectionEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: SMOOTH_EASE,
    },
  },
};

/**
 * Modal / Dialog frosted backdrop fade.
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: SMOOTH_EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.16, ease: SMOOTH_EASE },
  },
};

/**
 * Centered modal window entrance & exit (spring-damped scale + vertical lift).
 */
export const modalWindowVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 14,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING_MODAL,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.16, ease: SMOOTH_EASE },
  },
};

/**
 * Right-hand slide-over drawer (Application Dossier & Document Inspector).
 */
export const slideOverDrawerVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 42,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING_DRAWER,
  },
  exit: {
    opacity: 0,
    x: 32,
    transition: { duration: 0.18, ease: SMOOTH_EASE },
  },
};

/**
 * Inline expandable panel / form modal inside a view or drawer.
 */
export const inlinePanelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -8,
    scale: 0.99,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: SMOOTH_EASE },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.99,
    transition: { duration: 0.16, ease: SMOOTH_EASE },
  },
};
