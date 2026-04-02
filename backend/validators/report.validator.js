import { z } from 'zod';

export const createReportSchema = z.object({
  animalType: z.string().min(1, "Animal type is required"),
  animalCondition: z.string().min(1, "Animal condition is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  imageDataUrl: z.string().optional(),
  imageHash: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional()
}).passthrough(); // Allow extra fields like `id`

export const updateReportStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'fake', 'accepted']),
  treatedImageDataUrl: z.string().optional()
});
