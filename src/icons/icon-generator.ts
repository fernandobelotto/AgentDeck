import type { ClaudeState } from "../server/types.js";

type AnimationType = 'none' | 'orbit' | 'ripple' | 'float' | 'pulse' | 'wave';

interface StateConfig {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  icon: string;
  animationType: AnimationType;
  animationFrames: number;
  label: string;
}

const STATE_CONFIGS: Record<ClaudeState, StateConfig> = {
  idle: {
    primaryColor: "#34D399",
    secondaryColor: "#10B981",
    glowColor: "#34D39940",
    icon: "check",
    animationType: 'none',
    animationFrames: 1,
    label: "Ready"
  },
  running: {
    primaryColor: "#60A5FA",
    secondaryColor: "#3B82F6",
    glowColor: "#60A5FA50",
    icon: "loader",
    animationType: 'orbit',
    animationFrames: 96,  // 8 seconds at 12fps
    label: "Running"
  },
  tool_use: {
    primaryColor: "#FBBF24",
    secondaryColor: "#F59E0B",
    glowColor: "#FBBF2450",
    icon: "wrench",
    animationType: 'ripple',
    animationFrames: 72,  // 6 seconds at 12fps
    label: "Tool"
  },
  editing: {
    primaryColor: "#A78BFA",
    secondaryColor: "#8B5CF6",
    glowColor: "#A78BFA50",
    icon: "pencil",
    animationType: 'float',
    animationFrames: 84,  // 7 seconds at 12fps
    label: "Edit"
  },
  question: {
    primaryColor: "#22D3EE",
    secondaryColor: "#06B6D4",
    glowColor: "#22D3EE60",
    icon: "help",
    animationType: 'pulse',
    animationFrames: 48,  // 4 seconds at 12fps
    label: "Input"
  },
  permission: {
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
    glowColor: "#F8717170",
    icon: "shield",
    animationType: 'wave',
    animationFrames: 60,  // 5 seconds at 12fps
    label: "Approve?"
  },
  error: {
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
    glowColor: "#F8717140",
    icon: "alert",
    animationType: 'none',
    animationFrames: 1,
    label: "Error"
  },
  disconnected: {
    primaryColor: "#6B7280",
    secondaryColor: "#4B5563",
    glowColor: "#6B728030",
    icon: "unplug",
    animationType: 'none',
    animationFrames: 1,
    label: "Offline"
  }
};

// Lucide icon paths (24x24 viewBox, scaled to fit)
const LUCIDE_ICONS: Record<string, string> = {
  check: `
    <circle cx="0" cy="0" r="28" stroke="currentColor" stroke-width="2.5" fill="none" opacity="0.3"/>
    <path d="M-12 0 L-4 8 L12 -8" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  loader: `
    <path d="M0 -24 A24 24 0 0 1 20.78 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>`,

  wrench: `
    <path d="M8.4 3.8a.6.6 0 0 0 0 .84l.96.96a.6.6 0 0 0 .84 0l1.86-1.86c.19-.19.52-.13.59.13a3.6 3.6 0 0 1-4.96 4.23l-4.74 4.75a.6.6 0 0 1-1.8-1.8l4.75-4.74a3.6 3.6 0 0 1 4.23-4.96c.26.07.33.4.13.59z"
          transform="scale(2.8) translate(-7.2, -7.2)"
          stroke="currentColor" stroke-width="0.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  pencil: `
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
          transform="scale(2.2) translate(-12, -12)"
          stroke="currentColor" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m15 5 4 4" transform="scale(2.2) translate(-12, -12)" stroke="currentColor" stroke-width="0.9" fill="none" stroke-linecap="round"/>`,

  help: `
    <circle cx="0" cy="0" r="28" stroke="currentColor" stroke-width="2.5" fill="none" opacity="0.3"/>
    <path d="M-6 -8 Q-6 -14 0 -14 Q6 -14 6 -8 Q6 -2 0 -2 L0 4"
          stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="0" cy="12" r="1.5" fill="currentColor"/>`,

  shield: `
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          transform="scale(2.5) translate(-12, -12)"
          stroke="currentColor" stroke-width="0.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="0" y1="-8" x2="0" y2="2" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="10" r="1.8" fill="currentColor"/>`,

  alert: `
    <circle cx="0" cy="0" r="28" stroke="currentColor" stroke-width="2.5" fill="none" opacity="0.3"/>
    <line x1="0" y1="-12" x2="0" y2="2" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="0" cy="12" r="2" fill="currentColor"/>`,

  unplug: `
    <path d="m19 5 3-3" transform="scale(2) translate(-12, -12)" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="m2 22 3-3" transform="scale(2) translate(-12, -12)" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"
          transform="scale(2) translate(-12, -12)" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"
          transform="scale(2) translate(-12, -12)" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
};

/**
 * Generates dynamic SVG icons with particle animations for Claude Code states
 */
export class IconGenerator {
  private static readonly SIZE = 144;
  private static readonly CENTER = 72;

  /**
   * Easing function for smooth animations
   */
  private static easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  /**
   * Generate orbiting particles animation - calm, slow orbit
   */
  private static generateOrbitParticles(frame: number, totalFrames: number, color: string): string {
    const particles: string[] = [];
    const numParticles = 3;  // Fewer particles
    const orbitRadius = 42;

    for (let i = 0; i < numParticles; i++) {
      const baseAngle = (i / numParticles) * Math.PI * 2;
      const animProgress = frame / totalFrames;
      const angle = baseAngle + animProgress * Math.PI * 2;

      // Gentle size breathing
      const size = 3.5 + Math.sin(animProgress * Math.PI * 2 + i) * 0.5;
      // Stable opacity with gentle variation
      const opacity = 0.5 + Math.sin(animProgress * Math.PI * 2 + i * 0.8) * 0.15;

      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;

      particles.push(`<circle cx="${x}" cy="${y}" r="${size.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`);
    }

    // Soft glow ring behind particles
    const glowOpacity = 0.08 + Math.sin((frame / totalFrames) * Math.PI * 2) * 0.04;
    particles.unshift(`<circle cx="0" cy="0" r="${orbitRadius}" stroke="${color}" stroke-width="8" fill="none" opacity="${glowOpacity.toFixed(2)}"/>`);

    return particles.join('\n    ');
  }

  /**
   * Generate expanding ripple animation - slow, gentle waves
   */
  private static generateRipples(frame: number, totalFrames: number, color: string): string {
    const ripples: string[] = [];
    const numRipples = 2;  // Fewer ripples

    for (let i = 0; i < numRipples; i++) {
      const offset = i / numRipples;
      const progress = ((frame / totalFrames) + offset) % 1;
      const eased = this.easeInOutSine(progress);

      const radius = 25 + eased * 30;
      const opacity = (1 - eased) * 0.25;  // More subtle
      const strokeWidth = 3 - eased * 2;

      if (opacity > 0.03) {
        ripples.push(`<circle cx="0" cy="0" r="${radius.toFixed(1)}"
          stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" fill="none"
          opacity="${opacity.toFixed(2)}"/>`);
      }
    }

    return ripples.join('\n    ');
  }

  /**
   * Generate floating particles animation - gentle, slow rise
   */
  private static generateFloatingParticles(frame: number, totalFrames: number, color: string): string {
    const particles: string[] = [];
    const numParticles = 4;  // Fewer particles

    for (let i = 0; i < numParticles; i++) {
      const baseX = (i - numParticles / 2) * 18 + 9;
      const animProgress = (frame / totalFrames + i * 0.25) % 1;

      // Slow float upward with very gentle sway
      const y = 40 - animProgress * 80;
      const x = baseX + Math.sin(animProgress * Math.PI * 2 + i) * 5;
      const size = 2.5 + Math.sin(animProgress * Math.PI) * 1;
      const opacity = Math.sin(animProgress * Math.PI) * 0.4;

      if (opacity > 0.05) {
        particles.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}"
          fill="${color}" opacity="${opacity.toFixed(2)}"/>`);
      }
    }

    return particles.join('\n    ');
  }

  /**
   * Generate pulsing glow animation - soft breathing effect
   */
  private static generatePulseGlow(frame: number, totalFrames: number, color: string): string {
    const progress = frame / totalFrames;
    const pulsePhase = Math.sin(progress * Math.PI * 2);

    // Very subtle breathing
    const innerGlow = 0.2 + pulsePhase * 0.1;
    const outerGlow = 0.08 + pulsePhase * 0.05;
    const outerRadius = 48 + pulsePhase * 4;

    return `
    <circle cx="0" cy="0" r="${outerRadius.toFixed(1)}" fill="${color}" opacity="${outerGlow.toFixed(2)}"/>
    <circle cx="0" cy="0" r="38" fill="${color}" opacity="${innerGlow.toFixed(2)}"/>`;
  }

  /**
   * Generate wave animation for attention-seeking states - subtle pulse with soft ring
   */
  private static generateWaveAnimation(frame: number, totalFrames: number, color: string): string {
    const elements: string[] = [];
    const progress = frame / totalFrames;

    // Soft pulsing background glow
    const pulseIntensity = 0.15 + Math.sin(progress * Math.PI * 2) * 0.1;
    elements.push(`<circle cx="0" cy="0" r="45" fill="${color}" opacity="${pulseIntensity.toFixed(2)}"/>`);

    // Single soft expanding ring
    const ringProgress = progress;
    const radius = 30 + ringProgress * 25;
    const ringOpacity = (1 - ringProgress) * 0.2;

    if (ringOpacity > 0.03) {
      elements.push(`<circle cx="0" cy="0" r="${radius.toFixed(1)}"
        stroke="${color}" stroke-width="2.5" fill="none"
        opacity="${ringOpacity.toFixed(2)}"/>`);
    }

    return elements.join('\n    ');
  }

  /**
   * Generate animation layer based on type
   */
  private static generateAnimationLayer(
    config: StateConfig,
    frame: number
  ): string {
    switch (config.animationType) {
      case 'orbit':
        return this.generateOrbitParticles(frame, config.animationFrames, config.primaryColor);
      case 'ripple':
        return this.generateRipples(frame, config.animationFrames, config.primaryColor);
      case 'float':
        return this.generateFloatingParticles(frame, config.animationFrames, config.primaryColor);
      case 'pulse':
        return this.generatePulseGlow(frame, config.animationFrames, config.primaryColor);
      case 'wave':
        return this.generateWaveAnimation(frame, config.animationFrames, config.primaryColor);
      default:
        return '';
    }
  }

  /**
   * Generate an SVG frame for a given state
   */
  static generateFrame(state: ClaudeState, frame: number = 0): string {
    const config = STATE_CONFIGS[state];
    const iconPath = LUCIDE_ICONS[config.icon] || LUCIDE_ICONS.check;

    // Subtle rotation for animated states (loader only)
    const rotation = state === 'running'
      ? (frame / config.animationFrames) * 360
      : 0;

    // Animation layers
    const animationLayer = this.generateAnimationLayer(config, frame);

    // Ambient glow for all states
    const ambientGlow = config.animationType === 'none'
      ? `<circle cx="0" cy="0" r="40" fill="${config.glowColor}"/>`
      : '';

    return `<svg width="${this.SIZE}" height="${this.SIZE}" viewBox="0 0 ${this.SIZE} ${this.SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${config.primaryColor}"/>
      <stop offset="100%" stop-color="${config.secondaryColor}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="#0f0f1a" rx="16"/>

  <!-- Center group -->
  <g transform="translate(${this.CENTER}, ${this.CENTER - 4})">

    <!-- Animation layer -->
    ${animationLayer}
    ${ambientGlow}

    <!-- Icon with rotation for loader -->
    <g transform="rotate(${rotation})" filter="url(#glow)">
      <g style="color: ${config.primaryColor}">
        ${iconPath}
      </g>
    </g>
  </g>

  <!-- Status indicator -->
  <circle cx="118" cy="22" r="10" fill="${config.primaryColor}" opacity="0.9"/>
  <circle cx="118" cy="22" r="6" fill="#0f0f1a"/>
  <circle cx="118" cy="22" r="4" fill="${config.primaryColor}"/>
</svg>`;
  }

  /**
   * Get the number of animation frames for a state
   */
  static getFrameCount(state: ClaudeState): number {
    return STATE_CONFIGS[state].animationFrames;
  }

  /**
   * Check if a state should be animated
   */
  static isAnimated(state: ClaudeState): boolean {
    return STATE_CONFIGS[state].animationType !== 'none';
  }

  /**
   * Get the label for a state
   */
  static getLabel(state: ClaudeState): string {
    return STATE_CONFIGS[state].label;
  }

  /**
   * Get the primary color for a state
   */
  static getColor(state: ClaudeState): string {
    return STATE_CONFIGS[state].primaryColor;
  }

  /**
   * Generate an SVG as a data URL for use with setImage
   */
  static generateDataUrl(state: ClaudeState, frame: number = 0): string {
    const svg = this.generateFrame(state, frame);
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}
