import { z } from "zod";

export const createFileSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  type: z.enum(['file', 'folder']).default('file')
});

export const updateFileSchema = z.object({
  name: z.string().min(1),
  content: z.string()
});

export const executeCommandSchema = z.object({
  command: z.string().min(1)
});

export const webBuilderActionSchema = z.object({
  action: z.enum(['create_file', 'update_file', 'delete_file', 'run_command', 'create_folder']),
  params: z.record(z.any())
});

export type CreateFile = z.infer<typeof createFileSchema>;
export type UpdateFile = z.infer<typeof updateFileSchema>;
export type ExecuteCommand = z.infer<typeof executeCommandSchema>;
export type WebBuilderAction = z.infer<typeof webBuilderActionSchema>;