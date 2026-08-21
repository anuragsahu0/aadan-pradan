import { z } from 'zod';
import { VIRTUAL_FREQUENCY_REGEX } from '@aadan-pradan/utils';
import { MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';

export const frequencyCodeParamSchema = z.object({
  frequencyCode: z
    .string()
    .trim()
    .regex(VIRTUAL_FREQUENCY_REGEX, 'Frequency must be formatted as XXX.XXX (e.g. 145.800)'),
});

export const frequencyParamSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(VIRTUAL_FREQUENCY_REGEX, 'Frequency must be formatted as XXX.XXX (e.g. 145.800)'),
});

export const createFrequencySchema = z.object({
  frequencyCode: z
    .string()
    .trim()
    .regex(VIRTUAL_FREQUENCY_REGEX, 'Frequency must be formatted as XXX.XXX (e.g. 145.800)'),
  name: z.string().trim().max(50).optional(),
  maxUsers: z.number().int().min(1).max(MAX_USERS_PER_FREQUENCY).default(MAX_USERS_PER_FREQUENCY),
});

export const joinFrequencySchema = z.object({
  frequencyCode: z
    .string()
    .trim()
    .regex(VIRTUAL_FREQUENCY_REGEX, 'Frequency must be formatted as XXX.XXX (e.g. 145.800)')
    .optional(),
});
