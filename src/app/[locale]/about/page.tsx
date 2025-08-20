import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import PageLayout from '@/components/layout/PageLayout';
import { getPageMetadata } from '@/constants/metadata';
import { PROSE_STYLES } from '@/constants/styles';
import type { Metadata } from 'next';

// SSR対応
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const pageInfo = {
    ja: { title: '私たちについて', description: '私たちの会社概要とミッションについてご紹介します。' },
    en: { title: 'About Us', description: 'Learn about our company and mission.' },
  };
  
  return getPageMetadata(locale as 'ja' | 'en', pageInfo[locale as 'ja' | 'en']);
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);


  // サンプルコンテンツ
  const sampleContent = {
    ja: {
      title: '私たちについて',
      content: `
        <h2>私たちのミッション</h2>
        <p>私たちは、革新的なテクノロジーソリューションを通じて、より良い未来を創造することを使命としています。創業以来、常にお客様のニーズを最優先に考え、最高品質のサービスを提供してきました。</p>
        
        <h3>私たちの価値観</h3>
        <ul>
          <li><strong>革新性</strong> - 常に新しいアイデアと技術を追求します</li>
          <li><strong>品質</strong> - 妥協のない品質基準を維持します</li>
          <li><strong>信頼性</strong> - お客様との約束を必ず守ります</li>
          <li><strong>持続可能性</strong> - 環境と社会に配慮した事業活動を行います</li>
        </ul>
        
        <h3>会社概要</h3>
        <p>2010年に設立された当社は、テクノロジー分野でのリーディングカンパニーとして、国内外で高い評価をいただいています。東京本社を拠点に、全国に支店を展開し、グローバルな視点でビジネスを展開しています。</p>
        
        <blockquote>
          <p>「技術の力で、人々の生活をより豊かに」 - これが私たちの信念です。</p>
        </blockquote>
        
        <h3>チーム</h3>
        <p>私たちのチームは、多様なバックグラウンドを持つ専門家で構成されています。エンジニア、デザイナー、マーケター、そしてビジネスプロフェッショナルが一丸となって、お客様に最高の価値を提供します。</p>
      `
    },
    en: {
      title: 'About Us',
      content: `
        <h2>Our Mission</h2>
        <p>We are committed to creating a better future through innovative technology solutions. Since our founding, we have always prioritized our customers' needs and provided the highest quality services.</p>
        
        <h3>Our Values</h3>
        <ul>
          <li><strong>Innovation</strong> - We constantly pursue new ideas and technologies</li>
          <li><strong>Quality</strong> - We maintain uncompromising quality standards</li>
          <li><strong>Reliability</strong> - We always keep our promises to customers</li>
          <li><strong>Sustainability</strong> - We conduct business with consideration for the environment and society</li>
        </ul>
        
        <h3>Company Overview</h3>
        <p>Founded in 2010, our company has received high recognition both domestically and internationally as a leading company in the technology field. Based in our Tokyo headquarters, we have branches nationwide and conduct business from a global perspective.</p>
        
        <blockquote>
          <p>"Enriching lives through the power of technology" - This is our belief.</p>
        </blockquote>
        
        <h3>Our Team</h3>
        <p>Our team consists of experts from diverse backgrounds. Engineers, designers, marketers, and business professionals work together to provide the best value to our customers.</p>
      `
    }
  };

  const content = sampleContent[locale as keyof typeof sampleContent] || sampleContent.en;
  const breadcrumbItems = [{ title: content.title }];

  return (
    <>
      <PageLayout breadcrumbItems={breadcrumbItems} title={content.title}>
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <div
            dangerouslySetInnerHTML={{ __html: content.content }}
            className={PROSE_STYLES}
          />
        </article>
      </PageLayout>
    </>
  );
}
