import type { ClaudeState } from "../server/types.js";

interface StateConfig {
  primaryColor: string;
  secondaryColor: string;
  icon: string;
  animated: boolean;
  animationFrames: number;
  label: string;
}

const STATE_CONFIGS: Record<ClaudeState, StateConfig> = {
  idle: {
    primaryColor: "#4CAF50",
    secondaryColor: "#81C784",
    icon: "checkmark",
    animated: false,
    animationFrames: 1,
    label: "Ready"
  },
  running: {
    primaryColor: "#2196F3",
    secondaryColor: "#64B5F6",
    icon: "spinner",
    animated: true,
    animationFrames: 12,
    label: "Running"
  },
  tool_use: {
    primaryColor: "#FF9800",
    secondaryColor: "#FFB74D",
    icon: "gear",
    animated: true,
    animationFrames: 12,
    label: "Tool"
  },
  editing: {
    primaryColor: "#9C27B0",
    secondaryColor: "#BA68C8",
    icon: "pencil",
    animated: true,
    animationFrames: 4,
    label: "Edit"
  },
  question: {
    primaryColor: "#00BCD4",
    secondaryColor: "#4DD0E1",
    icon: "question",
    animated: true,
    animationFrames: 2,
    label: "Input"
  },
  permission: {
    primaryColor: "#F44336",
    secondaryColor: "#E57373",
    icon: "shield",
    animated: true,
    animationFrames: 4,
    label: "Approve?"
  },
  error: {
    primaryColor: "#F44336",
    secondaryColor: "#E57373",
    icon: "exclamation",
    animated: false,
    animationFrames: 1,
    label: "Error"
  },
  disconnected: {
    primaryColor: "#616161",
    secondaryColor: "#9E9E9E",
    icon: "disconnect",
    animated: false,
    animationFrames: 1,
    label: "Offline"
  }
};

/**
 * Generates dynamic SVG icons for Claude Code states
 */
export class IconGenerator {
  private static readonly SIZE = 144; // Stream Deck icon size @2x
  private static readonly CENTER = 72;

  /**
   * Generate an SVG frame for a given state
   * @param state The Claude Code state
   * @param frame The animation frame (0-based)
   * @returns SVG string
   */
  static generateFrame(state: ClaudeState, frame: number = 0): string {
    const config = STATE_CONFIGS[state];
    const rotation = config.animated
      ? (frame / config.animationFrames) * 360
      : 0;

    const pulseOpacity = config.animated
      ? 0.7 + 0.3 * Math.sin((frame / config.animationFrames) * Math.PI * 2)
      : 1;

    return `<svg width="${this.SIZE}" height="${this.SIZE}" viewBox="0 0 ${this.SIZE} ${this.SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${config.primaryColor}" />
      <stop offset="100%" stop-color="${config.secondaryColor}" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${this.SIZE}" height="${this.SIZE}" fill="#1a1a2e" rx="12"/>

  <!-- Gradient circle -->
  <circle cx="${this.CENTER}" cy="65" r="48" fill="url(#bg-gradient)" opacity="${pulseOpacity}" filter="url(#shadow)"/>

  <!-- Icon -->
  <g transform="translate(${this.CENTER}, 65)">
    <g transform="rotate(${rotation})">
      ${this.getIconPath(config.icon)}
    </g>
  </g>

  <!-- Status indicator dot -->
  <circle cx="115" cy="20" r="8" fill="${config.primaryColor}" stroke="#1a1a2e" stroke-width="2"/>
</svg>`;
  }

  private static getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      checkmark: `
        <path d="M-20 0 L-8 12 L20 -12"
              stroke="white" stroke-width="5" fill="none"
              stroke-linecap="round" stroke-linejoin="round"/>`,

      spinner: `
        <circle r="24" stroke="rgba(255,255,255,0.3)" stroke-width="4" fill="none"/>
        <path d="M0 -24 A24 24 0 0 1 24 0"
              stroke="white" stroke-width="4" fill="none"
              stroke-linecap="round"/>`,

      gear: `
        <path d="M0 -22 L3 -12 L12 -12 L10 -3 L18 3 L12 8 L15 17 L6 15 L0 22 L-6 15 L-15 17 L-12 8 L-18 3 L-10 -3 L-12 -12 L-3 -12 Z"
              fill="white"/>
        <circle r="8" fill="#1a1a2e"/>`,

      pencil: `
        <path d="M-18 18 L-22 22 L-18 20 L18 -18 L14 -22 L-22 14 Z"
              fill="white"/>
        <path d="M14 -22 L18 -18 L22 -22 L18 -26 Z"
              fill="white"/>`,

      question: `
        <text x="0" y="8" text-anchor="middle"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="42" font-weight="bold" fill="white">?</text>`,

      shield: `
        <path d="M0 -24 L22 -12 L22 8 C22 18 0 26 0 26 C0 26 -22 18 -22 8 L-22 -12 Z"
              stroke="white" stroke-width="3" fill="none"/>
        <text x="0" y="6" text-anchor="middle"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="24" font-weight="bold" fill="white">!</text>`,

      exclamation: `
        <text x="0" y="8" text-anchor="middle"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="42" font-weight="bold" fill="white">!</text>`,

      disconnect: `
        <path d="M-16 -16 L16 16 M-16 16 L16 -16"
              stroke="white" stroke-width="5" stroke-linecap="round"/>`
    };

    return icons[icon] || icons.checkmark;
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
    return STATE_CONFIGS[state].animated;
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
