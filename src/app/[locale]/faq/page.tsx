import { FiHelpCircle, FiChevronDown } from 'react-icons/fi';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  return {
    title: isJa ? 'よくある質問 - 画像コレクション管理' : 'FAQ - Image Collection Manager',
    description: isJa
      ? '画像コレクション管理ツールの使い方に関するよくある質問'
      : 'Frequently asked questions about using the Image Collection Manager',
  };
}

export default async function FAQPage({ params }: PageProps) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <FiHelpCircle className="text-6xl" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {isJa ? 'よくある質問' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-xl text-blue-100">
              {isJa
                ? '画像コレクション管理ツールの使い方に関するよくある質問'
                : 'Common questions about using the Image Collection Manager'}
            </p>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">
              {isJa ? 'カテゴリー' : 'Categories'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <a
                href="#basic"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="text-2xl">📚</span>
                <span className="font-medium">{isJa ? '基本的な使い方' : 'Basic Usage'}</span>
              </a>
              <a
                href="#iiif"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="text-2xl">🖼️</span>
                <span className="font-medium">{isJa ? 'IIIFについて' : 'About IIIF'}</span>
              </a>
              <a
                href="#images"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="text-2xl">📸</span>
                <span className="font-medium">{isJa ? '画像の追加方法' : 'Adding Images'}</span>
              </a>
              <a
                href="#selfmuseum"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="text-2xl">🏛️</span>
                <span className="font-medium">{isJa ? 'Self Museumとの連携' : 'Self Museum Integration'}</span>
              </a>
              <a
                href="#api"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="text-2xl">🔧</span>
                <span className="font-medium">{isJa ? 'API・技術的な質問' : 'API & Technical'}</span>
              </a>
            </div>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-12">
            {/* Basic Usage */}
            <section id="basic">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📚</span>
                <h2 className="text-2xl font-bold">
                  {isJa ? '基本的な使い方' : 'Basic Usage'}
                </h2>
              </div>
              <div className="space-y-4">
                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'このツールは何ができますか？' : 'What can this tool do?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'このツールは、画像コレクションを管理し、IIIF（International Image Interoperability Framework）形式のマニフェストを自動生成します。作成したコレクションはSelf Museumなどのビューアで表示できます。'
                          : 'This tool manages image collections and automatically generates IIIF (International Image Interoperability Framework) manifests. Created collections can be displayed in viewers such as Self Museum.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? '手元の写真をアップロードできますか？' : 'Can I upload my own photos?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'はい、できます。スマホで撮影した写真やパソコンに保存されている画像ファイル（JPG、PNG、GIF、WebP）をアップロードすると、自動的にIIIF形式のマニフェストとして公開されます。アップロード後、タイトル、説明、メタデータなどを追加できます。'
                          : 'Yes, you can. Upload photos taken with your smartphone or image files (JPG, PNG, GIF, WebP) saved on your computer, and they will automatically be published as IIIF manifests. After uploading, you can add titles, descriptions, metadata, and more.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'コレクションとアイテムの違いは何ですか？' : 'What is the difference between a collection and an item?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'コレクションは「展示室」のようなもので、複数のアイテム（作品）をまとめる単位です。アイテムは個別の作品や画像を表します。1つのコレクションに複数のアイテムを追加できます。'
                          : 'A collection is like an "exhibition room" that groups multiple items (works). An item represents an individual work or image. You can add multiple items to one collection.'}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </section>

            {/* IIIF */}
            <section id="iiif">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🖼️</span>
                <h2 className="text-2xl font-bold">
                  {isJa ? 'IIIFについて' : 'About IIIF'}
                </h2>
              </div>
              <div className="space-y-4">
                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'IIIF info.jsonとマニフェストURLの違いは何ですか？' : 'What is the difference between IIIF info.json and manifest URL?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? '**IIIF info.json**は、単一画像の情報（サイズ、タイル情報など）を提供するIIIF Image APIのエンドポイントです（例：https://example.com/iiif/image123/info.json）。'
                          : '**IIIF info.json** is an IIIF Image API endpoint that provides information about a single image (size, tile information, etc.) (e.g., https://example.com/iiif/image123/info.json).'}
                      </p>
                      <br />
                      <p className="mb-2">
                        {isJa
                          ? '**マニフェストURL**は、作品全体の情報（タイトル、説明、複数ページの画像など）を提供するIIIF Presentation APIのドキュメントです（例：https://example.com/iiif/manifest.json）。'
                          : '**Manifest URL** is an IIIF Presentation API document that provides information about the entire work (title, description, multi-page images, etc.) (e.g., https://example.com/iiif/manifest.json).'}
                      </p>
                      <br />
                      <p className="mb-2">
                        {isJa
                          ? 'マニフェストURLを使用する場合は、「IIIF Manifest」タブから追加してください。'
                          : 'To use a manifest URL, add it from the "IIIF Manifest" tab.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'どこからIIIF画像を取得できますか？' : 'Where can I get IIIF images?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? '多くの美術館、図書館、博物館がIIIF形式で画像を公開しています。例えば、慶應義塾大学（https://dcollections.lib.keio.ac.jp/）、国立国会図書館デジタルコレクション、メトロポリタン美術館などがあります。各機関のウェブサイトで「IIIF」や「manifest.json」を探してください。'
                          : 'Many museums, libraries, and galleries publish images in IIIF format. Examples include Keio University (https://dcollections.lib.keio.ac.jp/), National Diet Library Digital Collections, and the Metropolitan Museum of Art. Search for "IIIF" or "manifest.json" on their websites.'}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </section>

            {/* Images */}
            <section id="images">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📸</span>
                <h2 className="text-2xl font-bold">
                  {isJa ? '画像の追加方法' : 'Adding Images'}
                </h2>
              </div>
              <div className="space-y-4">
                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? '画像を追加する方法は何種類ありますか？' : 'How many ways can I add images?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">{isJa ? '5つの方法があります：' : 'There are 5 ways:'}</p>
                      <br />
                      {isJa ? (
                        <>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">1. Upload</span>
                            <span className="text-gray-600 dark:text-gray-400"> - ファイルを直接アップロード</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">2. URLから</span>
                            <span className="text-gray-600 dark:text-gray-400"> - 画像ファイルのURLを入力</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">3. IIIF info.json</span>
                            <span className="text-gray-600 dark:text-gray-400"> - IIIF Image APIのinfo.json URLを入力</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">4. IIIF Manifest</span>
                            <span className="text-gray-600 dark:text-gray-400"> - 単一のIIIFマニフェストURLを入力</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">5. IIIF Collection</span>
                            <span className="text-gray-600 dark:text-gray-400"> - 複数のマニフェストを一括インポート</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">1. Upload</span>
                            <span className="text-gray-600 dark:text-gray-400"> - Direct file upload</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">2. From URL</span>
                            <span className="text-gray-600 dark:text-gray-400"> - Enter image file URL</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">3. IIIF info.json</span>
                            <span className="text-gray-600 dark:text-gray-400"> - Enter IIIF Image API info.json URL</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">4. IIIF Manifest</span>
                            <span className="text-gray-600 dark:text-gray-400"> - Enter single IIIF manifest URL</span>
                          </div>
                          <div className="ml-4 mb-2">
                            <span className="font-semibold">5. IIIF Collection</span>
                            <span className="text-gray-600 dark:text-gray-400"> - Batch import multiple manifests</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? '対応している画像形式は何ですか？' : 'What image formats are supported?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'JPG、PNG、GIF、WebP、TIFF形式の画像に対応しています。1ファイルあたり最大10MBまでアップロードできます。'
                          : 'JPG, PNG, GIF, WebP, and TIFF formats are supported. You can upload up to 10MB per file.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? '画像の順序を変更できますか？' : 'Can I change the order of images?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'はい、アイテム編集ページの「画像管理」タブで、各画像の「前へ移動」「次へ移動」ボタンを使って順序を変更できます。'
                          : 'Yes, on the item edit page under the "Image Management" tab, you can change the order using the "Move Previous" and "Move Next" buttons for each image.'}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </section>

            {/* Self Museum */}
            <section id="selfmuseum">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🏛️</span>
                <h2 className="text-2xl font-bold">
                  {isJa ? 'Self Museumとの連携' : 'Self Museum Integration'}
                </h2>
              </div>
              <div className="space-y-4">
                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'Self Museumで表示されるテキストを編集できますか？' : 'Can I edit the text displayed in Self Museum?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-4">{isJa ? 'はい、できます。以下の方法で編集してください：' : 'Yes, you can. Edit using the following methods:'}</p>

                      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="font-bold text-lg mb-3">
                          {isJa ? '展示室のタイトル' : 'Exhibition Room Title'}
                        </p>
                        <div className="space-y-2 text-sm">
                          <p className="flex items-start">
                            <span className="mr-2">①</span>
                            <span>{isJa ? 'ダッシュボードでコレクション一覧を表示' : 'Display collection list on Dashboard'}</span>
                          </p>
                          <p className="flex items-start">
                            <span className="mr-2">②</span>
                            <span>{isJa ? '編集したいコレクションのカードにある「⋮」（メニュー）ボタンをクリック' : 'Click the "⋮" (menu) button on the collection card'}</span>
                          </p>
                          <p className="flex items-start">
                            <span className="mr-2">③</span>
                            <span>{isJa ? 'メニューから「コレクション設定」を選択' : 'Select "Collection Settings" from the menu'}</span>
                          </p>
                          <p className="flex items-start">
                            <span className="mr-2">④</span>
                            <span>{isJa ? '基本情報セクションで日本語・英語のタイトルを編集' : 'Edit Japanese and English titles in the Basic Information section'}</span>
                          </p>
                          <p className="flex items-start">
                            <span className="mr-2">⑤</span>
                            <span>{isJa ? '画面右上の「保存」ボタンをクリック' : 'Click the "Save" button at the top right'}</span>
                          </p>
                        </div>
                        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                          {isJa
                            ? '※ 注意：Self Museumでは展示室のタイトルのみが表示されます。説明欄はこのツール内での管理用です。'
                            : '* Note: Self Museum displays only the exhibition room title. The description field is for management within this tool.'}
                        </p>
                      </div>

                      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="font-bold text-base mb-2">
                          {isJa ? '各資料の解説・コメント' : 'Individual Item Descriptions'}
                        </p>
                        <p className="text-sm mb-2">
                          {isJa ? 'コレクション内の個別のアイテム（作品）の情報を編集できます：' : 'Edit information for individual items (works) within a collection:'}
                        </p>
                        <ul className="text-sm space-y-1 ml-4 list-disc">
                          <li>{isJa ? 'アイテムを開いて「編集」をクリック' : 'Open an item and click "Edit"'}</li>
                          <li>{isJa ? '「基本情報」タブでタイトルと説明を編集（複数行可）' : 'Edit title and description in the "Basic Information" tab'}</li>
                          <li>{isJa ? '「メタデータ」タブでカスタムフィールド（作成年、作者など）を追加' : 'Add custom fields in the "Metadata" tab'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'Self Museumで表示されるまでどのくらいかかりますか？' : 'How long does it take to appear in Self Museum?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? '保存後すぐに反映されます。コレクションを「公開」に設定していることを確認してください。ダッシュボードの「Self Museumで表示」ボタンをクリックすると、現在の状態が表示されます。'
                          : 'Changes are reflected immediately after saving. Make sure your collection is set to "Public". Click the "View in Self Museum" button on the Dashboard to see the current state.'}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </section>

            {/* API & Technical */}
            <section id="api">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🔧</span>
                <h2 className="text-2xl font-bold">
                  {isJa ? 'API・技術的な質問' : 'API & Technical Questions'}
                </h2>
              </div>
              <div className="space-y-4">
                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'APIを使って外部からアクセスできますか？' : 'Can I access from external sources using the API?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'はい、できます。公開コレクションはIIIF Presentation API v3形式で提供されます。APIエンドポイントは以下の形式です：'
                          : 'Yes, you can. Public collections are provided in IIIF Presentation API v3 format. API endpoints are in the following format:'}
                      </p>
                      <br />
                      <p>
                        <span>{isJa ? '- コレクション一覧：' : '- Collection list: '}</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                          /api/iiif/3/[userId]/collections/collection.json
                        </code>
                      </p>
                      <p>
                        <span>{isJa ? '- 個別マニフェスト：' : '- Individual manifest: '}</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                          /api/iiif/3/[userId]/[collectionId]/[itemId]/manifest.json
                        </code>
                      </p>
                      <br />
                      <p className="mb-2">
                        {isJa ? '詳細は「API認証情報」ページをご覧ください。' : 'See the "API Authentication Info" page for details.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? '位置情報を追加できますか？' : 'Can I add location information?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'はい、できます。アイテム編集ページの「位置情報」タブで、地図をクリックして緯度・経度を設定できます。位置情報はIIIFマニフェストのnavPlaceフィールドとして出力されます。'
                          : 'Yes, you can. On the item edit page under the "Location" tab, you can click on the map to set latitude and longitude. Location information is output as the navPlace field in the IIIF manifest.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <summary className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <h3 className="font-semibold text-lg pr-4">
                      {isJa ? 'ジオリファレンス（地理参照）機能とは何ですか？' : 'What is the georeferencing feature?'}
                    </h3>
                    <FiChevronDown className="text-xl text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="mb-2">
                        {isJa
                          ? 'ジオリファレンスは、古地図などの画像上の座標を実際の地理座標にマッピングする機能です。アイテム編集ページの「ジオリファレンス」タブで、CSVファイルをインポートして複数のポイントを一括登録できます。IIIF Georeferencing Extension形式で出力されます。'
                          : 'Georeferencing is a feature that maps coordinates on images (such as old maps) to actual geographic coordinates. On the item edit page under the "Georeferencing" tab, you can import CSV files to register multiple points at once. Output is in IIIF Georeferencing Extension format.'}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </section>
          </div>

          {/* Call to Action */}
          <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {isJa ? 'さらに質問がありますか？' : 'Have More Questions?'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isJa
                ? 'このFAQで解決しない問題がある場合は、API認証情報ページでSwagger UIを確認するか、 GitHubのIssuesで質問してください。'
                : 'If you have issues not covered by this FAQ, check the Swagger UI on the API Authentication Info page or ask questions on GitHub Issues.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/api-doc/auth-info`}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {isJa ? 'API認証情報を見る' : 'View API Auth Info'}
              </Link>
              <a
                href="https://github.com/nakamura196/iiif-manifest-tool"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {isJa ? 'GitHubで質問' : 'Ask on GitHub'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
