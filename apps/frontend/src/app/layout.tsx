import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ContentAI — AI Content Platform',
  description: 'Plataforma de generación de contenido con IA para agencias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
