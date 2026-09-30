import React, { useState } from 'react';

const STRINGS = {
  appName: 'RatingImages',
  editPlaceholder: 'Введіть тему (вода, cat, car, kyiv, forest)...',
  btnSend: 'Go!',
  download: 'Download',
  downloading: 'Завантаження...',
  welcomeBack: 'WELCOME BACK',
  sourceLabel: 'Джерело:',
  visitSite: 'Перейти на сайт',
  noImages: 'Введіть тему для пошуку або перегляньте початкові фото',
};

interface ImageItem {
  id: string | number;
  url: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
}

const INITIAL_IMAGES: ImageItem[] = [
  {
    id: 'init-1',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=1000&auto=format&fit=crop&q=80',
    title: 'Краплі води',
    sourceUrl: 'https://unsplash.com/photos/water-drop',
    sourceDomain: 'unsplash.com',
  },
  {
    id: 'init-2',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
    title: 'Океанські хвилі',
    sourceUrl: 'https://unsplash.com/photos/ocean-waves',
    sourceDomain: 'unsplash.com',
  },
  {
    id: 'init-3',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1000&auto=format&fit=crop&q=80',
    title: 'Кіт',
    sourceUrl: 'https://unsplash.com/photos/cat-looking',
    sourceDomain: 'unsplash.com',
  },
];


const hasCyrillic = (s: string) => /[\u0400-\u04FF]/.test(s);

async function translateToEnglish(query: string): Promise<string> {
  if (!hasCyrillic(query)) return query;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=uk|en`
    );
    const data = await res.json();
    const text = data?.responseData?.translatedText;
    return text && typeof text === 'string' ? text.trim() : query;
  } catch {
    return query;
  }
}

async function searchOpenverse(query: string): Promise<ImageItem[]> {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&category=photograph&page_size=30`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Openverse error');
  const data = await res.json();

  return (data.results || [])
    .filter((r: any) => r.thumbnail || r.url)
    .map((r: any) => ({
      id: r.id,
      url: r.thumbnail || r.url, 
      title: r.title || query,
      sourceUrl: r.foreign_landing_url || r.url,
      sourceDomain: (() => {
        try {
          return new URL(r.foreign_landing_url || r.url).hostname.replace('www.', '');
        } catch {
          return r.source || 'openverse.org';
        }
      })(),
    }));
}

async function searchCommons(query: string): Promise<ImageItem[]> {
  const endpoint =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}` +
    `&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|mime&iiurlwidth=1200` +
    `&format=json&origin=*`;
  const res = await fetch(endpoint);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {}) as any[];

  return pages
    .filter((p) => {
      const mime = (p.imageinfo?.[0]?.mime || '').toLowerCase();
      return mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
    })
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)) // порядок за релевантністю
    .map((p) => {
      const info = p.imageinfo[0];
      return {
        id: p.pageid,
        url: info.thumburl || info.url,
        title: p.title.replace(/^File:/i, ''),
        sourceUrl: info.descriptionurl || 'https://commons.wikimedia.org',
        sourceDomain: 'wikimedia.org',
      };
    });
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>(INITIAL_IMAGES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Лічильники оцінок
  const [likedCount, setLikedCount] = useState(0);
  const [dislikedCount, setDislikedCount] = useState(0);

  const currentImage = images[currentIndex];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsLoading(true);
    setError(null);

    try {
      const englishQuery = await translateToEnglish(query);

      let results: ImageItem[] = [];
      try {
        results = await searchOpenverse(englishQuery);
      } catch {
      }

      if (results.length === 0) {
        results = await searchCommons(englishQuery);
      }

      if (results.length === 0) {
        setError(`За запитом «${query}» нічого не знайдено. Спробуйте інше слово.`);
      } else {
        setImages(results);
        setCurrentIndex(0);
      }
    } catch {
      setError('Помилка мережі при отриманні зображень.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = (type: 'like' | 'dislike') => {
    if (images.length === 0) return;

    if (type === 'like') setLikedCount((prev) => prev + 1);
    if (type === 'dislike') setDislikedCount((prev) => prev + 1);

    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleDownload = async () => {
    if (!currentImage || isDownloading) return;

    setIsDownloading(true);
    try {
      const response = await fetch(currentImage.url, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `rating_${currentImage.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = currentImage.url;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noreferrer';
      fallbackLink.download = `rating_${currentImage.id}.jpg`;
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImageError = () => {
    if (images.length <= 1) {
      setError('Не вдалося завантажити зображення');
      return;
    }

    setImages((prev) => prev.filter((_, idx) => idx !== currentIndex));
    setCurrentIndex((prev) => (prev >= images.length - 1 ? 0 : prev));
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center sm:py-6 sm:px-4">
      <div className="w-full max-w-lg min-h-screen sm:min-h-0 sm:h-[860px] bg-slate-900 sm:rounded-3xl sm:border sm:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        <header className="p-4 bg-slate-900/95 sticky top-0 z-20 border-b border-slate-800 backdrop-blur">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={STRINGS.editPlaceholder}
                className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-white placeholder-slate-400 transition"
              />
              <button
                type="submit"
                aria-label="Шукати"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition shadow"
            >
              {isLoading ? '...' : STRINGS.btnSend}
            </button>
          </form>

          {currentImage && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-800">
              <span className="truncate max-w-[200px]">
                {STRINGS.sourceLabel} <span className="text-slate-200 font-semibold">{currentImage.sourceDomain}</span>
              </span>
              <a
                href={currentImage.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium ml-2"
              >
                <span>{STRINGS.visitSite}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </header>

        <main className="flex-1 relative flex items-center justify-center p-3 bg-slate-950/40 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Шукаємо реальні фото «{searchQuery}»...</p>
            </div>
          ) : error ? (
            <div className="text-center p-4">
              <p className="text-rose-400 text-sm mb-2">{error}</p>
              <button
                onClick={() => {
                  setImages(INITIAL_IMAGES);
                  setCurrentIndex(0);
                  setError(null);
                }}
                className="text-xs text-sky-400 underline"
              >
                Повернути стандартні фото
              </button>
            </div>
          ) : currentImage ? (
            <div className="relative w-full h-[52vh] sm:h-[460px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-center">
              <img
                key={currentImage.url}
                src={currentImage.url}
                alt={currentImage.title}
                onError={handleImageError}
                className="w-full h-full object-contain select-none"
              />

              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/65 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-white font-bold tracking-widest text-[11px] uppercase shadow-md pointer-events-none">
                {STRINGS.welcomeBack}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-sm">{STRINGS.noImages}</div>
          )}
        </main>

        <footer className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3 sticky bottom-0 z-20">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => handleRate('like')}
              title="Like"
              disabled={!currentImage}
              className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 active:scale-90 disabled:opacity-40 transition flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8 0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 3.12 7.59 9.53c-.37.38-.59.88-.59 1.41V19c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-.12z" />
              </svg>
            </button>

            <button
              onClick={handleDownload}
              disabled={!currentImage || isDownloading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-40 text-white font-semibold rounded-2xl shadow-lg transition"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>{isDownloading ? STRINGS.downloading : STRINGS.download}</span>
            </button>

            <button
              onClick={() => handleRate('dislike')}
              title="Dislike"
              disabled={!currentImage}
              className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 active:scale-90 disabled:opacity-40 transition flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 4h-2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h2V4zM2.17 11.12c-.11.25-.17.52-.17.8 0 1.1.9 2 2 2h5.5l-.92 4.65c-.05.22-.02.46.08.66.23.45.52.86.88 1.22L10 20.88l6.41-6.41c.37-.38.59-.88.59-1.41V5c0-1.1-.9-2-2-2H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v.12z" />
              </svg>
            </button>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1 pt-1">
            <span className="text-emerald-400 font-semibold">Likes: {likedCount}</span>
            <span className="text-slate-500">
              {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : '0 / 0'}
            </span>
            <span className="text-rose-400 font-semibold">Dislikes: {dislikedCount}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}