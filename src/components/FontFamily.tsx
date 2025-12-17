import { useState, useEffect } from 'react'
import { saveAs } from 'file-saver'

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

interface Props {
    family: FontGroup
    previewText: string
}

type Format = 'woff2' | 'woff' | 'ttf' | 'otf'

export default function FontFamily({ family, previewText }: Props) {
    const [expanded, setExpanded] = useState(false)
    const [selectedFormat, setSelectedFormat] = useState<Format>('woff2')
    const [loadedWeights, setLoadedWeights] = useState<Set<string>>(new Set())

    // Load fonts for preview
    useEffect(() => {
        family.weights.forEach((w) => {
            if (w.url) {
                const id = `${family.family}-${w.weight}-${w.style}`
                const fontFace = new FontFace(id, `url(${w.url})`, {
                    weight: w.weight,
                    style: w.style as FontFaceDescriptors['style'],
                })
                fontFace.load().then((loaded) => {
                    document.fonts.add(loaded)
                    setLoadedWeights((prev) => new Set(prev).add(id))
                }).catch(() => { })
            }
        })
    }, [family])

    const download = async (weight: FontWeight) => {
        if (!weight.url) return
        try {
            const res = await fetch(weight.url)
            const blob = await res.blob()
            const name = `${family.family}-${weight.weight}${weight.style === 'italic' ? '-italic' : ''}`
            saveAs(blob, `${name}.${selectedFormat}`)
        } catch {
            alert('Download failed')
        }
    }

    const downloadAll = async () => {
        for (const w of family.weights) {
            await download(w)
        }
    }

    return (
        <div className="border-t border-black">
            {/* Header row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-6 flex items-center justify-between text-left hover:bg-black hover:text-white transition-colors"
            >
                <div className="flex items-center gap-6">
                    <span className="text-2xl font-bold">{family.family}</span>
                    <span className="text-sm font-mono">{family.weights.length} weights</span>
                </div>
                <span className="text-2xl">{expanded ? '−' : '+'}</span>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="border-t border-black">
                    {/* Format selector + download all */}
                    <div className="py-4 flex items-center justify-between border-b border-black">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono mr-2">Format:</span>
                            {(['woff2', 'woff', 'ttf', 'otf'] as Format[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setSelectedFormat(f)}
                                    className={`px-3 py-1 text-xs font-mono uppercase border border-black transition-colors
                    ${selectedFormat === f ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={downloadAll} className="text-sm font-mono underline hover:text-accent">
                            Download all
                        </button>
                    </div>

                    {/* Weight list */}
                    {family.weights.map((w) => {
                        const id = `${family.family}-${w.weight}-${w.style}`
                        const isLoaded = loadedWeights.has(id)

                        return (
                            <div key={id} className="py-6 border-b border-black flex items-center gap-6">
                                {/* Weight info */}
                                <div className="w-24 flex-shrink-0">
                                    <span className="font-mono text-sm">{w.weight}</span>
                                    {w.style === 'italic' && <span className="font-mono text-sm ml-1">i</span>}
                                </div>

                                {/* Preview */}
                                <div
                                    className="flex-1 text-4xl truncate"
                                    style={{
                                        fontFamily: isLoaded ? `"${id}", sans-serif` : `"${family.family}", sans-serif`,
                                        fontWeight: w.weight,
                                        fontStyle: w.style,
                                    }}
                                >
                                    {previewText}
                                </div>

                                {/* Download */}
                                <button
                                    onClick={() => download(w)}
                                    className="text-sm font-mono hover:text-accent"
                                >
                                    ↓
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
