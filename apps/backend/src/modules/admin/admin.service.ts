import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface ServiceStatus {
  configured: boolean;
  label: string;
  description: string;
  envVars: string[];
  docsUrl?: string;
}

export interface ConfigStatus {
  core: Record<string, ServiceStatus>;
  ai: Record<string, ServiceStatus>;
  social: Record<string, ServiceStatus>;
  storage: Record<string, ServiceStatus>;
  billing: Record<string, ServiceStatus>;
  notifications: Record<string, ServiceStatus>;
  video: Record<string, ServiceStatus>;
}

@Injectable()
export class AdminService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  getConfigStatus(): ConfigStatus {
    const has = (...keys: string[]) => keys.every(k => !!this.config.get(k));

    return {
      core: {
        database: {
          configured: has('DATABASE_URL'),
          label: 'PostgreSQL',
          description: 'Base de datos principal. En Railway se configura automáticamente al vincular el servicio.',
          envVars: ['DATABASE_URL'],
          docsUrl: 'https://railway.app/new/postgresql',
        },
        redis: {
          configured: has('REDIS_URL'),
          label: 'Redis',
          description: 'Cache y colas de trabajo. En Railway se configura automáticamente al vincular el servicio.',
          envVars: ['REDIS_URL'],
          docsUrl: 'https://railway.app/new/redis',
        },
        jwt: {
          configured: has('JWT_SECRET'),
          label: 'JWT Secret',
          description: 'Clave para firmar tokens de autenticación. Generá una cadena aleatoria de 64+ caracteres.',
          envVars: ['JWT_SECRET'],
        },
        encryption: {
          configured: has('ENCRYPTION_KEY'),
          label: 'Encryption Key',
          description: 'Clave AES-256 para cifrar tokens OAuth. Debe ser exactamente 64 caracteres hexadecimales.',
          envVars: ['ENCRYPTION_KEY'],
        },
      },
      ai: {
        anthropic: {
          configured: has('ANTHROPIC_API_KEY'),
          label: 'Anthropic Claude',
          description: 'Generación de contenido de texto (posts, reels, stories, guiones). REQUERIDO para la función principal.',
          envVars: ['ANTHROPIC_API_KEY'],
          docsUrl: 'https://console.anthropic.com/settings/keys',
        },
        gemini: {
          configured: has('GEMINI_API_KEY'),
          label: 'Google Gemini',
          description: 'Generación de imágenes con IA para posts y carruseles.',
          envVars: ['GEMINI_API_KEY'],
          docsUrl: 'https://aistudio.google.com/app/apikey',
        },
      },
      social: {
        meta: {
          configured: has('META_APP_ID', 'META_APP_SECRET'),
          label: 'Meta (Instagram + Facebook)',
          description: 'Publicación en Instagram y páginas de Facebook. Requiere app en Meta for Developers con permisos de publicación.',
          envVars: ['META_APP_ID', 'META_APP_SECRET'],
          docsUrl: 'https://developers.facebook.com/apps/',
        },
        linkedin: {
          configured: has('LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'),
          label: 'LinkedIn',
          description: 'Publicación en perfiles y páginas de empresa de LinkedIn.',
          envVars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
          docsUrl: 'https://www.linkedin.com/developers/apps',
        },
        x: {
          configured: has('X_CLIENT_ID', 'X_CLIENT_SECRET'),
          label: 'X (Twitter)',
          description: 'Publicación de tweets e hilos en X/Twitter.',
          envVars: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
          docsUrl: 'https://developer.twitter.com/en/portal/dashboard',
        },
        tiktok: {
          configured: has('TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'),
          label: 'TikTok',
          description: 'Publicación de videos en TikTok.',
          envVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
          docsUrl: 'https://developers.tiktok.com/apps/',
        },
        google_calendar: {
          configured: has('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'),
          label: 'Google Calendar',
          description: 'Sincronización de contenido programado con Google Calendar.',
          envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_REDIRECT_BASE'],
          docsUrl: 'https://console.cloud.google.com/apis/credentials',
        },
      },
      storage: {
        s3: {
          configured: has('S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'),
          label: 'S3 / MinIO Storage',
          description: 'Almacenamiento de imágenes y videos generados. Compatible con AWS S3 y MinIO self-hosted.',
          envVars: ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'],
          docsUrl: 'https://docs.aws.amazon.com/s3/',
        },
      },
      billing: {
        stripe: {
          configured: has('STRIPE_SECRET_KEY'),
          label: 'Stripe',
          description: 'Cobro de suscripciones y manejo de planes. Configura los Price IDs de cada plan en Stripe Dashboard.',
          envVars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_ENTERPRISE'],
          docsUrl: 'https://dashboard.stripe.com/apikeys',
        },
      },
      notifications: {
        email: {
          configured: has('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'),
          label: 'Email (SMTP)',
          description: 'Notificaciones por email: bienvenida, contenido listo, reportes mensuales. Compatible con Gmail, SendGrid, Resend, etc.',
          envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'],
          docsUrl: 'https://resend.com/docs/send-with-smtp',
        },
      },
      video: {
        creatify: {
          configured: has('CREATIFY_API_ID', 'CREATIFY_API_KEY'),
          label: 'Creatify Aurora',
          description: 'Generación de videos con avatares de IA. Requiere imagen del avatar + audio (TTS).',
          envVars: ['CREATIFY_API_ID', 'CREATIFY_API_KEY'],
          docsUrl: 'https://app.creatify.ai/dashboard',
        },
        tts_google: {
          configured: has('GOOGLE_TTS_API_KEY'),
          label: 'Google Cloud TTS',
          description: 'Conversión de guiones a audio para videos. Opción 1 de TTS.',
          envVars: ['GOOGLE_TTS_API_KEY'],
          docsUrl: 'https://console.cloud.google.com/apis/library/texttospeech.googleapis.com',
        },
        tts_elevenlabs: {
          configured: has('ELEVENLABS_API_KEY'),
          label: 'ElevenLabs TTS',
          description: 'Conversión de guiones a audio para videos. Opción 2 de TTS (voces más naturales).',
          envVars: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'],
          docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
        },
      },
    };
  }

  getSummary(): { total: number; configured: number; missing: string[] } {
    const status = this.getConfigStatus();
    const all = Object.values(status).flatMap(cat => Object.entries(cat)) as [string, ServiceStatus][];
    const missing = all.filter(([, s]) => !s.configured).map(([, s]) => s.label);
    return {
      total: all.length,
      configured: all.filter(([, s]) => s.configured).length,
      missing,
    };
  }
}
