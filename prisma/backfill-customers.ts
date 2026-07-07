import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { normalizePhone } from "../src/lib/phone";

async function main() {
  const leads = await prisma.lead.findMany({ where: { customerId: null } });
  console.log(`Encontrados ${leads.length} lead(s) sem cliente vinculado.`);

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const lead of leads) {
    const phone = normalizePhone(lead.phone);
    if (!phone) {
      console.warn(`Lead ${lead.id} ("${lead.name}") tem telefone invalido: "${lead.phone}" — pulado.`);
      skipped++;
      continue;
    }

    let customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: lead.name, phone } });
      created++;
    } else {
      linked++;
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { customerId: customer.id, phone },
    });
  }

  console.log(`Concluido: ${created} cliente(s) criado(s), ${linked} lead(s) vinculado(s) a cliente ja existente, ${skipped} pulado(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());