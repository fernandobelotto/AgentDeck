import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '../com.claudedeck.plugin.sdPlugin/imgs');

// Anthropic color palette
const ANTHROPIC = {
  black: "#141413",
  cream: "#FAF9F5",
  orange: "#D97657",
  darkGray: "#1F1E1D",
  gray: "#30302E"
};

// Claude starburst logo
const CLAUDE_LOGO = `<path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="${ANTHROPIC.orange}"/>`;

/**
 * Generate SVG at a specific size
 */
function generateSvg(size, showStatusDot = true) {
  const center = size / 2;
  const logoScale = size / 144 * 2.4;
  const glowRadius = size * 0.28;

  // Status dot positioning (top-right corner)
  const dotX = size * 0.82;
  const dotY = size * 0.15;
  const dotOuter = size * 0.07;
  const dotMid = size * 0.042;
  const dotInner = size * 0.028;

  const statusDot = showStatusDot ? `
    <circle cx="${dotX}" cy="${dotY}" r="${dotOuter}" fill="${ANTHROPIC.orange}" opacity="0.9"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotMid}" fill="${ANTHROPIC.black}"/>
    <circle cx="${dotX}" cy="${dotY}" r="${dotInner}" fill="${ANTHROPIC.orange}"/>
  ` : '';

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
 * Convert SVG to PNG using sharp
 */
async function svgToPng(svg, outputPath, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  // Generate action icons (for buttons) - 72x72 and 144x144
  const actionSvg144 = generateSvg(144, true);
  await svgToPng(actionSvg144, join(outputDir, 'action.png'), 72);
  await svgToPng(actionSvg144, join(outputDir, 'action@2x.png'), 144);

  // Generate plugin icons (for plugin list) - 144x144 and 288x288
  const pluginSvg288 = generateSvg(288, false);
  await svgToPng(pluginSvg288, join(outputDir, 'plugin.png'), 144);
  await svgToPng(pluginSvg288, join(outputDir, 'plugin@2x.png'), 288);

  // Generate category icons - 28x28 and 56x56
  const categorySvg56 = generateSvg(56, false);
  await svgToPng(categorySvg56, join(outputDir, 'category.png'), 28);
  await svgToPng(categorySvg56, join(outputDir, 'category@2x.png'), 56);

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
