import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'AI Webtoon Platform',
  description: 'AI-powered webtoon story explainer and video generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <Providers>{children}</Providers>
        </ThemeRegistry>
      </body>
    </html>
  );
}
