import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("Banco já populado, pulando seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("senha1234", 10);

  const ash = await prisma.user.create({
    data: {
      name: "Ash Ketchum",
      email: "ash@example.com",
      passwordHash,
      phone: "11999990001",
      city: "São Paulo",
      state: "SP",
    },
  });

  const misty = await prisma.user.create({
    data: {
      name: "Misty Waterflower",
      email: "misty@example.com",
      passwordHash,
      phone: "21999990002",
      city: "Rio de Janeiro",
      state: "RJ",
    },
  });

  const folder = await prisma.folder.create({
    data: {
      userId: ash.id,
      name: "Coleção Base Set",
      description: "Cartas da primeira edição do Base Set em bom estado.",
    },
  });

  await prisma.listing.createMany({
    data: [
      {
        userId: ash.id,
        folderId: folder.id,
        type: "CARTA",
        title: "Charizard Base Set 4/102 Holo",
        description: "Carta clássica, sem dobras, cantos levemente batidos.",
        setName: "Base Set",
        cardNumber: "4/102",
        rarity: "Rara Holo",
        language: "Inglês",
        condition: "EXCELENTE",
        quantity: 1,
        priceCents: 150000,
      },
      {
        userId: ash.id,
        folderId: folder.id,
        type: "CARTA",
        title: "Blastoise Base Set 2/102 Holo",
        setName: "Base Set",
        cardNumber: "2/102",
        rarity: "Rara Holo",
        language: "Inglês",
        condition: "BOA",
        quantity: 1,
        priceCents: 90000,
      },
      {
        userId: misty.id,
        type: "PACOTE",
        title: "Booster Escarlate e Violeta lacrado",
        description: "Pacote lacrado de fábrica, direto da caixa.",
        setName: "Escarlate e Violeta",
        language: "Português",
        condition: "LACRADO",
        quantity: 3,
        priceCents: 4500,
      },
    ],
  });

  console.log("Seed concluído.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
