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
        // Determine provider: use parameter, then env var, then default to BEDROCK
        const selectedProvider = provider ||
            process.env.AI_PROVIDER ||
            'BEDROCK';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZW5naW5lLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhaS1lbmdpbmUtZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxxREFBaUQ7QUFDakQsMkNBQXVDO0FBQ3ZDLDZEQUF5RDtBQW9CekQ7Ozs7O0dBS0c7QUFDSCxNQUFhLGVBQWU7SUFDMUI7Ozs7OztPQU1HO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFxQjtRQUNqQywyRUFBMkU7UUFDM0UsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRO1lBQ1IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUEwQjtZQUN2QyxTQUFTLENBQUM7UUFFbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzREFBc0QsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBRXRGLFFBQVEsZ0JBQWdCLEVBQUUsQ0FBQztZQUN6QixLQUFLLFNBQVM7Z0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO2dCQUNwRixPQUFPLElBQUksOEJBQWEsRUFBRSxDQUFDO1lBRTdCLEtBQUssUUFBUTtnQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7Z0JBQzVELE9BQU8sSUFBSSxvQkFBUSxFQUFFLENBQUM7WUFFeEIsS0FBSyxhQUFhO2dCQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7Z0JBQ2pFLE9BQU8sSUFBSSxzQ0FBaUIsRUFBRSxDQUFDO1lBRWpDO2dCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLGdCQUFnQixxREFBcUQsQ0FBQyxDQUFDO1FBQ25ILENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxrQkFBa0I7UUFDdkIsT0FBUSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQTBCLElBQUksU0FBUyxDQUFDO0lBQzlELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFnQjtRQUN6QyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakUsQ0FBQztDQUNGO0FBcERELDBDQW9EQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBSSBFbmdpbmUgRmFjdG9yeVxyXG4gKiBcclxuICogUHJvdmlkZXMgYSBjZW50cmFsaXplZCBmYWN0b3J5IGZvciBjcmVhdGluZyBBSSBlbmdpbmUgaW5zdGFuY2VzIGJhc2VkIG9uXHJcbiAqIHRoZSBjb25maWd1cmVkIHByb3ZpZGVyLiBTdXBwb3J0cyBtdWx0aXBsZSBBSSBwcm92aWRlcnMgKEJlZHJvY2ssIE9wZW5BSSwgSHVnZ2luZ0ZhY2UpXHJcbiAqIHdpdGggcnVudGltZSBwcm92aWRlciBzZWxlY3Rpb24gdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBCZWRyb2NrRW5naW5lIH0gZnJvbSAnLi9iZWRyb2NrLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFJRW5naW5lIH0gZnJvbSAnLi9haS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBIdWdnaW5nRmFjZUVuZ2luZSB9IGZyb20gJy4vaHVnZ2luZ2ZhY2UtZW5naW5lJztcclxuaW1wb3J0IHsgQXBwbGljYXRpb25BbmFseXNpcywgTGVhcm5pbmdDb250ZXh0LCBUZXN0U3BlY2lmaWNhdGlvbiB9IGZyb20gJy4uLy4uL3R5cGVzL2FpLXRlc3QtZ2VuZXJhdGlvbic7XHJcblxyXG4vKipcclxuICogU3VwcG9ydGVkIEFJIHByb3ZpZGVyc1xyXG4gKi9cclxuZXhwb3J0IHR5cGUgQUlQcm92aWRlciA9ICdCRURST0NLJyB8ICdPUEVOQUknIHwgJ0hVR0dJTkdGQUNFJztcclxuXHJcbi8qKlxyXG4gKiBDb21tb24gaW50ZXJmYWNlIGZvciBhbGwgQUkgZW5naW5lc1xyXG4gKiBUaGlzIGVuc3VyZXMgYWxsIGVuZ2luZXMgY2FuIGJlIHVzZWQgaW50ZXJjaGFuZ2VhYmx5XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIElBSUVuZ2luZSB7XHJcbiAgZ2VuZXJhdGVUZXN0U3BlY2lmaWNhdGlvbihcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzLFxyXG4gICAgc2NlbmFyaW86IHN0cmluZyxcclxuICAgIGNvbnRleHQ/OiBMZWFybmluZ0NvbnRleHRcclxuICApOiBQcm9taXNlPFRlc3RTcGVjaWZpY2F0aW9uPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFJIEVuZ2luZSBGYWN0b3J5XHJcbiAqIFxyXG4gKiBDcmVhdGVzIEFJIGVuZ2luZSBpbnN0YW5jZXMgYmFzZWQgb24gdGhlIEFJX1BST1ZJREVSIGVudmlyb25tZW50IHZhcmlhYmxlLlxyXG4gKiBEZWZhdWx0cyB0byBCRURST0NLIGlmIG5vdCBzcGVjaWZpZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQUlFbmdpbmVGYWN0b3J5IHtcclxuICAvKipcclxuICAgKiBDcmVhdGUgYW4gQUkgZW5naW5lIGluc3RhbmNlIGZvciB0aGUgc3BlY2lmaWVkIHByb3ZpZGVyXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHByb3ZpZGVyIC0gT3B0aW9uYWwgcHJvdmlkZXIgb3ZlcnJpZGUuIElmIG5vdCBzcGVjaWZpZWQsIHJlYWRzIGZyb20gQUlfUFJPVklERVIgZW52IHZhclxyXG4gICAqIEByZXR1cm5zIEFJIGVuZ2luZSBpbnN0YW5jZVxyXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgcHJvdmlkZXIgaXMgdW5rbm93blxyXG4gICAqL1xyXG4gIHN0YXRpYyBjcmVhdGUocHJvdmlkZXI/OiBBSVByb3ZpZGVyKTogSUFJRW5naW5lIHtcclxuICAgIC8vIERldGVybWluZSBwcm92aWRlcjogdXNlIHBhcmFtZXRlciwgdGhlbiBlbnYgdmFyLCB0aGVuIGRlZmF1bHQgdG8gQkVEUk9DS1xyXG4gICAgY29uc3Qgc2VsZWN0ZWRQcm92aWRlciA9IHByb3ZpZGVyIHx8IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIGFzIEFJUHJvdmlkZXIpIHx8IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0JFRFJPQ0snO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZyhgW0FJRW5naW5lRmFjdG9yeV0gQ3JlYXRpbmcgQUkgZW5naW5lIGZvciBwcm92aWRlcjogJHtzZWxlY3RlZFByb3ZpZGVyfWApO1xyXG4gICAgXHJcbiAgICBzd2l0Y2ggKHNlbGVjdGVkUHJvdmlkZXIpIHtcclxuICAgICAgY2FzZSAnQkVEUk9DSyc6XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tBSUVuZ2luZUZhY3RvcnldIEluaXRpYWxpemluZyBCZWRyb2NrIGVuZ2luZSB3aXRoIENsYXVkZSAzLjUgU29ubmV0Jyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCZWRyb2NrRW5naW5lKCk7XHJcbiAgICAgICAgXHJcbiAgICAgIGNhc2UgJ09QRU5BSSc6XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tBSUVuZ2luZUZhY3RvcnldIEluaXRpYWxpemluZyBPcGVuQUkgZW5naW5lJyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBSUVuZ2luZSgpO1xyXG4gICAgICAgIFxyXG4gICAgICBjYXNlICdIVUdHSU5HRkFDRSc6XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tBSUVuZ2luZUZhY3RvcnldIEluaXRpYWxpemluZyBIdWdnaW5nRmFjZSBlbmdpbmUnKTtcclxuICAgICAgICByZXR1cm4gbmV3IEh1Z2dpbmdGYWNlRW5naW5lKCk7XHJcbiAgICAgICAgXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIEFJIHByb3ZpZGVyOiAke3NlbGVjdGVkUHJvdmlkZXJ9LiBTdXBwb3J0ZWQgcHJvdmlkZXJzOiBCRURST0NLLCBPUEVOQUksIEhVR0dJTkdGQUNFYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdGhlIGN1cnJlbnRseSBjb25maWd1cmVkIHByb3ZpZGVyXHJcbiAgICogXHJcbiAgICogQHJldHVybnMgQ3VycmVudCBBSSBwcm92aWRlclxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXRDdXJyZW50UHJvdmlkZXIoKTogQUlQcm92aWRlciB7XHJcbiAgICByZXR1cm4gKHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIGFzIEFJUHJvdmlkZXIpIHx8ICdCRURST0NLJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGEgcHJvdmlkZXIgaXMgc3VwcG9ydGVkXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHByb3ZpZGVyIC0gUHJvdmlkZXIgdG8gY2hlY2tcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHByb3ZpZGVyIGlzIHN1cHBvcnRlZFxyXG4gICAqL1xyXG4gIHN0YXRpYyBpc1Byb3ZpZGVyU3VwcG9ydGVkKHByb3ZpZGVyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBbJ0JFRFJPQ0snLCAnT1BFTkFJJywgJ0hVR0dJTkdGQUNFJ10uaW5jbHVkZXMocHJvdmlkZXIpO1xyXG4gIH1cclxufVxyXG4iXX0=