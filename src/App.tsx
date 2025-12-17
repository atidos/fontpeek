import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Font } from 'fonteditor-core'
import PhysicsBackground from './components/PhysicsBackground'
import AnimatedLogo from './components/AnimatedLogo'

interface FontWeight {
  weight: string
  style: string
  url: string
  format: string
}

interface FontGroup {
  family: string
  weights: FontWeight[]
}

type TargetFormat = 'original' | 'woff2' | 'woff' | 'ttf' | 'otf'

// Multiple CORS proxies to try
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
]

async function fetchWithProxy(targetUrl: string): Promise<Response> {
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(targetUrl), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
      if (response.ok) return response
    } catch { }
  }
  throw new Error('All proxies failed')
}

// Convert font format using fonteditor-core
async function convertFont(
  buffer: ArrayBuffer,
  sourceFormat: string,
  targetFormat: TargetFormat
): Promise<{ data: ArrayBuffer; ext: string }> {
  // Normalize source format
  const srcFmt = sourceFormat.toLowerCase().replace('-', '')
  const tgtFmt = targetFormat.toLowerCase()

  // If original or same format, return as-is
  if (tgtFmt === 'original' || srcFmt === tgtFmt) {
    return { data: buffer, ext: srcFmt || 'woff2' }
  }

  // Map format strings to fonteditor-core types
  type FontType = 'ttf' | 'woff' | 'woff2' | 'otf' | 'eot'
  const formatMap: Record<string, FontType> = {
    'ttf': 'ttf',
    'truetype': 'ttf',
    'otf': 'otf',
    'opentype': 'otf',
    'woff': 'woff',
    'woff2': 'woff2',
    'eot': 'eot'
  }

  const sourceType = formatMap[srcFmt] || 'woff2'
  const targetType = formatMap[tgtFmt] || 'ttf'

  // WOFF2 requires special handling - skip for now if source or target is woff2
  // fonteditor-core needs wawoff2 for woff2 which doesn't work in browser
  if (sourceType === 'woff2' || targetType === 'woff2') {
    console.warn('WOFF2 conversion not supported in browser, returning original')
    return { data: buffer, ext: srcFmt || 'woff2' }
  }

  try {
    // Read the font
    const font = Font.create(buffer, { type: sourceType })

    // Convert to target format
    const converted = font.write({ type: targetType })

    return { data: converted, ext: tgtFmt }
  } catch (err) {
    console.error('Conversion failed:', err)
    // Return original on failure
    return { data: buffer, ext: srcFmt || 'woff2' }
  }
}

// Load a font for preview
async function loadFontForPreview(family: string, weight: string, style: string, url: string): Promise<void> {
  const fontId = `${family}-${weight}-${style}`

  // Check if already loaded
  for (const font of document.fonts) {
    if (font.family === fontId) return
  }

  try {
    // Try loading directly first (some fonts allow CORS)
    let fontFace: FontFace
    try {
      fontFace = new FontFace(fontId, `url(${url})`, {
        weight: weight,
        style: style as FontFaceDescriptors['style']
      })
      await fontFace.load()
    } catch {
      // If direct load fails, try through proxy
      const response = await fetchWithProxy(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      fontFace = new FontFace(fontId, `url(${blobUrl})`, {
        weight: weight,
        style: style as FontFaceDescriptors['style']
      })
      await fontFace.load()
    }

    document.fonts.add(fontFace)
  } catch (err) {
    console.warn('Failed to load font:', family, weight, err)
  }
}

export default function App() {
  const [url, setUrl] = useState('')
  const [fonts, setFonts] = useState<FontGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewText, setPreviewText] = useState('The quick brown fox')
  const [analyzed, setAnalyzed] = useState(false)
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  const [selectedFormat, setSelectedFormat] = useState<TargetFormat>('original')
  const [converting, setConverting] = useState<string | null>(null)

  // Load fonts for preview when fonts change
  useEffect(() => {
    const loadAllFonts = async () => {
      for (const fontGroup of fonts) {
        for (const w of fontGroup.weights) {
          const fontId = `${fontGroup.family}-${w.weight}-${w.style}`
          if (!loadedFonts.has(fontId)) {
            await loadFontForPreview(fontGroup.family, w.weight, w.style, w.url)
            setLoadedFonts(prev => new Set(prev).add(fontId))
          }
        }
      }
    }
    loadAllFonts()
  }, [fonts])

  const analyze = async () => {
    let targetUrl = url.trim()
    if (!targetUrl) {
      setError('Enter a URL')
      return
    }

    // Add https if missing
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl
      setUrl(targetUrl)
    }

    setLoading(true)
    setError('')
    setFonts([])
    setAnalyzed(true)

    try {
      const response = await fetchWithProxy(targetUrl)
      const html = await response.text()
      const extractedFonts = await extractFonts(html, targetUrl)

      if (extractedFonts.length === 0) {
        setError('No @font-face rules found on this page')
      } else {
        setFonts(extractedFonts)
      }
    } catch (err) {
      console.error(err)
      setError('Could not fetch page. Try a different URL.')
    } finally {
      setLoading(false)
    }
  }

  const extractFonts = async (html: string, baseUrl: string): Promise<FontGroup[]> => {
    const fontMap = new Map<string, FontWeight[]>()

    // Parse HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Find Google Fonts links
    const googleLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]')
    for (const link of googleLinks) {
      const href = link.getAttribute('href')
      if (href) {
        try {
          const cssResponse = await fetchWithProxy(href)
          const css = await cssResponse.text()
          parseFontFaces(css, fontMap)
        } catch { }
      }
    }

    // Find stylesheet links
    const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]')
    for (const link of styleLinks) {
      const href = link.getAttribute('href')
      if (href && !href.includes('fonts.googleapis.com')) {
        try {
          const fullUrl = new URL(href, baseUrl).href
          const cssResponse = await fetchWithProxy(fullUrl)
          const css = await cssResponse.text()
          parseFontFaces(css, fontMap, fullUrl)
        } catch { }
      }
    }

    // Parse inline styles
    const inlineStyles = doc.querySelectorAll('style')
    for (const style of inlineStyles) {
      if (style.textContent) {
        parseFontFaces(style.textContent, fontMap, baseUrl)
      }
    }

    // Convert map to array
    return Array.from(fontMap.entries()).map(([family, weights]) => ({
      family,
      weights
    }))
  }

  const parseFontFaces = (css: string, fontMap: Map<string, FontWeight[]>, baseUrl?: string) => {
    const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi
    let match

    while ((match = fontFaceRegex.exec(css)) !== null) {
      const block = match[1]

      // Extract family
      const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";]+)['"]?/i)
      if (!familyMatch) continue
      const family = familyMatch[1].trim()

      // Extract weight
      const weightMatch = block.match(/font-weight\s*:\s*(\d+|normal|bold)/i)
      const weight = weightMatch ? normalizeWeight(weightMatch[1]) : '400'

      // Extract style
      const styleMatch = block.match(/font-style\s*:\s*(normal|italic|oblique)/i)
      const style = styleMatch ? styleMatch[1] : 'normal'

      // Extract URL
      const srcMatch = block.match(/src\s*:\s*([^;]+)/i)
      if (!srcMatch) continue

      // Find URL with format
      const urlFormatMatch = srcMatch[1].match(/url\(['"]?([^'")\s]+)['"]?\)\s*format\(['"]?([^'"]+)['"]?\)/i)
      const urlOnlyMatch = srcMatch[1].match(/url\(['"]?([^'")\s]+)['"]?\)/i)

      let fontUrl = ''
      let format = 'woff2'

      if (urlFormatMatch) {
        fontUrl = urlFormatMatch[1]
        format = urlFormatMatch[2]
      } else if (urlOnlyMatch) {
        fontUrl = urlOnlyMatch[1]
        const ext = fontUrl.split('.').pop()?.split('?')[0] || ''
        format = ext
      }

      if (!fontUrl) continue

      // Resolve relative URLs
      if (baseUrl && !fontUrl.startsWith('http')) {
        try {
          fontUrl = new URL(fontUrl, baseUrl).href
        } catch { }
      }

      // Add to map
      if (!fontMap.has(family)) {
        fontMap.set(family, [])
      }

      const weights = fontMap.get(family)!
      const exists = weights.some(w => w.weight === weight && w.style === style)
      if (!exists) {
        weights.push({ weight, style, url: fontUrl, format })
      }
    }
  }

  const normalizeWeight = (w: string): string => {
    if (w === 'normal') return '400'
    if (w === 'bold') return '700'
    return w
  }

  const download = async (fontUrl: string, family: string, weight: string, originalFormat: string) => {
    const downloadKey = `${family}-${weight}`
    setConverting(downloadKey)

    try {
      let blob: Blob

      // Try direct download first (some CDNs allow CORS)
      try {
        const directResponse = await fetch(fontUrl)
        if (directResponse.ok) {
          blob = await directResponse.blob()
        } else {
          throw new Error('Direct failed')
        }
      } catch {
        // Fall back to proxy
        const proxyResponse = await fetchWithProxy(fontUrl)
        blob = await proxyResponse.blob()
      }

      // Convert to ArrayBuffer for processing
      const buffer = await blob.arrayBuffer()

      // Convert format if needed
      const { data, ext } = await convertFont(buffer, originalFormat, selectedFormat)

      // Create download blob
      const downloadBlob = new Blob([data], { type: 'application/octet-stream' })
      const blobUrl = URL.createObjectURL(downloadBlob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${family.replace(/[^a-zA-Z0-9]/g, '-')}-${weight}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err, fontUrl)
      // Try opening the URL directly as last resort
      window.open(fontUrl, '_blank')
    } finally {
      setConverting(null)
    }
  }

  return (
    <>
      <Helmet>
        <title>FontPeek</title>
        <meta name="description" content="Find fonts on any webpage" />
      </Helmet>

      <div className="h-full flex flex-col relative bg-white" style={{ position: 'relative' }}>
        {/* Physics Background */}
        <PhysicsBackground text={url} />

        <div className="h-full flex flex-col relative" style={{ zIndex: 10 }}>
          {/* URL Input - Centered */}
          <div className={`flex-1 flex flex-col items-center justify-center px-6 transition-all duration-300 ${analyzed ? 'flex-none py-12' : ''}`}>
            <div className="mb-8">
              <AnimatedLogo />
            </div>

            <div className="w-full max-w-xl">
              <div className="flex border border-black bg-white">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyze()}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-3 text-lg font-mono bg-transparent"
                  disabled={loading}
                />
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="px-6 py-3 bg-black text-white font-bold hover:bg-[#ff3d00] transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'GO'}
                </button>
              </div>

              {error && (
                <p className="mt-4 text-center text-sm text-[#ff3d00]">{error}</p>
              )}
            </div>
          </div>

          {/* Results */}
          {fonts.length > 0 && (
            <div className="flex-1 border-t border-black overflow-auto backdrop-blur-2xl bg-white/70">
              {/* Controls: Preview + Format */}
              <div className="sticky top-0 bg-white border-b border-black py-2 z-10">
                <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center gap-4">
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Preview text"
                    className="flex-1 min-w-[200px] text-lg bg-transparent pb-1"
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">Format:</span>
                    {(['original', 'woff2', 'woff', 'ttf', 'otf'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSelectedFormat(fmt)}
                        className={`px-2 py-1 text-xs font-mono uppercase border border-black transition-colors
                      ${selectedFormat === fmt ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Font List */}
              <div className="divide-y divide-black">
                {fonts.map((font) => (
                  <div key={font.family} className="py-6">
                    <div className="max-w-5xl mx-auto px-6">
                      {/* Family Name */}
                      <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-xl font-bold">{font.family}</h2>
                        <span className="text-sm text-black/40">{font.weights.length} weights</span>
                      </div>

                      {/* Weights Grid */}
                      <div className="grid gap-3">
                        {font.weights.map((w, i) => {
                          const fontId = `${font.family}-${w.weight}-${w.style}`
                          const isLoaded = loadedFonts.has(fontId)

                          return (
                            <div key={i} className="flex items-center gap-4 group">
                              {/* Weight Label */}
                              <div className="w-20 text-sm font-mono text-black/50">
                                {w.weight}{w.style === 'italic' ? 'i' : ''}
                              </div>

                              {/* Format Badge */}
                              <div className="w-16 text-xs font-mono text-black/30 uppercase">
                                {w.format}
                              </div>

                              {/* Preview */}
                              <div
                                className="flex-1 text-2xl truncate"
                                style={{
                                  fontFamily: isLoaded ? `"${fontId}", sans-serif` : 'sans-serif',
                                  fontWeight: w.weight,
                                  fontStyle: w.style
                                }}
                              >
                                {isLoaded ? previewText : '...'}
                              </div>

                              {/* Download */}
                              <button
                                onClick={() => download(w.url, font.family, w.weight, w.format)}
                                disabled={converting === `${font.family}-${w.weight}`}
                                className="opacity-0 group-hover:opacity-100 px-3 py-1 text-sm font-bold border border-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
                              >
                                {converting === `${font.family}-${w.weight}` ? '...' : `↓ ${selectedFormat !== 'original' ? selectedFormat : ''}`}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
