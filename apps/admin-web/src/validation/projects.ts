import { z } from 'zod';

export const addProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  visibility: z.enum(['public', 'private']),
  pmUserId: z.string().nullable(),
});

export type AddProjectFormValues = z.infer<typeof addProjectSchema>;
