// ============================================
// P-LIMIT STYLE CONCURRENT QUEUE
// Manages parallel uploads with retry logic
// ============================================

export interface QueueTask<T> {
    id: string;
    execute: () => Promise<T>;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    retries?: number;
}

export interface QueueOptions {
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
}

type QueueEventType = 'start' | 'complete' | 'error' | 'retry' | 'pause' | 'resume';

export class ConcurrentQueue<T> {
    private queue: QueueTask<T>[] = [];
    private running: Map<string, Promise<void>> = new Map();
    private concurrency: number;
    private maxRetries: number;
    private retryDelay: number;
    private isPaused: boolean = false;
    private listeners: Map<QueueEventType, Set<(data: any) => void>> = new Map();

    constructor(options: QueueOptions) {
        this.concurrency = options.concurrency;
        this.maxRetries = options.maxRetries;
        this.retryDelay = options.retryDelay;
    }

    on(event: QueueEventType, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        return () => this.listeners.get(event)?.delete(callback);
    }

    private emit(event: QueueEventType, data: any): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    add(task: QueueTask<T>): void {
        this.queue.push({ ...task, retries: 0 });
        this.processQueue();
    }

    addBatch(tasks: QueueTask<T>[]): void {
        tasks.forEach(task => this.queue.push({ ...task, retries: 0 }));
        this.processQueue();
    }

    pause(): void {
        this.isPaused = true;
        this.emit('pause', {});
    }

    resume(): void {
        this.isPaused = false;
        this.emit('resume', {});
        this.processQueue();
    }

    clear(): void {
        this.queue = [];
    }

    get pending(): number {
        return this.queue.length;
    }

    get active(): number {
        return this.running.size;
    }

    get paused(): boolean {
        return this.isPaused;
    }

    private async processQueue(): Promise<void> {
        if (this.isPaused) return;

        while (this.running.size < this.concurrency && this.queue.length > 0) {
            const task = this.queue.shift()!;

            const taskPromise = this.executeTask(task);
            this.running.set(task.id, taskPromise);

            taskPromise.finally(() => {
                this.running.delete(task.id);
                this.processQueue();
            });
        }
    }

    private async executeTask(task: QueueTask<T>): Promise<void> {
        this.emit('start', { id: task.id, attempt: (task.retries || 0) + 1 });

        try {
            const result = await task.execute();
            task.onSuccess?.(result);
            this.emit('complete', { id: task.id, result });
        } catch (error) {
            const retries = (task.retries || 0) + 1;

            if (retries <= this.maxRetries) {
                this.emit('retry', { id: task.id, attempt: retries, error });

                await this.delay(this.retryDelay * retries); // Exponential backoff

                this.queue.unshift({ ...task, retries });
                this.processQueue();
            } else {
                const err = error instanceof Error ? error : new Error(String(error));
                task.onError?.(err);
                this.emit('error', { id: task.id, error: err });

                // Pause queue on max retries exceeded
                this.pause();
            }
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Create a queue optimized for file uploads
 * 4-6 parallel uploads, 3 retries, 1s retry delay
 */
export function createUploadQueue<T>(): ConcurrentQueue<T> {
    return new ConcurrentQueue<T>({
        concurrency: 5,
        maxRetries: 3,
        retryDelay: 1000,
    });
}
