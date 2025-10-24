import { z } from 'zod';

// Generic API Response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional(),
      })
      .optional(),
    timestamp: z.string(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
};

// Authentication types
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().min(13).max(120),
  location: z.object({
    country: z.string(),
    province: z.string(),
    city: z.string(),
    postalCode: z.string(),
  }),
});

export const AuthResponseSchema = z.object({
  user: z.object({
    userId: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    subscriptionTier: z.enum(['free', 'premium']),
    onboardingCompleted: z.boolean(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Error codes
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;