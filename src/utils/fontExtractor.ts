import { FontInfo } from '../types'

/**
 * Attempts to extract font information from a given URL.
 * Due to CORS restrictions, this will only work with same-origin URLs
 * or URLs that have appropriate CORS headers.
 */
export async function extractFontsFromCSS(url: string): Promise<FontInfo[]> {
    const fonts: FontInfo[] = []

    try {
        // Try to fetch the page (will fail for most external URLs due to CORS)
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`)
        }

        const html = await response.text()

        // Parse the HTML
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        // Find all stylesheet links
        const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]')
        const stylesheetUrls: string[] = []

        styleLinks.forEach((link) => {
            const href = link.getAttribute('href')
            if (href) {
                try {
                    const fullUrl = new URL(href, url).href
                    stylesheetUrls.push(fullUrl)
                } catch {
                    // Invalid URL, skip
                }
            }
        })

        // Also check inline styles
        const inlineStyles = doc.querySelectorAll('style')
        inlineStyles.forEach((style) => {
            const cssText = style.textContent || ''
            const inlineFonts = parseFontFaces(cssText, url)
            fonts.push(...inlineFonts)
        })

        // Fetch and parse each stylesheet
        for (const stylesheetUrl of stylesheetUrls) {
            try {
                const cssResponse = await fetch(stylesheetUrl, {
                    mode: 'cors',
                    credentials: 'omit',
                })

                if (cssResponse.ok) {
                    const cssText = await cssResponse.text()
                    const cssfonts = parseFontFaces(cssText, stylesheetUrl)
                    fonts.push(...cssfonts)
                }
            } catch {
                // Failed to fetch stylesheet, skip
            }
        }

        // Look for Google Fonts in the URL
        const googleFontsLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]')
        googleFontsLinks.forEach((link) => {
            const href = link.getAttribute('href')
            if (href) {
                const googleFonts = parseGoogleFontsUrl(href)
                fonts.push(...googleFonts)
            }
        })

    } catch (error) {
        console.error('Failed to extract fonts:', error)
    }

    // Deduplicate fonts by family + weight + style
    const uniqueFonts = fonts.reduce((acc, font) => {
        const key = `${font.family}-${font.weight}-${font.style}`
        if (!acc.has(key)) {
            acc.set(key, font)
        }
        return acc
    }, new Map<string, FontInfo>())

    return Array.from(uniqueFonts.values())
}

/**
 * Parses @font-face declarations from CSS text
 */
function parseFontFaces(cssText: string, baseUrl: string): FontInfo[] {
    const fonts: FontInfo[] = []

    // Match @font-face blocks
    const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi
    let match

    while ((match = fontFaceRegex.exec(cssText)) !== null) {
        const block = match[1]

        // Extract font-family
        const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";]+)['"]?/i)
        const family = familyMatch ? familyMatch[1].trim() : 'Unknown'

        // Extract font-weight
        const weightMatch = block.match(/font-weight\s*:\s*(\d+|normal|bold|lighter|bolder)/i)
        const weight = weightMatch ? weightMatch[1] : '400'

        // Extract font-style
        const styleMatch = block.match(/font-style\s*:\s*(normal|italic|oblique)/i)
        const style = styleMatch ? styleMatch[1] : 'normal'

        // Extract src URLs
        const srcMatch = block.match(/src\s*:\s*([^;]+)/i)
        if (srcMatch) {
            const srcValue = srcMatch[1]

            // Find url() declarations
            const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)\s*format\(['"]?([^'"]+)['"]?\)/gi
            let urlMatch

            while ((urlMatch = urlRegex.exec(srcValue)) !== null) {
                const fontUrl = urlMatch[1]
                const format = urlMatch[2].toLowerCase()

                try {
                    const fullUrl = new URL(fontUrl, baseUrl).href

                    fonts.push({
                        family,
                        weight: normalizeWeight(weight),
                        style,
                        source: new URL(baseUrl).hostname,
                        url: fullUrl,
                        format,
                    })
                } catch {
                    // Invalid URL, skip
                }
            }

            // Also try to match url() without format()
            const simpleUrlRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi
            while ((urlMatch = simpleUrlRegex.exec(srcValue)) !== null) {
                const fontUrl = urlMatch[1]

                // Skip if already matched with format
                if (fonts.some(f => f.url?.includes(fontUrl))) continue

                // Determine format from extension
                const format = getFormatFromUrl(fontUrl)

                try {
                    const fullUrl = new URL(fontUrl, baseUrl).href

                    fonts.push({
                        family,
                        weight: normalizeWeight(weight),
                        style,
                        source: new URL(baseUrl).hostname,
                        url: fullUrl,
                        format,
                    })
                } catch {
                    // Invalid URL, skip
                }
            }
        }
    }

    return fonts
}

/**
 * Parses Google Fonts URL to extract font families
 */
function parseGoogleFontsUrl(url: string): FontInfo[] {
    const fonts: FontInfo[] = []

    try {
        const urlObj = new URL(url)
        const familyParam = urlObj.searchParams.get('family')

        if (familyParam) {
            const families = familyParam.split('|')

            families.forEach((family) => {
                const [name, weights] = family.split(':')
                const fontName = name.replace(/\+/g, ' ')

                if (weights) {
                    const weightList = weights.split(',')
                    weightList.forEach((w) => {
                        const isItalic = w.includes('i') || w.includes('italic')
                        const weight = w.replace(/[^\d]/g, '') || '400'

                        fonts.push({
                            family: fontName,
                            weight,
                            style: isItalic ? 'italic' : 'normal',
                            source: 'Google Fonts',
                        })
                    })
                } else {
                    fonts.push({
                        family: fontName,
                        weight: '400',
                        style: 'normal',
                        source: 'Google Fonts',
                    })
                }
            })
        }
    } catch {
        // Failed to parse URL
    }

    return fonts
}

/**
 * Normalizes font weight to a numeric value
 */
function normalizeWeight(weight: string): string {
    const weightMap: Record<string, string> = {
        'normal': '400',
        'bold': '700',
        'lighter': '300',
        'bolder': '700',
    }

    return weightMap[weight.toLowerCase()] || weight
}

/**
 * Determines font format from URL extension
 */
function getFormatFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0]

    const formatMap: Record<string, string> = {
        'woff2': 'woff2',
        'woff': 'woff',
        'ttf': 'truetype',
        'otf': 'opentype',
        'eot': 'embedded-opentype',
    }

    return formatMap[extension || ''] || 'unknown'
}
