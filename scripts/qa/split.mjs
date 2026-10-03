// Divide capturas de página completa en tramos visibles (para revisión manual).
// Uso: node scripts/qa/split.mjs qa-output/1366x768-full.png [altoTramo]
import sharp from 'sharp';
const [file, chunkArg] = process.argv.slice(2);
const chunk = Number(chunkArg) || 2400;
const meta = await sharp(file).metadata();
const parts = Math.ceil(meta.height / chunk);
for (let i = 0; i < parts; i += 1) {
  const top = i * chunk;
  await sharp(file)
    .extract({ left: 0, top, width: meta.width, height: Math.min(chunk, meta.height - top) })
    .toFile(file.replace('.png', `-part${i}.png`));
}
console.log(`${file}: ${meta.width}x${meta.height} → ${parts} tramos`);
