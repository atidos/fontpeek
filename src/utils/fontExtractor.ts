import { FontInfo } from '../types'

/**
 * Attempts to extract font information from a given URL.
 * Uses a CORS proxy to bypass cross-origin restrictions.
 */
export async function extractFontsFromCSS(url: string, useCorsProxy = true): Promise<FontInfo[]> {
    const fonts: FontInfo[] = []

    try {
        // Use CORS proxy for external URLs
        const fetchUrl = useCorsProxy ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` : url

        console.log('Fetching URL:', url)

        // Try to fetch the page
        const response = await fetch(fetchUrl, {
            mode: 'cors',
            credentials: 'omit',
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`)
        }

        const html = await response.text()
        console.log('Fetched HTML length:', html.length)

        // Check if we got a bot protection page
        if (html.includes('Pardon Our Interruption') || html.includes('Cloudflare') || html.includes('captcha') || html.includes('_Incapsula_')) {
            console.warn('Site appears to have bot protection - extraction may be limited')
            throw new Error('Site is protected by anti-bot measures. Try using a different URL or the demo.')
        }

        // Parse the HTML
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        // Find all stylesheet links (including preload)
        const styleLinks = doc.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]')
        const stylesheetUrls: string[] = []

        console.log('Found stylesheet links:', styleLinks.length)

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
        console.log('Found inline styles:', inlineStyles.length)

        inlineStyles.forEach((style) => {
            const cssText = style.textContent || ''
            const inlineFonts = parseFontFaces(cssText, url)
            if (inlineFonts.length > 0) {
                console.log('Found fonts in inline style:', inlineFonts)
            }
            fonts.push(...inlineFonts)
        })

        // Fetch and parse each stylesheet
        for (const stylesheetUrl of stylesheetUrls) {
            try {
                console.log('Fetching stylesheet:', stylesheetUrl)
                const proxyUrl = useCorsProxy ? `https://api.allorigins.win/raw?url=${encodeURIComponent(stylesheetUrl)}` : stylesheetUrl
                const cssResponse = await fetch(proxyUrl, {
                    mode: 'cors',
                    credentials: 'omit',
                })

                if (cssResponse.ok) {
                    const cssText = await cssResponse.text()
                    console.log('CSS length:', cssText.length)
                    const cssfonts = parseFontFaces(cssText, stylesheetUrl)
                    if (cssfonts.length > 0) {
                        console.log('Found fonts in CSS:', cssfonts)
                    }
                    fonts.push(...cssfonts)
                }
            } catch (error) {
                console.error('Failed to fetch stylesheet:', error)
            }
        }

        // Look for Google Fonts
        const googleFontsLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]')
        console.log('Found Google Fonts links:', googleFontsLinks.length)

        googleFontsLinks.forEach((link) => {
            const href = link.getAttribute('href')
            if (href) {
                const googleFonts = parseGoogleFontsUrl(href)
                fonts.push(...googleFonts)
            }
        })

        // Look for Adobe Fonts / Typekit
        const adobeFontsLinks = doc.querySelectorAll('link[href*="use.typekit.net"], script[src*="use.typekit.net"]')
        if (adobeFontsLinks.length > 0) {
            console.log('Site uses Adobe Fonts/Typekit (detailed extraction not yet supported)')
        }

        // Look for common font services in script tags
        const scripts = doc.querySelectorAll('script')
        scripts.forEach(script => {
            const src = script.getAttribute('src') || ''
            const content = script.textContent || ''

            if (src.includes('fonts.com') || content.includes('fonts.com')) {
                console.log('Site uses Fonts.com (detailed extraction not yet supported)')
            }
            if (src.includes('cloud.typography.com') || content.includes('cloud.typography.com')) {
                console.log('Site uses Cloud.typography (detailed extraction not yet supported)')
            }
        })

        console.log('Total fonts extracted:', fonts.length)

    } catch (error) {
        console.error('Failed to extract fonts:', error)
        throw error
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

    // Match @font-face blocks - improved to handle nested content
    const fontFaceRegex = /@font-face\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gi
    let match

    while ((match = fontFaceRegex.exec(cssText)) !== null) {
        const block = match[1]

        console.log('Parsing @font-face block:', block.substring(0, 200))

        // Extract font-family - handle quotes and no quotes
        const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";,]+)['"]?/i)
        const family = familyMatch ? familyMatch[1].trim() : 'Unknown'

        // Extract font-weight
        const weightMatch = block.match(/font-weight\s*:\s*(\d+|normal|bold|lighter|bolder)/i)
        const weight = weightMatch ? weightMatch[1] : '400'

        // Extract font-style
        const styleMatch = block.match(/font-style\s*:\s*(normal|italic|oblique)/i)
        const style = styleMatch ? styleMatch[1] : 'normal'

        // Extract src URLs
        const srcMatch = block.match(/src\s*:\s*([^;]+)/is)
        if (srcMatch) {
            const srcValue = srcMatch[1]

            // Find url() declarations with format()
            const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)\s*format\(['"]?([^'"()]+)['"]?\)/gi
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
                } catch (err) {
                    console.warn('Invalid font URL:', fontUrl, err)
                }
            }

            // Also try to match url() without format()
            const simpleUrlRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi
            let simpleMatch
            while ((simpleMatch = simpleUrlRegex.exec(srcValue)) !== null) {
                const fontUrl = simpleMatch[1]

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
                } catch (err) {
                    console.warn('Invalid font URL:', fontUrl, err)
                }
            }
        }
    }

    console.log('Parsed fonts from CSS:', fonts.length)

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
