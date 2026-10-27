import type { ContactLeadWriter } from '@/lib/domain/content/contact';
import { prisma } from './prisma';

export const prismaContactLeadWriter: ContactLeadWriter = {
  async create(input) {
    await prisma.contactLead.create({ data: input });
  },
};
