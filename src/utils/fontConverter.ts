import { saveAs } from 'file-saver'
import { FontFormat } from '../types'

/**
 * Downloads a font from a URL and saves it in the specified format.
 * Note: Due to browser limitations, true format conversion requires a backend.
 * This implementation downloads the original file and renames it.
 */
export async function downloadFont(
    fontUrl: string,
    fontName: string,
    targetFormat: FontFormat,
    useCorsProxy = true
): Promise<void> {
    try {
        // Use CORS proxy for external fonts
        const fetchUrl = useCorsProxy ? `https://api.allorigins.win/raw?url=${encodeURIComponent(fontUrl)}` : fontUrl

        // Fetch the font file
        const response = await fetch(fetchUrl, {
            mode: 'cors',
            credentials: 'omit',
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch font: ${response.status}`)
        }

        const blob = await response.blob()

        // Determine the original format from the URL
        const originalFormat = getFormatFromUrl(fontUrl)

        // Clean the font name for the filename
        const cleanName = fontName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')

        // If the original format matches the target, download directly
        if (originalFormat === targetFormat) {
            saveAs(blob, `${cleanName}.${targetFormat}`)
            return
        }

        // For web font formats, attempt conversion
        // Note: True conversion requires parsing the font and re-encoding
        // For now, we'll handle the common web font cases

        if (canConvertDirectly(originalFormat, targetFormat)) {
            // Some formats are interchangeable or can be converted client-side
            const convertedBlob = await convertFont(blob, originalFormat, targetFormat)
            saveAs(convertedBlob, `${cleanName}.${targetFormat}`)
        } else {
            // Can't convert, download original with note
            const extension = getExtensionForFormat(originalFormat)
            saveAs(blob, `${cleanName}-original.${extension}`)
            console.warn(
                `Font conversion from ${originalFormat} to ${targetFormat} requires a backend service. ` +
                `Downloaded original format instead.`
            )
        }
    } catch (error) {
        console.error('Font download failed:', error)
        throw error
    }
}

/**
 * Gets the font format from a URL
 */
function getFormatFromUrl(url: string): FontFormat | 'unknown' {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0]

    const formatMap: Record<string, FontFormat> = {
        'woff2': 'woff2',
        'woff': 'woff',
        'ttf': 'ttf',
        'otf': 'otf',
        'eot': 'eot',
    }

    return formatMap[extension || ''] || 'unknown'
}

/**
 * Gets the file extension for a format
 */
function getExtensionForFormat(format: FontFormat | 'unknown'): string {
    return format === 'unknown' ? 'font' : format
}

/**
 * Checks if we can convert between formats on the client
 */
function canConvertDirectly(from: FontFormat | 'unknown', to: FontFormat): boolean {
    // Currently, we can't do true client-side conversion without complex libraries
    // Return false to trigger the original download
    return from === to
}

/**
 * Converts a font blob to a different format.
 * This is a placeholder for actual conversion logic.
 * True conversion would require using opentype.js to parse and re-encode.
 */
async function convertFont(
    blob: Blob,
    _from: FontFormat | 'unknown',
    to: FontFormat
): Promise<Blob> {
    // For now, just return the original blob with a new type
    // Real implementation would parse with opentype.js and encode to target format

    const mimeTypes: Record<FontFormat, string> = {
        'woff2': 'font/woff2',
        'woff': 'font/woff',
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'eot': 'application/vnd.ms-fontobject',
    }

    return new Blob([await blob.arrayBuffer()], { type: mimeTypes[to] })
}

/**
 * Validates if a font URL is accessible
 */
export async function validateFontUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'cors',
            credentials: 'omit',
        })
        return response.ok
    } catch {
        return false
    }
}
