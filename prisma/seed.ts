import "dotenv/config";
import { PrismaClient, Role, LeadSource, LeadStatus, InteractionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("Seed: limpando dados existentes...");
  await prisma.interaction.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);

  console.log("Seed: criando usuarios...");
  const admin = await prisma.user.create({
    data: { name: "Administrador", email: "admin@sgc.com", passwordHash, role: Role.ADMIN },
  });
  const sdr = await prisma.user.create({
    data: { name: "Jessica", email: "sdr@sgc.com", passwordHash, role: Role.SDR },
  });
  const closer = await prisma.user.create({
    data: { name: "Shirley", email: "closer@sgc.com", passwordHash, role: Role.CLOSER },
  });

  console.log("Seed: criando leads de exemplo...");
  const leadsData = [
    {
      name: "Joao da Silva", phone: "(11) 98888-1111", source: LeadSource.WHATSAPP,
      product: "Plano Premium", estimatedValue: 2500, status: LeadStatus.NOVO,
      ownerId: sdr.id, nextFollowUp: daysFromNow(1), lastContact: daysFromNow(0),
      notes: "Cliente veio pelo anuncio do Instagram.",
    },    
  ];

  for (const data of leadsData) {
    const lead = await prisma.lead.create({ data });
    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        userId: lead.ownerId,
        type: InteractionType.NOTA,
        content: "Lead cadastrado no sistema.",
      },
    });
  }

  console.log("Seed concluido!");
  console.log("Usuarios criados (senha: 123456):");
  console.log(" - admin@sgc.com   (ADMIN)");
  console.log(" - sdr@sgc.com     (SDR)");
  console.log(" - closer@sgc.com  (CLOSER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
