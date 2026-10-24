import type { Variants, Transition } from 'motion/react';

/**
 * MotionSites-inspired easing and spring physics for VERIDEX.
 * Tuned for responsive, polished entrances without sluggishness or abrupt jumps.
 */
export const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_CARD: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 30,
  mass: 0.65,
};

export const SPRING_MODAL: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 29,
  mass: 0.68,
};

export const SPRING_DRAWER: Transition = {
  type: 'spring',
  stiffness: 410,
  damping: 30,
  mass: 0.7,
};

/**
 * Linux desktop window-inspired horizontal fold/expand spring for the dashboard sidebar.
 * Quick, crisp, and slightly springy without heavy bounce or layout jitter.
 */
export const SPRING_LINUX_SIDEBAR: Transition = {
  type: 'spring',
  stiffness: 680,
  damping: 48,
  mass: 0.42,
  restDelta: 1,
  restSpeed: 2,
};

export const REDUCED_MOTION_TRANSITION: Transition = {
  type: 'tween',
  duration: 0.001,
};


/**
 * Staggered container for KPI strips, Bento grids, and dashboard card lists.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.032,
      delayChildren: 0.01,
    },
  },
};

/**
 * Individual dashboard card entrance (subtle vertical lift + scale + opacity).
 */
export const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.988,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
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
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
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
    transition: { duration: 0.15, ease: SMOOTH_EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: SMOOTH_EASE },
  },
};

/**
 * Centered modal window entrance & exit (spring-damped scale + vertical lift).
 */
export const modalWindowVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 12,
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
    y: 6,
    transition: { duration: 0.12, ease: SMOOTH_EASE },
  },
};

/**
 * Right-hand slide-over drawer (Application Dossier & Document Inspector).
 */
export const slideOverDrawerVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 36,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING_DRAWER,
  },
  exit: {
    opacity: 0,
    x: 28,
    transition: { duration: 0.14, ease: SMOOTH_EASE },
  },
};

/**
 * Inline expandable panel / form modal inside a view or drawer.
 */
export const inlinePanelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -6,
    scale: 0.99,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: SMOOTH_EASE },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.99,
    transition: { duration: 0.12, ease: SMOOTH_EASE },
  },
};
