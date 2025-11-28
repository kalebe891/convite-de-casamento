import { z } from 'zod';

// Guest validation schema
export const guestSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  phone: z.string()
    .trim()
    .min(1, 'Telefone é obrigatório')
    .regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, 'Telefone deve estar no formato (xx) xxxxx-xxxx'),
  email: z.string()
    .trim()
    .email('E-mail inválido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres')
    .optional()
    .or(z.literal('')),
});

// Invitation validation schema
export const invitationSchema = z.object({
  guestName: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  guestEmail: z.string()
    .trim()
    .email('E-mail inválido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres')
    .optional()
    .or(z.literal('')),
  guestPhone: z.string()
    .trim()
    .regex(/^(\+?[1-9]\d{0,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/, 'Telefone inválido')
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
});

// Buffet item validation schema
export const buffetItemSchema = z.object({
  item_name: z.string()
    .trim()
    .min(1, 'Nome do item é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  category: z.string()
    .trim()
    .max(100, 'Categoria deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
});

// Timeline event validation schema
export const timelineEventSchema = z.object({
  time: z.string()
    .trim()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use formato HH:MM)')
    .max(10, 'Horário deve ter no máximo 10 caracteres'),
  activity: z.string()
    .trim()
    .min(1, 'Atividade é obrigatória')
    .max(200, 'Atividade deve ter no máximo 200 caracteres'),
});

// Playlist song validation schema
export const playlistSongSchema = z.object({
  song_name: z.string()
    .trim()
    .min(1, 'Nome da música é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  artist: z.string()
    .trim()
    .max(200, 'Nome do artista deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  moment: z.string()
    .trim()
    .min(1, 'Momento é obrigatório')
    .max(100, 'Momento deve ter no máximo 100 caracteres'),
});

// Event validation schema
export const eventSchema = z.object({
  event_type: z.string()
    .trim()
    .min(1, 'Tipo do evento é obrigatório')
    .max(100, 'Tipo deve ter no máximo 100 caracteres'),
  event_name: z.string()
    .trim()
    .min(1, 'Nome do evento é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  event_date: z.string()
    .trim()
    .min(1, 'Data e horário são obrigatórios'),
  location: z.string()
    .trim()
    .max(200, 'Local deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .trim()
    .max(500, 'Endereço deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  maps_url: z.string()
    .trim()
    .url('URL inválida')
    .max(500, 'URL deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  description: z.string()
    .trim()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),
});
