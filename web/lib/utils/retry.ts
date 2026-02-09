/**
 * Simple retry utility with exponential backoff and jitter
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelay?: number;
        maxDelay?: number;
        onRetry?: (error: any, attempt: number) => void;
    } = {}
): Promise<T> {
    const {
        maxRetries = 5,
        baseDelay = 500,
        maxDelay = 2000,
        onRetry
    } = options

    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error

            if (attempt === maxRetries) break

            const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), maxDelay)
            const jitter = Math.random() * 200

            if (onRetry) onRetry(error, attempt)

            await new Promise(resolve => setTimeout(resolve, delay + jitter))
        }
    }

    throw lastError
}
