import { useState, useCallback } from 'react'
import FontFamily from './FontFamily'

interface FontWeight {
    weight: string
    style: string
    url?: string
}

interface FontGroup {
    family: string
    source: string
    weights: FontWeight[]
}

const DEMO_FONTS: FontGroup[] = [
    {
        family: 'Inter',
        source: 'Google Fonts',
        weights: [
            { weight: '400', style: 'normal', url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2' },
            { weight: '500', style: 'normal', url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI2fAZ9hjp-Ek-_EeA.woff2' },
            { weight: '700', style: 'normal', url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2' },
        ]
    },
    {
        family: 'Roboto',
        source: 'Google Fonts',
        weights: [
            { weight: '400', style: 'normal', url: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2' },
            { weight: '400', style: 'italic', url: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzI.woff2' },
            { weight: '700', style: 'normal', url: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2' },
        ]
    },
]

export default function FontPeek() {
    const [url, setUrl] = useState('')
    const [fonts, setFonts] = useState<FontGroup[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [previewText, setPreviewText] = useState('Aa Bb Cc')

    const analyze = useCallback(async () => {
        if (!url.trim()) return

        setIsLoading(true)
        await new Promise(r => setTimeout(r, 800))
        setFonts(DEMO_FONTS)
        setIsLoading(false)
    }, [url])

    const loadDemo = () => {
        setUrl('https://example.com')
        setFonts(DEMO_FONTS)
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header - minimal */}
            <header className="border-b border-black">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight">
                        Font<span className="text-accent">Peek</span>
                    </h1>
                    <span className="text-sm font-mono">v1.0</span>
                </div>
            </header>

            {/* Main - centered URL input */}
            <main className="flex-1 flex flex-col">
                <section className="py-20 border-b border-black">
                    <div className="max-w-4xl mx-auto px-6">
                        <p className="text-center text-sm font-mono mb-8 uppercase tracking-widest">
                            Enter URL to find fonts
                        </p>

                        <div className="flex">
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && analyze()}
                                placeholder="https://"
                                className="input-url flex-1"
                                disabled={isLoading}
                            />
                            <button
                                onClick={analyze}
                                disabled={isLoading}
                                className="btn border border-black border-l-0 disabled:bg-black"
                            >
                                {isLoading ? '...' : '→'}
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={loadDemo}
                                className="text-sm font-mono underline hover:text-accent"
                            >
                                try demo
                            </button>
                        </div>
                    </div>
                </section>

                {/* Results */}
                {fonts.length > 0 && (
                    <section className="py-12 flex-1">
                        <div className="max-w-4xl mx-auto px-6">
                            {/* Preview text input */}
                            <div className="mb-12 flex items-center gap-4">
                                <span className="text-sm font-mono uppercase">Preview:</span>
                                <input
                                    type="text"
                                    value={previewText}
                                    onChange={(e) => setPreviewText(e.target.value)}
                                    className="flex-1 border-b border-black bg-transparent py-2 font-mono focus:outline-none focus:border-accent"
                                />
                            </div>

                            {/* Font list */}
                            <div className="space-y-0">
                                {fonts.map((font) => (
                                    <FontFamily
                                        key={font.family}
                                        family={font}
                                        previewText={previewText}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {fonts.length === 0 && !isLoading && (
                    <section className="flex-1 flex items-center justify-center">
                        <p className="text-sm font-mono">—</p>
                    </section>
                )}
            </main>

            {/* Footer - minimal */}
            <footer className="border-t border-black">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-sm font-mono">
                    <span>FontPeek</span>
                    <span>WOFF2 · WOFF · TTF · OTF</span>
                </div>
            </footer>
        </div>
    )
}
