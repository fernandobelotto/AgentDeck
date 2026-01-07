import { IconGenerator } from "./icon-generator.js";
import type { ClaudeState } from "../server/types.js";

export type FrameUpdateCallback = (dataUrl: string) => void;

/**
 * Controls frame-based animations for Stream Deck icons
 */
export class AnimationController {
  private currentState: ClaudeState = "disconnected";
  private currentFrame: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private onFrameUpdate: FrameUpdateCallback;
  private isRunning: boolean = false;
  private kittyAvailable: boolean | undefined = undefined;

  /** Animation frame rate (frames per second) - 12 FPS for smooth, calm animations */
  private static readonly FPS = 12;
  /** Frame interval in milliseconds */
  private static readonly FRAME_INTERVAL_MS = 1000 / AnimationController.FPS;

  constructor(onFrameUpdate: FrameUpdateCallback) {
    this.onFrameUpdate = onFrameUpdate;
  }

  /**
   * Set Kitty availability status and update display
   */
  setKittyAvailable(available: boolean): void {
    if (this.kittyAvailable === available) {
      return;
    }

    this.kittyAvailable = available;
    // Force a frame update to show the new Kitty status
    this.updateFrame();
  }

  /**
   * Get current Kitty availability status
   */
  isKittyAvailable(): boolean | undefined {
    return this.kittyAvailable;
  }

  /**
   * Set the current state and update the display
   */
  setState(state: ClaudeState): void {
    if (this.currentState === state) {
      return;
    }

    this.currentState = state;
    this.currentFrame = 0;

    // Stop existing animation
    this.stopAnimation();

    // Start new animation if state is animated
    if (IconGenerator.isAnimated(state)) {
      this.startAnimation();
    } else {
      // Static icon - just update once
      this.updateFrame();
    }
  }

  /**
   * Get the current state
   */
  getState(): ClaudeState {
    return this.currentState;
  }

  /**
   * Force an immediate frame update
   */
  refresh(): void {
    this.updateFrame();
  }

  /**
   * Start the animation loop
   */
  private startAnimation(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.updateFrame();

    this.intervalId = setInterval(() => {
      const frameCount = IconGenerator.getFrameCount(this.currentState);
      this.currentFrame = (this.currentFrame + 1) % frameCount;
      this.updateFrame();
    }, AnimationController.FRAME_INTERVAL_MS);
  }

  /**
   * Stop the animation loop
   */
  private stopAnimation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Update the current frame
   */
  private updateFrame(): void {
    const dataUrl = IconGenerator.generateDataUrl(this.currentState, this.currentFrame, this.kittyAvailable);
    this.onFrameUpdate(dataUrl);
  }

  /**
   * Stop the animation and clean up
   */
  stop(): void {
    this.stopAnimation();
  }

  /**
   * Check if an animation is currently running
   */
  isAnimating(): boolean {
    return this.isRunning;
  }
}
