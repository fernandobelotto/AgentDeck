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

// Anthropic color palette
const ANTHROPIC = {
  black: "#141413",      // Primary background
  cream: "#FAF9F5",      // Light text/accents
  orange: "#D97657",     // Claude brand color (terracotta)
  darkGray: "#1F1E1D",   // Secondary dark
  gray: "#30302E",       // Tertiary gray
};

const STATE_CONFIGS: Record<ClaudeState, StateConfig> = {
  idle: {
    primaryColor: ANTHROPIC.orange,
    secondaryColor: "#C4684D",
    glowColor: "#D9765740",
    icon: "claude",
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
    primaryColor: ANTHROPIC.orange,
    secondaryColor: "#C4684D",
    glowColor: "#D9765750",
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
    primaryColor: ANTHROPIC.cream,
    secondaryColor: "#E8E7E3",
    glowColor: "#FAF9F560",
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
    primaryColor: ANTHROPIC.gray,
    secondaryColor: ANTHROPIC.darkGray,
    glowColor: "#30302E30",
    icon: "unplug",
    animationType: 'none',
    animationFrames: 1,
    label: "Offline"
  }
};

// Icon paths (scaled to fit 144x144 canvas centered at 72,72)
const LUCIDE_ICONS: Record<string, string> = {
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

// Kitty status indicator colors
const KITTY_STATUS = {
  available: "#4ADE80",   // Green - Kitty is available
  unavailable: "#F87171"  // Red - Kitty is not available
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
   * @param state - The Claude state to render
   * @param frame - Animation frame number (default 0)
   * @param kittyAvailable - Whether Kitty remote control is available (shows green/red indicator)
   */
  static generateFrame(state: ClaudeState, frame: number = 0, kittyAvailable?: boolean): string {
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

    // Kitty status indicator (bottom-left corner) - only show if kittyAvailable is defined
    const kittyIndicator = kittyAvailable !== undefined
      ? `<!-- Kitty status indicator -->
  <circle cx="26" cy="122" r="8" fill="${kittyAvailable ? KITTY_STATUS.available : KITTY_STATUS.unavailable}" opacity="0.9"/>
  <circle cx="26" cy="122" r="5" fill="${ANTHROPIC.black}"/>
  <circle cx="26" cy="122" r="3" fill="${kittyAvailable ? KITTY_STATUS.available : KITTY_STATUS.unavailable}"/>`
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
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="${ANTHROPIC.black}" rx="16"/>

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
   * @param state - The Claude state to render
   * @param frame - Animation frame number (default 0)
   * @param kittyAvailable - Whether Kitty remote control is available
   */
  static generateDataUrl(state: ClaudeState, frame: number = 0, kittyAvailable?: boolean): string {
    const svg = this.generateFrame(state, frame, kittyAvailable);
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Format token count for display (e.g., 12500 -> "12.5k")
   */
  private static formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}k`;
    }
    return tokens.toString();
  }

  /**
   * Generate a token counter display icon
   * @param tokens - Total token count
   * @param state - Current Claude state (for status indicator color)
   */
  static generateTokenDisplay(tokens: number, state: ClaudeState): string {
    const config = STATE_CONFIGS[state];
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
   */
  static generateCostDisplay(cost: number, state: ClaudeState): string {
    const config = STATE_CONFIGS[state];
    const costText = cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
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
  private static getActivityStyle(toolName: string): { icon: string; color: string } {
    const toolLower = toolName.toLowerCase();

    if (toolLower.includes("edit") || toolLower.includes("write")) {
      return { icon: "E", color: "#A78BFA" }; // Purple for edit
    }
    if (toolLower.includes("bash") || toolLower.includes("shell")) {
      return { icon: ">", color: "#60A5FA" }; // Blue for bash
    }
    if (toolLower.includes("read") || toolLower.includes("glob") || toolLower.includes("grep")) {
      return { icon: "S", color: "#F59E0B" }; // Amber for search/read
    }
    if (toolLower.includes("web") || toolLower.includes("fetch")) {
      return { icon: "W", color: "#14B8A6" }; // Teal for web
    }
    if (toolLower.includes("task") || toolLower.includes("agent")) {
      return { icon: "A", color: "#EC4899" }; // Pink for agent
    }
    if (toolLower.includes("todo")) {
      return { icon: "T", color: "#06B6D4" }; // Cyan for todo
    }

    return { icon: "?", color: ANTHROPIC.gray }; // Default
  }

  /**
   * Generate an activity log display icon
   * @param toolName - Name of the last tool used
   * @param state - Current Claude state (for status indicator color)
   */
  static generateActivityDisplay(toolName: string, state: ClaudeState): string {
    const config = STATE_CONFIGS[state];
    const { icon, color } = this.getActivityStyle(toolName);

    // Truncate tool name if too long
    const displayName = toolName.length > 10 ? toolName.substring(0, 9) + "…" : toolName;

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
