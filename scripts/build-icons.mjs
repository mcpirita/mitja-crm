// Пересборка иконок из design/icons в public: node scripts/build-icons.mjs
// sharp приезжает вместе с next; отдельной зависимости не заводим.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const src = (name) => readFile(new URL(`../design/icons/${name}`, import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url);

const png = (svg, size) => sharp(svg, { density: 512 }).resize(size, size).png().toBuffer();

/** ICO — это контейнер: заголовок, по записи на размер и PNG-кадры внутри. */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  let offset = 6 + frames.length * 16;
  const dir = frames.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });

  return Buffer.concat([header, ...dir, ...frames.map((f) => f.data)]);
}

const source = await src("icon.source.svg");
const maskable = await src("icon-maskable.svg");
const apple = await src("icon-apple.svg");
const favicon = await src("icon-favicon.svg");

await writeFile(out("icon-192.png"), await png(source, 192));
await writeFile(out("icon-512.png"), await png(source, 512));
await writeFile(out("icon-512-maskable.png"), await png(maskable, 512));
await writeFile(out("apple-touch-icon.png"), await png(apple, 180));

const frames = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(favicon, size) })),
);
await writeFile(out("favicon.ico"), ico(frames));

console.log("иконки пересобраны");
