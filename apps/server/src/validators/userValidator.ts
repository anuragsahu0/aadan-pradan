import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(50, 'Display name cannot exceed 50 characters'),
  email: z.string().trim().email('Invalid email address').optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1, 'User ID is required'),
});
