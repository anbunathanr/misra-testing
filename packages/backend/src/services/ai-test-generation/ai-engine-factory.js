"use strict";
/**
 * AI Engine Factory
 *
 * Provides a centralized factory for creating AI engine instances based on
 * the configured provider. Supports multiple AI providers (Bedrock, OpenAI, HuggingFace)
 * with runtime provider selection via environment variables.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIEngineFactory = void 0;
const bedrock_engine_1 = require("./bedrock-engine");
const ai_engine_1 = require("./ai-engine");
const huggingface_engine_1 = require("./huggingface-engine");
/**
 * AI Engine Factory
 *
 * Creates AI engine instances based on the AI_PROVIDER environment variable.
 * Defaults to BEDROCK if not specified.
 *
 * Supports canary deployment with BEDROCK_TRAFFIC_PERCENTAGE for gradual rollout.
 */
class AIEngineFactory {
    /**
     * Create an AI engine instance for the specified provider
     *
     * @param provider - Optional provider override. If not specified, reads from AI_PROVIDER env var
     * @returns AI engine instance
     * @throws Error if provider is unknown
     */
    static create(provider) {
        // Determine provider with canary deployment support
        const selectedProvider = this.selectProviderWithCanary(provider);
        console.log(`[AIEngineFactory] Creating AI engine for provider: ${selectedProvider}`);
        switch (selectedProvider) {
            case 'BEDROCK':
                console.log('[AIEngineFactory] Initializing Bedrock engine with Claude 3.5 Sonnet');
                return new bedrock_engine_1.BedrockEngine();
            case 'OPENAI':
                console.log('[AIEngineFactory] Initializing OpenAI engine');
                return new ai_engine_1.AIEngine();
            case 'HUGGINGFACE':
                console.log('[AIEngineFactory] Initializing HuggingFace engine');
                return new huggingface_engine_1.HuggingFaceEngine();
            default:
                throw new Error(`Unknown AI provider: ${selectedProvider}. Supported providers: BEDROCK, OPENAI, HUGGINGFACE`);
        }
    }
    /**
     * Select provider with canary deployment support
     *
     * Implements traffic percentage routing for gradual Bedrock rollout.
     * When BEDROCK_TRAFFIC_PERCENTAGE is set, routes that percentage of traffic to Bedrock
     * regardless of the AI_PROVIDER setting.
     *
     * @param provider - Optional provider override
     * @returns Selected provider based on canary logic
     */
    static selectProviderWithCanary(provider) {
        // If provider is explicitly specified, use it (no canary logic)
        if (provider) {
            return provider;
        }
        // Get base provider from environment (default: BEDROCK)
        const baseProvider = process.env.AI_PROVIDER || 'BEDROCK';
        // Check if canary deployment is enabled
        const trafficPercentage = parseInt(process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0', 10);
        // If no canary deployment or invalid percentage, use base provider
        if (trafficPercentage <= 0 || trafficPercentage > 100) {
            return baseProvider;
        }
        // If traffic percentage is 100%, always use Bedrock
        if (trafficPercentage >= 100) {
            console.log('[AIEngineFactory] Canary deployment at 100% - routing to Bedrock');
            return 'BEDROCK';
        }
        // Canary deployment: randomly route traffic based on percentage
        const random = Math.random() * 100;
        const useBedrock = random < trafficPercentage;
        if (useBedrock) {
            console.log(`[AIEngineFactory] Canary deployment: routing to Bedrock (${trafficPercentage}% traffic, random=${random.toFixed(2)})`);
            return 'BEDROCK';
        }
        else {
            console.log(`[AIEngineFactory] Canary deployment: routing to ${baseProvider} (${100 - trafficPercentage}% traffic, random=${random.toFixed(2)})`);
            return baseProvider;
        }
    }
    /**
     * Get the currently configured provider
     *
     * @returns Current AI provider
     */
    static getCurrentProvider() {
        return process.env.AI_PROVIDER || 'BEDROCK';
    }
    /**
     * Check if a provider is supported
     *
     * @param provider - Provider to check
     * @returns True if provider is supported
     */
    static isProviderSupported(provider) {
        return ['BEDROCK', 'OPENAI', 'HUGGINGFACE'].includes(provider);
    }
}
exports.AIEngineFactory = AIEngineFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZW5naW5lLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhaS1lbmdpbmUtZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxxREFBaUQ7QUFDakQsMkNBQXVDO0FBQ3ZDLDZEQUF5RDtBQW9CekQ7Ozs7Ozs7R0FPRztBQUNILE1BQWEsZUFBZTtJQUMxQjs7Ozs7O09BTUc7SUFDSCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQXFCO1FBQ2pDLG9EQUFvRDtRQUNwRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNEQUFzRCxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFFdEYsUUFBUSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pCLEtBQUssU0FBUztnQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLHNFQUFzRSxDQUFDLENBQUM7Z0JBQ3BGLE9BQU8sSUFBSSw4QkFBYSxFQUFFLENBQUM7WUFFN0IsS0FBSyxRQUFRO2dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsOENBQThDLENBQUMsQ0FBQztnQkFDNUQsT0FBTyxJQUFJLG9CQUFRLEVBQUUsQ0FBQztZQUV4QixLQUFLLGFBQWE7Z0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbURBQW1ELENBQUMsQ0FBQztnQkFDakUsT0FBTyxJQUFJLHNDQUFpQixFQUFFLENBQUM7WUFFakM7Z0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsZ0JBQWdCLHFEQUFxRCxDQUFDLENBQUM7UUFDbkgsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSyxNQUFNLENBQUMsd0JBQXdCLENBQUMsUUFBcUI7UUFDM0QsZ0VBQWdFO1FBQ2hFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELE1BQU0sWUFBWSxHQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBMEIsSUFBSSxTQUFTLENBQUM7UUFFMUUsd0NBQXdDO1FBQ3hDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXRGLG1FQUFtRTtRQUNuRSxJQUFJLGlCQUFpQixJQUFJLENBQUMsSUFBSSxpQkFBaUIsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUN0RCxPQUFPLFlBQVksQ0FBQztRQUN0QixDQUFDO1FBRUQsb0RBQW9EO1FBQ3BELElBQUksaUJBQWlCLElBQUksR0FBRyxFQUFFLENBQUM7WUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO1lBQ2hGLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCxnRUFBZ0U7UUFDaEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxNQUFNLEdBQUcsaUJBQWlCLENBQUM7UUFFOUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsNERBQTRELGlCQUFpQixxQkFBcUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEksT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxZQUFZLEtBQUssR0FBRyxHQUFHLGlCQUFpQixxQkFBcUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEosT0FBTyxZQUFZLENBQUM7UUFDdEIsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLGtCQUFrQjtRQUN2QixPQUFRLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBMEIsSUFBSSxTQUFTLENBQUM7SUFDOUQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFFBQWdCO1FBQ3pDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRSxDQUFDO0NBQ0Y7QUFoR0QsMENBZ0dDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEFJIEVuZ2luZSBGYWN0b3J5XHJcbiAqIFxyXG4gKiBQcm92aWRlcyBhIGNlbnRyYWxpemVkIGZhY3RvcnkgZm9yIGNyZWF0aW5nIEFJIGVuZ2luZSBpbnN0YW5jZXMgYmFzZWQgb25cclxuICogdGhlIGNvbmZpZ3VyZWQgcHJvdmlkZXIuIFN1cHBvcnRzIG11bHRpcGxlIEFJIHByb3ZpZGVycyAoQmVkcm9jaywgT3BlbkFJLCBIdWdnaW5nRmFjZSlcclxuICogd2l0aCBydW50aW1lIHByb3ZpZGVyIHNlbGVjdGlvbiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEJlZHJvY2tFbmdpbmUgfSBmcm9tICcuL2JlZHJvY2stZW5naW5lJztcclxuaW1wb3J0IHsgQUlFbmdpbmUgfSBmcm9tICcuL2FpLWVuZ2luZSc7XHJcbmltcG9ydCB7IEh1Z2dpbmdGYWNlRW5naW5lIH0gZnJvbSAnLi9odWdnaW5nZmFjZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBcHBsaWNhdGlvbkFuYWx5c2lzLCBMZWFybmluZ0NvbnRleHQsIFRlc3RTcGVjaWZpY2F0aW9uIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuXHJcbi8qKlxyXG4gKiBTdXBwb3J0ZWQgQUkgcHJvdmlkZXJzXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBBSVByb3ZpZGVyID0gJ0JFRFJPQ0snIHwgJ09QRU5BSScgfCAnSFVHR0lOR0ZBQ0UnO1xyXG5cclxuLyoqXHJcbiAqIENvbW1vbiBpbnRlcmZhY2UgZm9yIGFsbCBBSSBlbmdpbmVzXHJcbiAqIFRoaXMgZW5zdXJlcyBhbGwgZW5naW5lcyBjYW4gYmUgdXNlZCBpbnRlcmNoYW5nZWFibHlcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUFJRW5naW5lIHtcclxuICBnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uKFxyXG4gICAgYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXMsXHJcbiAgICBzY2VuYXJpbzogc3RyaW5nLFxyXG4gICAgY29udGV4dD86IExlYXJuaW5nQ29udGV4dFxyXG4gICk6IFByb21pc2U8VGVzdFNwZWNpZmljYXRpb24+O1xyXG59XHJcblxyXG4vKipcclxuICogQUkgRW5naW5lIEZhY3RvcnlcclxuICogXHJcbiAqIENyZWF0ZXMgQUkgZW5naW5lIGluc3RhbmNlcyBiYXNlZCBvbiB0aGUgQUlfUFJPVklERVIgZW52aXJvbm1lbnQgdmFyaWFibGUuXHJcbiAqIERlZmF1bHRzIHRvIEJFRFJPQ0sgaWYgbm90IHNwZWNpZmllZC5cclxuICogXHJcbiAqIFN1cHBvcnRzIGNhbmFyeSBkZXBsb3ltZW50IHdpdGggQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgZm9yIGdyYWR1YWwgcm9sbG91dC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBBSUVuZ2luZUZhY3Rvcnkge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhbiBBSSBlbmdpbmUgaW5zdGFuY2UgZm9yIHRoZSBzcGVjaWZpZWQgcHJvdmlkZXJcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcHJvdmlkZXIgLSBPcHRpb25hbCBwcm92aWRlciBvdmVycmlkZS4gSWYgbm90IHNwZWNpZmllZCwgcmVhZHMgZnJvbSBBSV9QUk9WSURFUiBlbnYgdmFyXHJcbiAgICogQHJldHVybnMgQUkgZW5naW5lIGluc3RhbmNlXHJcbiAgICogQHRocm93cyBFcnJvciBpZiBwcm92aWRlciBpcyB1bmtub3duXHJcbiAgICovXHJcbiAgc3RhdGljIGNyZWF0ZShwcm92aWRlcj86IEFJUHJvdmlkZXIpOiBJQUlFbmdpbmUge1xyXG4gICAgLy8gRGV0ZXJtaW5lIHByb3ZpZGVyIHdpdGggY2FuYXJ5IGRlcGxveW1lbnQgc3VwcG9ydFxyXG4gICAgY29uc3Qgc2VsZWN0ZWRQcm92aWRlciA9IHRoaXMuc2VsZWN0UHJvdmlkZXJXaXRoQ2FuYXJ5KHByb3ZpZGVyKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coYFtBSUVuZ2luZUZhY3RvcnldIENyZWF0aW5nIEFJIGVuZ2luZSBmb3IgcHJvdmlkZXI6ICR7c2VsZWN0ZWRQcm92aWRlcn1gKTtcclxuICAgIFxyXG4gICAgc3dpdGNoIChzZWxlY3RlZFByb3ZpZGVyKSB7XHJcbiAgICAgIGNhc2UgJ0JFRFJPQ0snOlxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbQUlFbmdpbmVGYWN0b3J5XSBJbml0aWFsaXppbmcgQmVkcm9jayBlbmdpbmUgd2l0aCBDbGF1ZGUgMy41IFNvbm5ldCcpO1xyXG4gICAgICAgIHJldHVybiBuZXcgQmVkcm9ja0VuZ2luZSgpO1xyXG4gICAgICAgIFxyXG4gICAgICBjYXNlICdPUEVOQUknOlxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbQUlFbmdpbmVGYWN0b3J5XSBJbml0aWFsaXppbmcgT3BlbkFJIGVuZ2luZScpO1xyXG4gICAgICAgIHJldHVybiBuZXcgQUlFbmdpbmUoKTtcclxuICAgICAgICBcclxuICAgICAgY2FzZSAnSFVHR0lOR0ZBQ0UnOlxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbQUlFbmdpbmVGYWN0b3J5XSBJbml0aWFsaXppbmcgSHVnZ2luZ0ZhY2UgZW5naW5lJyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBIdWdnaW5nRmFjZUVuZ2luZSgpO1xyXG4gICAgICAgIFxyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBBSSBwcm92aWRlcjogJHtzZWxlY3RlZFByb3ZpZGVyfS4gU3VwcG9ydGVkIHByb3ZpZGVyczogQkVEUk9DSywgT1BFTkFJLCBIVUdHSU5HRkFDRWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VsZWN0IHByb3ZpZGVyIHdpdGggY2FuYXJ5IGRlcGxveW1lbnQgc3VwcG9ydFxyXG4gICAqIFxyXG4gICAqIEltcGxlbWVudHMgdHJhZmZpYyBwZXJjZW50YWdlIHJvdXRpbmcgZm9yIGdyYWR1YWwgQmVkcm9jayByb2xsb3V0LlxyXG4gICAqIFdoZW4gQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgaXMgc2V0LCByb3V0ZXMgdGhhdCBwZXJjZW50YWdlIG9mIHRyYWZmaWMgdG8gQmVkcm9ja1xyXG4gICAqIHJlZ2FyZGxlc3Mgb2YgdGhlIEFJX1BST1ZJREVSIHNldHRpbmcuXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHByb3ZpZGVyIC0gT3B0aW9uYWwgcHJvdmlkZXIgb3ZlcnJpZGVcclxuICAgKiBAcmV0dXJucyBTZWxlY3RlZCBwcm92aWRlciBiYXNlZCBvbiBjYW5hcnkgbG9naWNcclxuICAgKi9cclxuICBwcml2YXRlIHN0YXRpYyBzZWxlY3RQcm92aWRlcldpdGhDYW5hcnkocHJvdmlkZXI/OiBBSVByb3ZpZGVyKTogQUlQcm92aWRlciB7XHJcbiAgICAvLyBJZiBwcm92aWRlciBpcyBleHBsaWNpdGx5IHNwZWNpZmllZCwgdXNlIGl0IChubyBjYW5hcnkgbG9naWMpXHJcbiAgICBpZiAocHJvdmlkZXIpIHtcclxuICAgICAgcmV0dXJuIHByb3ZpZGVyO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBiYXNlIHByb3ZpZGVyIGZyb20gZW52aXJvbm1lbnQgKGRlZmF1bHQ6IEJFRFJPQ0spXHJcbiAgICBjb25zdCBiYXNlUHJvdmlkZXIgPSAocHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgYXMgQUlQcm92aWRlcikgfHwgJ0JFRFJPQ0snO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGNhbmFyeSBkZXBsb3ltZW50IGlzIGVuYWJsZWRcclxuICAgIGNvbnN0IHRyYWZmaWNQZXJjZW50YWdlID0gcGFyc2VJbnQocHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLCAxMCk7XHJcblxyXG4gICAgLy8gSWYgbm8gY2FuYXJ5IGRlcGxveW1lbnQgb3IgaW52YWxpZCBwZXJjZW50YWdlLCB1c2UgYmFzZSBwcm92aWRlclxyXG4gICAgaWYgKHRyYWZmaWNQZXJjZW50YWdlIDw9IDAgfHwgdHJhZmZpY1BlcmNlbnRhZ2UgPiAxMDApIHtcclxuICAgICAgcmV0dXJuIGJhc2VQcm92aWRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiB0cmFmZmljIHBlcmNlbnRhZ2UgaXMgMTAwJSwgYWx3YXlzIHVzZSBCZWRyb2NrXHJcbiAgICBpZiAodHJhZmZpY1BlcmNlbnRhZ2UgPj0gMTAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdbQUlFbmdpbmVGYWN0b3J5XSBDYW5hcnkgZGVwbG95bWVudCBhdCAxMDAlIC0gcm91dGluZyB0byBCZWRyb2NrJyk7XHJcbiAgICAgIHJldHVybiAnQkVEUk9DSyc7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FuYXJ5IGRlcGxveW1lbnQ6IHJhbmRvbWx5IHJvdXRlIHRyYWZmaWMgYmFzZWQgb24gcGVyY2VudGFnZVxyXG4gICAgY29uc3QgcmFuZG9tID0gTWF0aC5yYW5kb20oKSAqIDEwMDtcclxuICAgIGNvbnN0IHVzZUJlZHJvY2sgPSByYW5kb20gPCB0cmFmZmljUGVyY2VudGFnZTtcclxuXHJcbiAgICBpZiAodXNlQmVkcm9jaykge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0FJRW5naW5lRmFjdG9yeV0gQ2FuYXJ5IGRlcGxveW1lbnQ6IHJvdXRpbmcgdG8gQmVkcm9jayAoJHt0cmFmZmljUGVyY2VudGFnZX0lIHRyYWZmaWMsIHJhbmRvbT0ke3JhbmRvbS50b0ZpeGVkKDIpfSlgKTtcclxuICAgICAgcmV0dXJuICdCRURST0NLJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQUlFbmdpbmVGYWN0b3J5XSBDYW5hcnkgZGVwbG95bWVudDogcm91dGluZyB0byAke2Jhc2VQcm92aWRlcn0gKCR7MTAwIC0gdHJhZmZpY1BlcmNlbnRhZ2V9JSB0cmFmZmljLCByYW5kb209JHtyYW5kb20udG9GaXhlZCgyKX0pYCk7XHJcbiAgICAgIHJldHVybiBiYXNlUHJvdmlkZXI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdGhlIGN1cnJlbnRseSBjb25maWd1cmVkIHByb3ZpZGVyXHJcbiAgICogXHJcbiAgICogQHJldHVybnMgQ3VycmVudCBBSSBwcm92aWRlclxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXRDdXJyZW50UHJvdmlkZXIoKTogQUlQcm92aWRlciB7XHJcbiAgICByZXR1cm4gKHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIGFzIEFJUHJvdmlkZXIpIHx8ICdCRURST0NLJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGEgcHJvdmlkZXIgaXMgc3VwcG9ydGVkXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHByb3ZpZGVyIC0gUHJvdmlkZXIgdG8gY2hlY2tcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHByb3ZpZGVyIGlzIHN1cHBvcnRlZFxyXG4gICAqL1xyXG4gIHN0YXRpYyBpc1Byb3ZpZGVyU3VwcG9ydGVkKHByb3ZpZGVyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBbJ0JFRFJPQ0snLCAnT1BFTkFJJywgJ0hVR0dJTkdGQUNFJ10uaW5jbHVkZXMocHJvdmlkZXIpO1xyXG4gIH1cclxufVxyXG4iXX0=