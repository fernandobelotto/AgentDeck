import type { ClaudeState, InstanceSource } from "../server/types.js";

type AnimationType =
  | "none"
  | "orbit"
  | "ripple"
  | "float"
  | "pulse"
  | "wave"
  | "breathing"
  | "shake";

interface StateConfig {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  icon: string;
  animationType: AnimationType;
  animationFrames: number;
  label: string;
}

// Anthropic color palette (Claude)
const ANTHROPIC = {
  black: "#141413", // Primary background
  cream: "#FAF9F5", // Light text/accents
  darkGray: "#1F1E1D", // Secondary dark
  gray: "#30302E", // Tertiary gray
  orange: "#D97657", // Claude brand color (terracotta)
};

// Google color palette (Gemini)
const GOOGLE = {
  black: "#141413", // Same background for consistency
  blue: "#4285F4", // Google Blue (Gemini brand)
  cream: "#FAF9F5", // Same light text
  darkGray: "#1F1E1D", // Same secondary dark
  gray: "#30302E", // Same tertiary gray
};

// Cursor color palette (Cursor Agent)
const CURSOR = {
  black: "#141413", // Same background for consistency
  cream: "#FAF9F5", // Same light text
  darkGray: "#1F1E1D", // Same secondary dark
  gray: "#30302E", // Same tertiary gray
  purple: "#8B5CF6", // Cursor Purple (brand color)
};

// Claude state configs
const CLAUDE_STATE_CONFIGS: Record<ClaudeState, StateConfig> = {
  disconnected: {
    animationFrames: 1,
    animationType: "none",
    glowColor: "#30302E30",
    icon: "unplug",
    label: "Offline",
    primaryColor: ANTHROPIC.gray,
    secondaryColor: ANTHROPIC.darkGray,
  },
  editing: {
    animationFrames: 84, // 7 seconds at 12fps
    animationType: "float",
    glowColor: "#A78BFA50",
    icon: "pencil",
    label: "Edit",
    primaryColor: "#A78BFA",
    secondaryColor: "#8B5CF6",
  },
  error: {
    animationFrames: 24, // 2 seconds at 12fps - shake then settle
    animationType: "shake",
    glowColor: "#F8717140",
    icon: "alert",
    label: "Error",
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
  },
  idle: {
    animationFrames: 1,
    animationType: "none",
    glowColor: "#D9765740",
    icon: "claude",
    label: "Ready",
    primaryColor: ANTHROPIC.orange,
    secondaryColor: "#C4684D",
  },
  permission: {
    animationFrames: 60, // 5 seconds at 12fps
    animationType: "wave",
    glowColor: "#F8717170",
    icon: "shield",
    label: "Approve?",
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
  },
  plan_prompt: {
    animationFrames: 48, // 4 seconds at 12fps
    animationType: "pulse",
    glowColor: "#22D3EE60",
    icon: "compass",
    label: "Plan?",
    primaryColor: "#22D3EE", // Cyan for plan mode
    secondaryColor: "#06B6D4",
  },
  question: {
    animationFrames: 48, // 4 seconds at 12fps
    animationType: "pulse",
    glowColor: "#FAF9F560",
    icon: "help",
    label: "Input",
    primaryColor: ANTHROPIC.cream,
    secondaryColor: "#E8E7E3",
  },
  running: {
    animationFrames: 96, // 8 seconds at 12fps
    animationType: "orbit",
    glowColor: "#60A5FA50",
    icon: "loader",
    label: "Running",
    primaryColor: "#60A5FA",
    secondaryColor: "#3B82F6",
  },
  tool_use: {
    animationFrames: 72, // 6 seconds at 12fps
    animationType: "ripple",
    glowColor: "#D9765750",
    icon: "wrench",
    label: "Tool",
    primaryColor: ANTHROPIC.orange,
    secondaryColor: "#C4684D",
  },
};

// Gemini state configs - Google Blue themed
const GEMINI_STATE_CONFIGS: Record<ClaudeState, StateConfig> = {
  disconnected: {
    animationFrames: 1,
    animationType: "none",
    glowColor: "#30302E30",
    icon: "unplug",
    label: "Offline",
    primaryColor: GOOGLE.gray,
    secondaryColor: GOOGLE.darkGray,
  },
  editing: {
    animationFrames: 84,
    animationType: "float",
    glowColor: "#7C4DFF50",
    icon: "pencil",
    label: "Edit",
    primaryColor: "#7C4DFF", // Purple-blue for Gemini editing
    secondaryColor: "#651FFF",
  },
  error: {
    animationFrames: 24, // 2 seconds at 12fps - shake then settle
    animationType: "shake",
    glowColor: "#F8717140",
    icon: "alert",
    label: "Error",
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
  },
  idle: {
    animationFrames: 1,
    animationType: "none",
    glowColor: "#4285F440",
    icon: "gemini", // Gemini sparkle icon
    label: "Ready",
    primaryColor: GOOGLE.blue,
    secondaryColor: "#3367D6",
  },
  permission: {
    animationFrames: 60,
    animationType: "wave",
    glowColor: "#F8717170",
    icon: "shield",
    label: "Approve?",
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
  },
  plan_prompt: {
    animationFrames: 48,
    animationType: "pulse",
    glowColor: "#22D3EE60",
    icon: "compass",
    label: "Plan?",
    primaryColor: "#22D3EE", // Cyan for plan mode
    secondaryColor: "#06B6D4",
  },
  question: {
    animationFrames: 48,
    animationType: "pulse",
    glowColor: "#FAF9F560",
    icon: "help",
    label: "Input",
    primaryColor: GOOGLE.cream,
    secondaryColor: "#E8E7E3",
  },
  running: {
    animationFrames: 96,
    animationType: "orbit",
    glowColor: "#60A5FA50",
    icon: "loader",
    label: "Running",
    primaryColor: "#60A5FA",
    secondaryColor: "#3B82F6",
  },
  tool_use: {
    animationFrames: 72,
    animationType: "ripple",
    glowColor: "#4285F450",
    icon: "wrench",
    label: "Tool",
    primaryColor: GOOGLE.blue,
    secondaryColor: "#3367D6",
  },
};

// Cursor state configs - Cursor Purple themed
const CURSOR_STATE_CONFIGS: Record<ClaudeState, StateConfig> = {
  disconnected: {
    animationFrames: 1,
    animationType: "none",
    glowColor: "#30302E30",
    icon: "unplug",
    label: "Offline",
    primaryColor: CURSOR.gray,
    secondaryColor: CURSOR.darkGray,
  },
  editing: {
    animationFrames: 84,
    animationType: "float",
    glowColor: "#C084FC50",
    icon: "pencil",
    label: "Edit",
    primaryColor: "#C084FC", // Lighter purple for editing
    secondaryColor: "#A855F7",
  },
  error: {
    animationFrames: 24,
    animationType: "shake",
    glowColor: "#F8717140",
    icon: "alert",
    label: "Error",
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
  },
  idle: {
    animationFrames: 1,
    animationType: "none",
    glowColor: "#8B5CF640",
    icon: "cursor", // Cursor pointer icon
    label: "Ready",
    primaryColor: CURSOR.purple,
    secondaryColor: "#7C3AED",
  },
  permission: {
    animationFrames: 60,
    animationType: "wave",
    glowColor: "#F8717170",
    icon: "shield",
    label: "Approve?",
    primaryColor: "#F87171",
    secondaryColor: "#EF4444",
  },
  plan_prompt: {
    animationFrames: 48,
    animationType: "pulse",
    glowColor: "#22D3EE60",
    icon: "compass",
    label: "Plan?",
    primaryColor: "#22D3EE", // Cyan for plan mode
    secondaryColor: "#06B6D4",
  },
  question: {
    animationFrames: 48,
    animationType: "pulse",
    glowColor: "#FAF9F560",
    icon: "help",
    label: "Input",
    primaryColor: CURSOR.cream,
    secondaryColor: "#E8E7E3",
  },
  running: {
    animationFrames: 96,
    animationType: "orbit",
    glowColor: "#A78BFA50",
    icon: "loader",
    label: "Running",
    primaryColor: "#A78BFA",
    secondaryColor: "#8B5CF6",
  },
  tool_use: {
    animationFrames: 72,
    animationType: "ripple",
    glowColor: "#8B5CF650",
    icon: "wrench",
    label: "Tool",
    primaryColor: CURSOR.purple,
    secondaryColor: "#7C3AED",
  },
};

// Helper to get state config based on source
function getStateConfigs(
  source: InstanceSource = "claude"
): Record<ClaudeState, StateConfig> {
  switch (source) {
    case "gemini": {
      return GEMINI_STATE_CONFIGS;
    }
    case "cursor": {
      return CURSOR_STATE_CONFIGS;
    }
    default: {
      return CLAUDE_STATE_CONFIGS;
    }
  }
}

// Legacy alias for backward compatibility
const STATE_CONFIGS = CLAUDE_STATE_CONFIGS;

// Icon paths (scaled to fit 144x144 canvas centered at 72,72)
const LUCIDE_ICONS: Record<string, string> = {
  // Gemini sparkle icon - four-pointed star
  gemini: `
    <path d="M12 2L14.09 8.26L20 12L14.09 15.74L12 22L9.91 15.74L4 12L9.91 8.26L12 2Z"
          transform="scale(2.4) translate(-12, -12)"
          fill="currentColor"/>`,

  // Cursor logo - official hexagonal icon from lobe-icons
  cursor: `
    <path d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"
          transform="scale(2.4) translate(-12, -12)"
          fill="currentColor"/>`,

  // Claude starburst logo - scaled from 24x24 viewBox
  claude: `
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
          transform="scale(2.4) translate(-12, -12)"
          fill="currentColor"/>`,

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

  // Compass icon for plan mode - navigation/direction
  compass: `
    <circle cx="0" cy="0" r="28" stroke="currentColor" stroke-width="2.5" fill="none" opacity="0.3"/>
    <polygon points="0,-18 6,0 0,18 -6,0" fill="currentColor" opacity="0.8"/>
    <circle cx="0" cy="0" r="4" fill="currentColor"/>`,

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
          transform="scale(2) translate(-12, -12)" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

// Kitty status indicator colors
const KITTY_STATUS = {
  available: "#4ADE80", // Green - Kitty is available
  unavailable: "#F87171", // Red - Kitty is not available
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
  private static generateOrbitParticles(
    frame: number,
    totalFrames: number,
    color: string
  ): string {
    const particles: string[] = [];
    const numParticles = 3; // Fewer particles
    const orbitRadius = 42;

    for (let i = 0; i < numParticles; i++) {
      const baseAngle = (i / numParticles) * Math.PI * 2;
      const animProgress = frame / totalFrames;
      const angle = baseAngle + animProgress * Math.PI * 2;

      // Gentle size breathing
      const size = 3.5 + Math.sin(animProgress * Math.PI * 2 + i) * 0.5;
      // Stable opacity with gentle variation
      const opacity =
        0.5 + Math.sin(animProgress * Math.PI * 2 + i * 0.8) * 0.15;

      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;

      particles.push(
        `<circle cx="${x}" cy="${y}" r="${size.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`
      );
    }

    // Soft glow ring behind particles
    const glowOpacity =
      0.08 + Math.sin((frame / totalFrames) * Math.PI * 2) * 0.04;
    particles.unshift(
      `<circle cx="0" cy="0" r="${orbitRadius}" stroke="${color}" stroke-width="8" fill="none" opacity="${glowOpacity.toFixed(2)}"/>`
    );

    return particles.join("\n    ");
  }

  /**
   * Generate expanding ripple animation - slow, gentle waves
   */
  private static generateRipples(
    frame: number,
    totalFrames: number,
    color: string
  ): string {
    const ripples: string[] = [];
    const numRipples = 2; // Fewer ripples

    for (let i = 0; i < numRipples; i++) {
      const offset = i / numRipples;
      const progress = (frame / totalFrames + offset) % 1;
      const eased = this.easeInOutSine(progress);

      const radius = 25 + eased * 30;
      const opacity = (1 - eased) * 0.25; // More subtle
      const strokeWidth = 3 - eased * 2;

      if (opacity > 0.03) {
        ripples.push(`<circle cx="0" cy="0" r="${radius.toFixed(1)}"
          stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" fill="none"
          opacity="${opacity.toFixed(2)}"/>`);
      }
    }

    return ripples.join("\n    ");
  }

  /**
   * Generate floating particles animation - gentle, slow rise
   */
  private static generateFloatingParticles(
    frame: number,
    totalFrames: number,
    color: string
  ): string {
    const particles: string[] = [];
    const numParticles = 4; // Fewer particles

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

    return particles.join("\n    ");
  }

  /**
   * Generate pulsing glow animation - soft breathing effect
   */
  private static generatePulseGlow(
    frame: number,
    totalFrames: number,
    color: string
  ): string {
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
  private static generateWaveAnimation(
    frame: number,
    totalFrames: number,
    color: string
  ): string {
    const elements: string[] = [];
    const progress = frame / totalFrames;

    // Soft pulsing background glow
    const pulseIntensity = 0.15 + Math.sin(progress * Math.PI * 2) * 0.1;
    elements.push(
      `<circle cx="0" cy="0" r="45" fill="${color}" opacity="${pulseIntensity.toFixed(2)}"/>`
    );

    // Single soft expanding ring
    const ringProgress = progress;
    const radius = 30 + ringProgress * 25;
    const ringOpacity = (1 - ringProgress) * 0.2;

    if (ringOpacity > 0.03) {
      elements.push(`<circle cx="0" cy="0" r="${radius.toFixed(1)}"
        stroke="${color}" stroke-width="2.5" fill="none"
        opacity="${ringOpacity.toFixed(2)}"/>`);
    }

    return elements.join("\n    ");
  }

  /**
   * Generate hold progress ring - fills clockwise from top as user holds button
   * @param progress - 0-1 progress value
   * @param color - Ring color
   */
  private static generateHoldProgressRing(
    progress: number,
    color: string
  ): string {
    if (progress <= 0) {
      return "";
    }

    const radius = 52; // Larger than icon, smaller than background
    const strokeWidth = 4;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke-dashoffset for clockwise fill from top
    const dashOffset = circumference * (1 - progress);

    // Glow effect intensity increases with progress
    const glowOpacity = 0.1 + progress * 0.2;

    return `
    <!-- Hold progress background ring -->
    <circle cx="0" cy="0" r="${radius}"
      stroke="${color}" stroke-width="${strokeWidth}" fill="none"
      opacity="0.15"/>
    <!-- Hold progress glow -->
    <circle cx="0" cy="0" r="${radius}"
      stroke="${color}" stroke-width="${strokeWidth + 6}" fill="none"
      opacity="${glowOpacity.toFixed(2)}"
      stroke-dasharray="${circumference}"
      stroke-dashoffset="${dashOffset.toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-90)"/>
    <!-- Hold progress arc -->
    <circle cx="0" cy="0" r="${radius}"
      stroke="${color}" stroke-width="${strokeWidth}" fill="none"
      stroke-dasharray="${circumference}"
      stroke-dashoffset="${dashOffset.toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-90)"/>`;
  }

  /**
   * Generate floating Y offset for idle state - icon bobs up and down like floating in space
   * @param frame - Current animation frame
   * @param totalFrames - Total frames in the cycle
   * @returns Y offset in pixels
   */
  private static generateFloatingOffset(
    frame: number,
    totalFrames: number
  ): number {
    const progress = frame / totalFrames;
    // Smooth sine wave for gentle bobbing motion
    const floatPhase = Math.sin(progress * Math.PI * 2);
    // Float between -4 and +4 pixels
    return floatPhase * 4;
  }

  /**
   * Generate shake animation offset for error state
   * @param frame - Current animation frame
   * @param totalFrames - Total frames in the cycle
   * @returns X offset for transform
   */
  private static generateShakeOffset(
    frame: number,
    totalFrames: number
  ): number {
    const progress = frame / totalFrames;
    // Quick oscillation that decays
    const intensity = Math.sin(progress * Math.PI * 6) * 3 * (1 - progress);
    return intensity;
  }

  /**
   * Generate animation layer based on type
   */
  private static generateAnimationLayer(
    config: StateConfig,
    frame: number
  ): string {
    switch (config.animationType) {
      case "orbit": {
        return this.generateOrbitParticles(
          frame,
          config.animationFrames,
          config.primaryColor
        );
      }
      case "ripple": {
        return this.generateRipples(
          frame,
          config.animationFrames,
          config.primaryColor
        );
      }
      case "float": {
        return this.generateFloatingParticles(
          frame,
          config.animationFrames,
          config.primaryColor
        );
      }
      case "pulse": {
        return this.generatePulseGlow(
          frame,
          config.animationFrames,
          config.primaryColor
        );
      }
      case "wave": {
        return this.generateWaveAnimation(
          frame,
          config.animationFrames,
          config.primaryColor
        );
      }
      case "breathing": {
        // Breathing doesn't add animation elements - it scales the icon itself
        return "";
      }
      case "shake": {
        // Shake animation doesn't add elements, it modifies the icon transform
        return "";
      }
      default: {
        return "";
      }
    }
  }

  /**
   * Generate an SVG frame for a given state
   * @param state - The Claude state to render
   * @param frame - Animation frame number (default 0)
   * @param kittyAvailable - Whether Kitty remote control is available (shows green/red indicator)
   * @param source - Instance source ("claude" or "gemini") for color scheme
   * @param holdProgress - Optional hold progress (0-1) to show progress ring
   */
  static generateFrame(
    state: ClaudeState,
    frame: number = 0,
    kittyAvailable?: boolean,
    source: InstanceSource = "claude",
    holdProgress?: number
  ): string {
    const stateConfigs = getStateConfigs(source);
    const config = stateConfigs[state];
    const iconPath = LUCIDE_ICONS[config.icon] || LUCIDE_ICONS.check;

    // Subtle rotation for animated states (loader only)
    const rotation =
      state === "running" ? (frame / config.animationFrames) * 360 : 0;

    // Shake offset for error state
    const shakeOffset =
      config.animationType === "shake"
        ? this.generateShakeOffset(frame, config.animationFrames)
        : 0;

    // Floating offset for idle state (bobbing up and down)
    const floatingOffset =
      config.animationType === "breathing"
        ? this.generateFloatingOffset(frame, config.animationFrames)
        : 0;

    // Animation layers
    const animationLayer = this.generateAnimationLayer(config, frame);

    // Hold progress ring (when user is holding button)
    const holdProgressRing =
      holdProgress !== undefined && holdProgress > 0
        ? this.generateHoldProgressRing(holdProgress, config.primaryColor)
        : "";

    // Ambient glow for static states (none and breathing which only scales the icon)
    const ambientGlow =
      config.animationType === "none" || config.animationType === "breathing"
        ? `<circle cx="0" cy="0" r="40" fill="${config.glowColor}"/>`
        : "";

    // Kitty status indicator (bottom-left corner) - only show if kittyAvailable is defined
    const kittyIndicator =
      kittyAvailable === undefined
        ? ""
        : `<!-- Kitty status indicator -->
  <circle cx="26" cy="122" r="8" fill="${kittyAvailable ? KITTY_STATUS.available : KITTY_STATUS.unavailable}" opacity="0.9"/>
  <circle cx="26" cy="122" r="5" fill="${ANTHROPIC.black}"/>
  <circle cx="26" cy="122" r="3" fill="${kittyAvailable ? KITTY_STATUS.available : KITTY_STATUS.unavailable}"/>`;

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
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="${ANTHROPIC.black}" rx="16"/>

  <!-- Center group -->
  <g transform="translate(${this.CENTER}, ${this.CENTER - 4})">

    <!-- Animation layer -->
    ${animationLayer}
    ${ambientGlow}

    <!-- Hold progress ring -->
    ${holdProgressRing}

    <!-- Icon with rotation for loader, shake for error, float for idle -->
    <g transform="rotate(${rotation}) translate(${shakeOffset}, ${floatingOffset})" filter="url(#glow)">
      <g style="color: ${config.primaryColor}">
        ${iconPath}
      </g>
    </g>
  </g>

  <!-- Status indicator -->
  <circle cx="118" cy="22" r="10" fill="${config.primaryColor}" opacity="0.9"/>
  <circle cx="118" cy="22" r="6" fill="${ANTHROPIC.black}"/>
  <circle cx="118" cy="22" r="4" fill="${config.primaryColor}"/>

  ${kittyIndicator}
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
    return STATE_CONFIGS[state].animationType !== "none";
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
   * @param state - The Claude state to render
   * @param frame - Animation frame number (default 0)
   * @param kittyAvailable - Whether Kitty remote control is available
   * @param source - Instance source ("claude" or "gemini") for color scheme
   * @param holdProgress - Optional hold progress (0-1) to show progress ring
   */
  static generateDataUrl(
    state: ClaudeState,
    frame: number = 0,
    kittyAvailable?: boolean,
    source: InstanceSource = "claude",
    holdProgress?: number
  ): string {
    const svg = this.generateFrame(
      state,
      frame,
      kittyAvailable,
      source,
      holdProgress
    );
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate a crossfade transition frame between two states
   * @param fromState - The state transitioning from
   * @param toState - The state transitioning to
   * @param progress - Transition progress (0 = fromState, 1 = toState)
   * @param frame - Animation frame number
   * @param kittyAvailable - Whether Kitty remote control is available
   * @param source - Instance source ("claude" or "gemini") for color scheme
   * @param holdProgress - Optional hold progress (0-1) to show progress ring
   */
  static generateTransitionDataUrl(
    fromState: ClaudeState,
    toState: ClaudeState,
    progress: number,
    frame: number = 0,
    kittyAvailable?: boolean,
    source: InstanceSource = "claude",
    holdProgress?: number
  ): string {
    const svg = this.generateTransitionFrame(
      fromState,
      toState,
      progress,
      frame,
      kittyAvailable,
      source,
      holdProgress
    );
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate a crossfade transition SVG frame
   */
  private static generateTransitionFrame(
    fromState: ClaudeState,
    toState: ClaudeState,
    progress: number,
    frame: number,
    kittyAvailable?: boolean,
    source: InstanceSource = "claude",
    holdProgress?: number
  ): string {
    const stateConfigs = getStateConfigs(source);
    const fromConfig = stateConfigs[fromState];
    const toConfig = stateConfigs[toState];

    // Calculate crossfade opacities
    const fromOpacity = 1 - progress;
    const toOpacity = progress;

    // Get icon paths
    const fromIconPath = LUCIDE_ICONS[fromConfig.icon] || LUCIDE_ICONS.check;
    const toIconPath = LUCIDE_ICONS[toConfig.icon] || LUCIDE_ICONS.check;

    // Use toState's color for status indicator (shows where we're going)
    const indicatorColor = toConfig.primaryColor;

    // Blend colors for transition effect
    const blendedGlowColor =
      progress < 0.5 ? fromConfig.glowColor : toConfig.glowColor;

    // Hold progress ring
    const holdProgressRing =
      holdProgress !== undefined && holdProgress > 0
        ? this.generateHoldProgressRing(holdProgress, toConfig.primaryColor)
        : "";

    // Kitty status indicator
    const kittyIndicator =
      kittyAvailable === undefined
        ? ""
        : `<!-- Kitty status indicator -->
  <circle cx="26" cy="122" r="8" fill="${kittyAvailable ? KITTY_STATUS.available : KITTY_STATUS.unavailable}" opacity="0.9"/>
  <circle cx="26" cy="122" r="5" fill="${ANTHROPIC.black}"/>
  <circle cx="26" cy="122" r="3" fill="${kittyAvailable ? KITTY_STATUS.available : KITTY_STATUS.unavailable}"/>`;

    return `<svg width="${this.SIZE}" height="${this.SIZE}" viewBox="0 0 ${this.SIZE} ${this.SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="${ANTHROPIC.black}" rx="16"/>

  <!-- Center group -->
  <g transform="translate(${this.CENTER}, ${this.CENTER - 4})">

    <!-- Blended ambient glow -->
    <circle cx="0" cy="0" r="40" fill="${blendedGlowColor}"/>

    <!-- Hold progress ring -->
    ${holdProgressRing}

    <!-- From state icon (fading out) -->
    <g opacity="${fromOpacity.toFixed(2)}" filter="url(#glow)">
      <g style="color: ${fromConfig.primaryColor}">
        ${fromIconPath}
      </g>
    </g>

    <!-- To state icon (fading in) -->
    <g opacity="${toOpacity.toFixed(2)}" filter="url(#glow)">
      <g style="color: ${toConfig.primaryColor}">
        ${toIconPath}
      </g>
    </g>
  </g>

  <!-- Status indicator -->
  <circle cx="118" cy="22" r="10" fill="${indicatorColor}" opacity="0.9"/>
  <circle cx="118" cy="22" r="6" fill="${ANTHROPIC.black}"/>
  <circle cx="118" cy="22" r="4" fill="${indicatorColor}"/>

  ${kittyIndicator}
</svg>`;
  }

  /**
   * Format token count for display (e.g., 12500 -> "12.5k")
   */
  private static formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  }

  /**
   * Generate a token counter display icon
   * @param tokens - Total token count
   * @param state - Current Claude state (for status indicator color)
   * @param source - Instance source ("claude" or "gemini") for color scheme
   */
  static generateTokenDisplay(
    tokens: number,
    state: ClaudeState,
    source: InstanceSource = "claude"
  ): string {
    const stateConfigs = getStateConfigs(source);
    const config = stateConfigs[state];
    const tokenText = this.formatTokens(tokens);
    const textColor = "#60A5FA"; // Blue for tokens

    const svg = `<svg width="${this.SIZE}" height="${this.SIZE}" viewBox="0 0 ${this.SIZE} ${this.SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="${ANTHROPIC.black}" rx="16"/>

  <!-- Token icon (small) -->
  <g transform="translate(72, 35)">
    <circle cx="0" cy="0" r="16" fill="${textColor}" opacity="0.2"/>
    <text x="0" y="5" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="${textColor}" text-anchor="middle">T</text>
  </g>

  <!-- Token count (large) -->
  <text x="72" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="bold" fill="${ANTHROPIC.cream}" text-anchor="middle">${tokenText}</text>

  <!-- Label -->
  <text x="72" y="115" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${ANTHROPIC.gray}" text-anchor="middle">tokens</text>

  <!-- Status indicator -->
  <circle cx="118" cy="22" r="10" fill="${config.primaryColor}" opacity="0.9"/>
  <circle cx="118" cy="22" r="6" fill="${ANTHROPIC.black}"/>
  <circle cx="118" cy="22" r="4" fill="${config.primaryColor}"/>
</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate a cost tracker display icon
   * @param cost - Total cost in USD
   * @param state - Current Claude state (for status indicator color)
   * @param source - Instance source ("claude" or "gemini") for color scheme
   */
  static generateCostDisplay(
    cost: number,
    state: ClaudeState,
    source: InstanceSource = "claude"
  ): string {
    const stateConfigs = getStateConfigs(source);
    const config = stateConfigs[state];
    const costText =
      cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
    const textColor = "#4ADE80"; // Green for cost

    const svg = `<svg width="${this.SIZE}" height="${this.SIZE}" viewBox="0 0 ${this.SIZE} ${this.SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="${ANTHROPIC.black}" rx="16"/>

  <!-- Dollar icon (small) -->
  <g transform="translate(72, 35)">
    <circle cx="0" cy="0" r="16" fill="${textColor}" opacity="0.2"/>
    <text x="0" y="6" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="${textColor}" text-anchor="middle">$</text>
  </g>

  <!-- Cost (large) -->
  <text x="72" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="${ANTHROPIC.cream}" text-anchor="middle">${costText}</text>

  <!-- Label -->
  <text x="72" y="115" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${ANTHROPIC.gray}" text-anchor="middle">cost</text>

  <!-- Status indicator -->
  <circle cx="118" cy="22" r="10" fill="${config.primaryColor}" opacity="0.9"/>
  <circle cx="118" cy="22" r="6" fill="${ANTHROPIC.black}"/>
  <circle cx="118" cy="22" r="4" fill="${config.primaryColor}"/>
</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Get activity icon and color based on tool name
   */
  private static getActivityStyle(toolName: string): {
    icon: string;
    color: string;
  } {
    const toolLower = toolName.toLowerCase();

    if (toolLower.includes("edit") || toolLower.includes("write")) {
      return { color: "#A78BFA", icon: "E" }; // Purple for edit
    }
    if (toolLower.includes("bash") || toolLower.includes("shell")) {
      return { color: "#60A5FA", icon: ">" }; // Blue for bash
    }
    if (
      toolLower.includes("read") ||
      toolLower.includes("glob") ||
      toolLower.includes("grep")
    ) {
      return { color: "#F59E0B", icon: "S" }; // Amber for search/read
    }
    if (toolLower.includes("web") || toolLower.includes("fetch")) {
      return { color: "#14B8A6", icon: "W" }; // Teal for web
    }
    if (toolLower.includes("task") || toolLower.includes("agent")) {
      return { color: "#EC4899", icon: "A" }; // Pink for agent
    }
    if (toolLower.includes("todo")) {
      return { color: "#06B6D4", icon: "T" }; // Cyan for todo
    }

    return { color: ANTHROPIC.gray, icon: "?" }; // Default
  }

  /**
   * Generate an activity log display icon
   * @param toolName - Name of the last tool used
   * @param state - Current Claude state (for status indicator color)
   * @param source - Instance source ("claude" or "gemini") for color scheme
   */
  static generateActivityDisplay(
    toolName: string,
    state: ClaudeState,
    source: InstanceSource = "claude"
  ): string {
    const stateConfigs = getStateConfigs(source);
    const config = stateConfigs[state];
    const { icon, color } = this.getActivityStyle(toolName);

    // Truncate tool name if too long
    const displayName =
      toolName.length > 10 ? `${toolName.slice(0, 9)}…` : toolName;

    const svg = `<svg width="${this.SIZE}" height="${this.SIZE}" viewBox="0 0 ${this.SIZE} ${this.SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="${ANTHROPIC.black}" rx="16"/>

  <!-- Activity icon (large) -->
  <g transform="translate(72, 55)">
    <circle cx="0" cy="0" r="28" fill="${color}" opacity="0.2"/>
    <text x="0" y="12" font-family="monospace" font-size="36" font-weight="bold" fill="${color}" text-anchor="middle">${icon}</text>
  </g>

  <!-- Tool name -->
  <text x="72" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="${ANTHROPIC.cream}" text-anchor="middle">${displayName}</text>

  <!-- Status indicator -->
  <circle cx="118" cy="22" r="10" fill="${config.primaryColor}" opacity="0.9"/>
  <circle cx="118" cy="22" r="6" fill="${ANTHROPIC.black}"/>
  <circle cx="118" cy="22" r="4" fill="${config.primaryColor}"/>
</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}
