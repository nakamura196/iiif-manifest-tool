import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/layout/Header';
import './globals.css';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import { getMetadata } from '@/constants/metadata';
import type { Metadata } from 'next';
import SessionProvider from '@/components/SessionProvider';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import UserMappingUpdater from '@/components/UserMappingUpdater';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return getMetadata(locale as 'ja' | 'en');
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: LayoutProps) {
  const locale = (await params).locale;
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as 'en' | 'ja')) {
    notFound();
  }

  // SSR対応
  setRequestLocale(locale);

  // getMessagesを同期的に呼び出すように変更
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <SnackbarProvider>
                <UserMappingUpdater />
                <Header />
                {children}
                <Footer />
              </SnackbarProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
