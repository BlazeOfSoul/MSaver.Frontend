import { z } from 'zod';

export const authResponseSchema = z.object({
    id: z.guid(),
    accessToken: z.jwt(),
    refreshToken: z.jwt(),
    clientId: z.guid(),
});

export const authRequestSchema = z.object({
    email: z.email(),
    password: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
export type AuthRequest = z.infer<typeof authRequestSchema>;
