import { z } from 'zod';

// W07 mục 2: form hợp tác chỉ nhận các trường cần cho ContactLead.
export const ContactInputSchema = z.object({
  type: z.enum(['CO_SO', 'PHONG_MACH', 'QUANG_CAO', 'KHAC']),
  org: z.string().trim().min(2).max(200),
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại cần có 10 chữ số'),
  email: z.email().max(254),
  message: z.string().trim().min(10).max(3000),
  captchaToken: z.string().optional(),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

export type ContactLeadInput = Omit<ContactInput, 'captchaToken'>;
export interface ContactLeadWriter {
  create(input: ContactLeadInput): Promise<void>;
}
