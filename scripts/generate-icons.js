import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = import.meta.dirname;
const outputDir = join(__dirname, "../com.agentdeck.plugin.sdPlugin/imgs");

// Anthropic color palette
const ANTHROPIC = {
  black: "#141413",
  cream: "#FAF9F5",
  darkGray: "#1F1E1D",
  gray: "#30302E",
  orange: "#D97657",
};

// Gemini color palette
const GEMINI = {
  black: "#141413",
  blue: "#3186FF",
  green: "#08B962",
  red: "#F94543",
  yellow: "#FABC12",
};

// Cursor color palette
const CURSOR = {
  black: "#141413",
  lightPurple: "#A78BFA",
  purple: "#8B5CF6",
};

// Claude starburst logo (viewBox 0 0 24 24)
const CLAUDE_LOGO = `<path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="${ANTHROPIC.orange}"/>`;

// Gemini sparkle logo (viewBox 0 0 24 24)
const GEMINI_LOGO_PATH =
  "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z";

// Cursor hexagonal logo (viewBox 0 0 24 24) - official lobe-icons
const CURSOR_LOGO_PATH =
  "M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z";

/**
 * Generate AgentDeck category icon - shows both Claude and Gemini sparkles
 */
function generateCategorySvg(size) {
  const center = size / 2;

  // Smaller scales for the dual-logo design
  const logoScale = (size / 144) * 1.4;

  // Claude logo positioned left
  const claudeOffset = -size * 0.12;
  // Gemini logo positioned right
  const geminiOffset = size * 0.12;

  const geminiLogo = `
    <path d="${GEMINI_LOGO_PATH}" fill="${GEMINI.blue}"/>
    <path d="${GEMINI_LOGO_PATH}" fill="url(#geminiGreenCat)"/>
  `;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient gradientUnits="userSpaceOnUse" id="geminiGreenCat" x1="7" x2="11" y1="15.5" y2="12">
      <stop stop-color="${GEMINI.green}"/>
      <stop offset="1" stop-color="${GEMINI.green}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${ANTHROPIC.black}" rx="${size * 0.11}"/>

  <!-- Claude logo (left, slightly behind) -->
  <g transform="translate(${center + claudeOffset}, ${center})" opacity="0.85">
    <g transform="scale(${logoScale}) translate(-12, -12)">
      ${CLAUDE_LOGO}
    </g>
  </g>

  <!-- Gemini logo (right, slightly in front) -->
  <g transform="translate(${center + geminiOffset}, ${center})">
    <g transform="scale(${logoScale}) translate(-12, -12)">
      ${geminiLogo}
    </g>
  </g>
</svg>`;
}

/**
 * Generate Claude SVG at a specific size
 */
function generateClaudeSvg(size, showStatusDot = true) {
  const center = size / 2;
  const logoScale = (size / 144) * 2.4;
  const glowRadius = size * 0.28;

  // Status dot positioning (top-right corner)
  const dotX = size * 0.82;
  const dotY = size * 0.15;
  const dotOuter = size * 0.07;
  const dotMid = size * 0.042;
  const dotInner = size * 0.028;

  const statusDot = showStatusDot
    ? `
    <circle cx="${dotX}" cy="${dotY}" r="${dotOuter}" fill="${ANTHROPIC.orange}" opacity="0.9"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotMid}" fill="${ANTHROPIC.black}"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotInner}" fill="${ANTHROPIC.orange}"/>
  `
    : "";

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${ANTHROPIC.black}" rx="${size * 0.11}"/>

  <!-- Center group -->
  <g transform="translate(${center}, ${center - size * 0.028})">
    <!-- Ambient glow -->
    <circle cx="0" cy="0" r="${glowRadius}" fill="${ANTHROPIC.orange}40"/>

    <!-- Icon -->
    <g filter="url(#glow)">
      <g transform="scale(${logoScale}) translate(-12, -12)">
        ${CLAUDE_LOGO}
      </g>
    </g>
  </g>

  <!-- Status indicator -->
  ${statusDot}
</svg>`;
}

/**
 * Generate Gemini SVG at a specific size with gradient colors
 */
function generateGeminiSvg(size, showStatusDot = true) {
  const center = size / 2;
  const logoScale = (size / 144) * 2.4;
  const glowRadius = size * 0.28;

  // Status dot positioning (top-right corner)
  const dotX = size * 0.82;
  const dotY = size * 0.15;
  const dotOuter = size * 0.07;
  const dotMid = size * 0.042;
  const dotInner = size * 0.028;

  const statusDot = showStatusDot
    ? `
    <circle cx="${dotX}" cy="${dotY}" r="${dotOuter}" fill="${GEMINI.blue}" opacity="0.9"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotMid}" fill="${GEMINI.black}"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotInner}" fill="${GEMINI.blue}"/>
  `
    : "";

  // Gemini logo with gradient overlays (like the original lobe-icons)
  const geminiLogo = `
    <path d="${GEMINI_LOGO_PATH}" fill="${GEMINI.blue}"/>
    <path d="${GEMINI_LOGO_PATH}" fill="url(#geminiGreen)"/>
    <path d="${GEMINI_LOGO_PATH}" fill="url(#geminiRed)"/>
    <path d="${GEMINI_LOGO_PATH}" fill="url(#geminiYellow)"/>
  `;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glowGemini">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Gemini gradient overlays (scaled to logo coordinates) -->
    <linearGradient gradientUnits="userSpaceOnUse" id="geminiGreen" x1="7" x2="11" y1="15.5" y2="12">
      <stop stop-color="${GEMINI.green}"/>
      <stop offset="1" stop-color="${GEMINI.green}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient gradientUnits="userSpaceOnUse" id="geminiRed" x1="8" x2="11.5" y1="5.5" y2="11">
      <stop stop-color="${GEMINI.red}"/>
      <stop offset="1" stop-color="${GEMINI.red}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient gradientUnits="userSpaceOnUse" id="geminiYellow" x1="3.5" x2="17.5" y1="13.5" y2="12">
      <stop stop-color="${GEMINI.yellow}"/>
      <stop offset=".46" stop-color="${GEMINI.yellow}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${GEMINI.black}" rx="${size * 0.11}"/>

  <!-- Center group -->
  <g transform="translate(${center}, ${center - size * 0.028})">
    <!-- Ambient glow -->
    <circle cx="0" cy="0" r="${glowRadius}" fill="${GEMINI.blue}40"/>

    <!-- Icon -->
    <g filter="url(#glowGemini)">
      <g transform="scale(${logoScale}) translate(-12, -12)">
        ${geminiLogo}
      </g>
    </g>
  </g>

  <!-- Status indicator -->
  ${statusDot}
</svg>`;
}

/**
 * Generate Cursor SVG at a specific size
 */
function generateCursorSvg(size, showStatusDot = true) {
  const center = size / 2;
  const logoScale = (size / 144) * 2.4;
  const glowRadius = size * 0.28;

  // Status dot positioning (top-right corner)
  const dotX = size * 0.82;
  const dotY = size * 0.15;
  const dotOuter = size * 0.07;
  const dotMid = size * 0.042;
  const dotInner = size * 0.028;

  const statusDot = showStatusDot
    ? `
    <circle cx="${dotX}" cy="${dotY}" r="${dotOuter}" fill="${CURSOR.purple}" opacity="0.9"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotMid}" fill="${CURSOR.black}"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotInner}" fill="${CURSOR.purple}"/>
  `
    : "";

  // Cursor hexagonal logo
  const cursorLogo = `
    <path d="${CURSOR_LOGO_PATH}" fill="${CURSOR.purple}"/>
  `;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glowCursor">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${CURSOR.black}" rx="${size * 0.11}"/>

  <!-- Center group -->
  <g transform="translate(${center}, ${center - size * 0.028})">
    <!-- Ambient glow -->
    <circle cx="0" cy="0" r="${glowRadius}" fill="${CURSOR.purple}40"/>

    <!-- Icon -->
    <g filter="url(#glowCursor)">
      <g transform="scale(${logoScale}) translate(-12, -12)">
        ${cursorLogo}
      </g>
    </g>
  </g>

  <!-- Status indicator -->
  ${statusDot}
</svg>`;
}

/**
 * Convert SVG to PNG using sharp
 */
async function svgToPng(svg, outputPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  // === Claude Icons ===
  console.log("Generating Claude icons...");

  // Generate action icons (for buttons) - 72x72 and 144x144
  const claudeActionSvg144 = generateClaudeSvg(144, true);
  await svgToPng(claudeActionSvg144, join(outputDir, "action.png"), 72);
  await svgToPng(claudeActionSvg144, join(outputDir, "action@2x.png"), 144);

  // Generate plugin icons (for plugin list) - 144x144 and 288x288
  const pluginSvg288 = generateClaudeSvg(288, false);
  await svgToPng(pluginSvg288, join(outputDir, "plugin.png"), 144);
  await svgToPng(pluginSvg288, join(outputDir, "plugin@2x.png"), 288);

  // Generate category icons (dual-agent design) - 28x28 and 56x56
  console.log("Generating AgentDeck category icon...");
  const categorySvg56 = generateCategorySvg(56);
  await svgToPng(categorySvg56, join(outputDir, "category.png"), 28);
  await svgToPng(categorySvg56, join(outputDir, "category@2x.png"), 56);

  // === Gemini Icons ===
  console.log("Generating Gemini icons...");

  // Generate Gemini action icons (for buttons) - 72x72 and 144x144
  const geminiActionSvg144 = generateGeminiSvg(144, true);
  await svgToPng(geminiActionSvg144, join(outputDir, "gemini-action.png"), 72);
  await svgToPng(
    geminiActionSvg144,
    join(outputDir, "gemini-action@2x.png"),
    144
  );

  // === Cursor Icons ===
  console.log("Generating Cursor icons...");

  // Generate Cursor action icons (for buttons) - 72x72 and 144x144
  const cursorActionSvg144 = generateCursorSvg(144, true);
  await svgToPng(cursorActionSvg144, join(outputDir, "cursor-action.png"), 72);
  await svgToPng(
    cursorActionSvg144,
    join(outputDir, "cursor-action@2x.png"),
    144
  );

  console.log("\nAll icons generated successfully!");
}

main().catch(console.error);
