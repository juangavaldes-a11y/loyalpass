import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import AppProviders from '@/providers/AppProviders';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '600'],
});

export const metadata = {
  title: 'LoyalPass Portal',
  description: 'Admin and client portal for loyalty program operations',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
