import { resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@libsql/client";

config({ path: resolve(process.cwd(), ".env.local") });

interface SeedSpace {
  name: string;
  floor: string;
  area_m2: number;
  description: string;
  best_for: string;
}

const SEED: SeedSpace[] = [
  {
    name: "Kino 1",
    floor: "1.OG",
    area_m2: 659,
    description:
      "Большой кинозал на 600+ мест. Расположен на 2 этаже здания. Высокие потолки, действующий проектор и AV-инфраструктура.",
    best_for: "comedy,immersive,church",
  },
  {
    name: "Kino 2",
    floor: "1.OG",
    area_m2: 129,
    description:
      "Малый кинозал на 2 этаже. Затемнённый, готовая акустика и AV.",
    best_for: "lasertag,exit_room,vr",
  },
  {
    name: "Kino 3",
    floor: "1.OG",
    area_m2: 189,
    description:
      "Средний кинозал на 2 этаже. Затемнённый, проектор, AV.",
    best_for: "lasertag,exit_room,vr,axe_throwing",
  },
  {
    name: "Kino 4",
    floor: "1.OG",
    area_m2: 130,
    description:
      "Малый кинозал на 2 этаже. Затемнённый, AV-инфраструктура.",
    best_for: "lasertag,exit_room,vr",
  },
  {
    name: "Kino 5",
    floor: "3.OG",
    area_m2: 227,
    description:
      "Средний зал с амфитеатром на 4 этаже. Подиум в задней части можно сохранить (двухуровневое пространство 227 м²) или убрать (открытая площадь 183 м²). Высокие потолки.",
    best_for: "climbing,trampoline,axe_throwing,crossfit",
  },
  {
    name: "Kino 6",
    floor: "3.OG",
    area_m2: 129,
    description: "Малый кинозал на 4 этаже. Затемнённый.",
    best_for: "lasertag,exit_room,vr",
  },
  {
    name: "Lumiera 170",
    floor: "5.OG",
    area_m2: 170,
    description:
      "Светлое камерное помещение с панорамными окнами на 6 этаже. Санузлы расположены этажом ниже (4 этаж). Спокойная атмосфера, подходит для wellness-форматов.",
    best_for: "pilates,yoga,physio,dance",
  },
  {
    name: "Гастро EG",
    floor: "EG",
    area_m2: 270,
    description:
      "Помещение на первом этаже здания со входом прямо с улицы. Имеется кухня, холодильная камера, моечная. Подходит для гастро/кафе/ресторанов.",
    best_for: "other",
  },
  {
    name: "Офис 4.OG",
    floor: "4.OG",
    area_m2: 134,
    description:
      "Офисный блок на 5 этаже: 3 кабинета по ~29 м², переговорная 37 м², теекухня. Подходит для тренинговых центров, образовательных проектов.",
    best_for: "training",
  },
];

async function main() {
  const url = process.env.LIBSQL_URL;
  if (!url) {
    console.error("LIBSQL_URL is not set. Put it in .env.local (e.g. LIBSQL_URL=file:local.db).");
    process.exit(1);
  }

  const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });

  let inserted = 0;
  let existing = 0;

  for (const s of SEED) {
    const before = await client.execute({
      sql: "SELECT id FROM spaces WHERE name = ?",
      args: [s.name],
    });
    if (before.rows.length > 0) {
      existing++;
      continue;
    }
    await client.execute({
      sql: `INSERT OR IGNORE INTO spaces
        (name, floor, area_m2, description, best_for, internal_notes)
        VALUES (?, ?, ?, ?, ?, '')`,
      args: [s.name, s.floor, s.area_m2, s.description, s.best_for],
    });
    inserted++;
  }

  console.log(
    `Seeded ${SEED.length} spaces (${inserted} new, ${existing} existing).`,
  );
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
