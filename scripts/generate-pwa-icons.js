import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(__dirname, "..", "public", "img", "tourney-techs-icon.png");
const outDir = path.join(__dirname, "..", "public", "icons");

const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function flattenOnWhite(size) {
  const logo = await sharp(source).resize(size, size).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo }])
    .png()
    .toBuffer();
}

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

async function run() {
  for (const { file, size } of targets) {
    const buffer = await flattenOnWhite(size);
    await sharp(buffer).toFile(path.join(outDir, file));
    console.log(`Generated ${file}`);
  }

  // Maskable icon: pad the logo onto a solid canvas so Android's safe-zone
  // crop (a centered ~80% circle) never clips the artwork.
  const maskableSize = 512;
  const logoSize = Math.round(maskableSize * 0.7);
  const offset = Math.round((maskableSize - logoSize) / 2);
  const resizedLogo = await sharp(source).resize(logoSize, logoSize).toBuffer();

  await sharp({
    create: { width: maskableSize, height: maskableSize, channels: 4, background: BG },
  })
    .composite([{ input: resizedLogo, left: offset, top: offset }])
    .png()
    .toFile(path.join(outDir, "icon-maskable-512.png"));
  console.log("Generated icon-maskable-512.png");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
