declare module 'fonteditor-core' {
    interface FontOptions {
        type?: 'ttf' | 'woff' | 'woff2' | 'otf' | 'eot'
        hinting?: boolean
        subset?: number[]
    }

    interface WriteOptions {
        type: 'ttf' | 'woff' | 'woff2' | 'otf' | 'eot'
        hinting?: boolean
        deflate?: (data: Uint8Array) => Uint8Array
        inflate?: (data: Uint8Array) => Uint8Array
    }

    export class Font {
        static create(buffer: ArrayBuffer, options?: FontOptions): Font
        write(options: WriteOptions): ArrayBuffer
        get(name: string): unknown
        set(name: string, value: unknown): Font
    }

    interface Woff2Module {
        init(wawoff2: unknown): void
    }

    export const woff2: Woff2Module
}
