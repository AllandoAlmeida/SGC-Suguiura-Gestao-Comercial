import { PrismaClient, Role, LeadSource, LeadStatus, InteractionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    data: { name: "Ana SDR", email: "sdr@sgc.com", passwordHash, role: Role.SDR },
  });
  const closer = await prisma.user.create({
    data: { name: "Carlos Closer", email: "closer@sgc.com", passwordHash, role: Role.CLOSER },
  });

  console.log("Seed: criando leads de exemplo...");
  const leadsData = [
    {
      name: "Joao da Silva", phone: "(11) 98888-1111", source: LeadSource.WHATSAPP,
      product: "Plano Premium", estimatedValue: 2500, status: LeadStatus.NOVO,
      ownerId: sdr.id, nextFollowUp: daysFromNow(1), lastContact: daysFromNow(0),
      notes: "Cliente veio pelo anuncio do Instagram.",
    },
    {
      name: "Maria Oliveira", phone: "(11) 97777-2222", source: LeadSource.LOJA,
      product: "Kit Inicial", estimatedValue: 800, status: LeadStatus.QUALIFICADO,
      ownerId: sdr.id, nextFollowUp: daysFromNow(2), lastContact: daysFromNow(-1),
      notes: "Diagnostico feito, interessada no plano anual.",
    },
    {
      name: "Pedro Santos", phone: "(21) 96666-3333", source: LeadSource.EMAIL,
      product: "Consultoria", estimatedValue: 5000, status: LeadStatus.ORCAMENTO,
      ownerId: closer.id, nextFollowUp: daysFromNow(0), lastContact: daysFromNow(-2),
      notes: "Aguardando aprovacao do orcamento.",
    },
    {
      name: "Lucia Ferreira", phone: "(31) 95555-4444", source: LeadSource.PROSPECCAO,
      product: "Plano Empresarial", estimatedValue: 12000, status: LeadStatus.NEGOCIACAO,
      ownerId: closer.id, nextFollowUp: daysFromNow(-2), lastContact: daysFromNow(-5),
      notes: "Negociando desconto para fechamento em 12x.",
    },
    {
      name: "Roberto Lima", phone: "(41) 94444-5555", source: LeadSource.WHATSAPP,
      product: "Plano Premium", estimatedValue: 2500, status: LeadStatus.FECHADO,
      ownerId: closer.id, nextFollowUp: daysFromNow(30), lastContact: daysFromNow(-1),
      notes: "Venda fechada! Pos-venda agendado.",
    },
    {
      name: "Fernanda Costa", phone: "(51) 93333-6666", source: LeadSource.LOJA,
      product: "Kit Inicial", estimatedValue: 800, status: LeadStatus.PERDIDO,
      ownerId: sdr.id, nextFollowUp: daysFromNow(60), lastContact: daysFromNow(-10),
      notes: "Comprou de concorrente. Tentar recuperar em 2 meses.",
    },
    {
      name: "Marcos Souza", phone: "(11) 92222-7777", source: LeadSource.PROSPECCAO,
      product: "Consultoria", estimatedValue: 5000, status: LeadStatus.NEGOCIACAO,
      ownerId: closer.id, nextFollowUp: daysFromNow(0), lastContact: daysFromNow(-3),
      notes: "Decisor final responde amanha.",
    },
    {
      name: "Juliana Alves", phone: "(11) 91111-8888", source: LeadSource.WHATSAPP,
      product: "Plano Premium", estimatedValue: 2500, status: LeadStatus.NOVO,
      ownerId: sdr.id, nextFollowUp: daysFromNow(3), lastContact: null,
      notes: "Primeiro contato pendente.",
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
