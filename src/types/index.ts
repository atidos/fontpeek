export interface FontInfo {
    family: string;
    style: string;
    weight: string;
    source: string;
    url?: string;
    format?: string;
    previewUrl?: string;
}

export interface AnalysisResult {
    url: string;
    fonts: FontInfo[];
    timestamp: Date;
}

export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot';

export interface ConversionOptions {
    format: FontFormat;
    fontData: ArrayBuffer;
    fontName: string;
}
