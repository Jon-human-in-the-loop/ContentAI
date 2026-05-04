import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private from: string;

  constructor(private config: ConfigService) {
    const host = config.get('SMTP_HOST');
    const user = config.get('SMTP_USER');
    const pass = config.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(config.get('SMTP_PORT', '587')),
        secure: config.get('SMTP_PORT', '587') === '465',
        auth: { user, pass },
      });
      this.from = config.get('SMTP_FROM', `ContentAI <${user}>`);
      this.logger.log(`Email service configured: ${host}`);
    } else {
      this.logger.warn('Email not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS to enable');
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}:`, err);
    }
  }

  async sendWelcome(to: string, name: string, orgName: string): Promise<void> {
    await this.send(
      to,
      '¡Bienvenido a ContentAI!',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#7c3aed">ContentAI</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Tu cuenta en <strong>${orgName}</strong> fue creada exitosamente.</p>
        <p>Empezá creando tu primer cliente y generando contenido con IA.</p>
        <a href="${this.getAppUrl()}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Abrir ContentAI →
        </a>
        <p style="color:#666;font-size:12px;margin-top:32px">ContentAI — Tu agencia de contenido con IA</p>
      </div>
      `,
    );
  }

  async sendContentReady(
    to: string,
    name: string,
    clientName: string,
    totalPieces: number,
    appUrl?: string,
  ): Promise<void> {
    await this.send(
      to,
      `✦ ${totalPieces} piezas listas para ${clientName}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#7c3aed">ContentAI</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Se generaron <strong>${totalPieces} piezas de contenido</strong> para <strong>${clientName}</strong>.</p>
        <p>Ingresá a ContentAI para revisarlas, aprobarlas y programar su publicación.</p>
        <a href="${appUrl || this.getAppUrl()}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Ver contenido generado →
        </a>
        <p style="color:#666;font-size:12px;margin-top:32px">ContentAI — Tu agencia de contenido con IA</p>
      </div>
      `,
    );
  }

  async sendMonthlyReport(
    to: string,
    name: string,
    stats: { piecesGenerated: number; piecesPublished: number; tokensUsed: number; costUsd: number },
  ): Promise<void> {
    const month = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    await this.send(
      to,
      `Resumen mensual de ContentAI — ${month}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#7c3aed">ContentAI — Resumen ${month}</h1>
        <p>Hola <strong>${name}</strong>, acá está tu resumen del mes:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr style="background:#f5f3ff">
            <td style="padding:12px;border-radius:8px 0 0 8px"><strong>Piezas generadas</strong></td>
            <td style="padding:12px;text-align:right;font-size:1.5rem;font-weight:bold;color:#7c3aed">${stats.piecesGenerated}</td>
          </tr>
          <tr>
            <td style="padding:12px"><strong>Piezas publicadas</strong></td>
            <td style="padding:12px;text-align:right;font-size:1.5rem;font-weight:bold;color:#10b981">${stats.piecesPublished}</td>
          </tr>
          <tr style="background:#f5f3ff">
            <td style="padding:12px;border-radius:0 0 0 8px"><strong>Tokens de IA usados</strong></td>
            <td style="padding:12px;text-align:right">${(stats.tokensUsed / 1000).toFixed(1)}k</td>
          </tr>
          <tr>
            <td style="padding:12px"><strong>Costo total IA</strong></td>
            <td style="padding:12px;text-align:right">$${stats.costUsd.toFixed(2)} USD</td>
          </tr>
        </table>
        <a href="${this.getAppUrl()}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:24px">
          Ver analytics completos →
        </a>
        <p style="color:#666;font-size:12px;margin-top:32px">ContentAI — Tu agencia de contenido con IA</p>
      </div>
      `,
    );
  }

  async sendPaymentFailed(to: string, name: string): Promise<void> {
    await this.send(
      to,
      '⚠️ Problema con tu pago en ContentAI',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#ef4444">Problema con tu pago</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>No pudimos procesar tu pago de suscripción. Actualizá tu método de pago para continuar usando ContentAI.</p>
        <a href="${this.getAppUrl()}?billing=portal" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Actualizar método de pago →
        </a>
      </div>
      `,
    );
  }

  async sendPublishFailed(to: string, name: string, platform: string, error: string): Promise<void> {
    await this.send(
      to,
      `⚠️ Publicación fallida en ${platform} — ContentAI`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#ef4444">Publicación fallida</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Uno de tus posts programados en <strong>${platform}</strong> no pudo publicarse después de varios intentos.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0">
          <p style="margin:0;font-size:13px;color:#991b1b"><strong>Error:</strong> ${error}</p>
        </div>
        <p>Esto suele ocurrir cuando el token de acceso expiró. Reconectá la cuenta desde Configuración:</p>
        <a href="${this.getAppUrl()}?settings=true&section=social" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Reconectar cuenta →
        </a>
        <p style="color:#666;font-size:12px;margin-top:32px">ContentAI — Tu agencia de contenido con IA</p>
      </div>
      `,
    );
  }

  private getAppUrl(): string {
    return this.config.get('FRONTEND_URL', 'http://localhost:3000');
  }
}
