import { z } from 'zod';
import { SEARCH_TYPES } from './types';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  type: z.enum(SEARCH_TYPES).default('all'),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

export const suggestQuerySchema = z.object({ q: z.string().trim().min(2).max(80) });
