/// <reference types="vite/client" />

interface Window {
    showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
}
