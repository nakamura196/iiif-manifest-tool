import { promises as fs } from 'fs';
import path from 'path';
import { FAQClient } from './FAQClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  return {
    title: isJa ? 'よくある質問 - 画像コレクション管理' : 'FAQ - Image Collection Manager',
    description: isJa
      ? '画像コレクション管理ツールの使い方に関するよくある質問'
      : 'Frequently asked questions about using the Image Collection Manager',
  };
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  // Read FAQ content from markdown file
  const faqPath = path.join(process.cwd(), 'docs', isJa ? 'faq.md' : 'en/faq.md');
  const faqContent = await fs.readFile(faqPath, 'utf-8');

  return <FAQClient faqContent={faqContent} locale={locale} />;
}
