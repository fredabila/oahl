"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTransportProvider = void 0;
class BaseTransportProvider {
    async withRetry(action, options) {
        const attempts = Math.max(options?.attempts ?? 1, 1);
        const delayMs = Math.max(options?.delayMs ?? 0, 0);
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                return await action();
            }
            catch (error) {
                lastError = error;
                if (attempt < attempts && delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        throw lastError;
    }
}
exports.BaseTransportProvider = BaseTransportProvider;
