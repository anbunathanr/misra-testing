"use strict";
/**
 * Hugging Face AI Engine
 *
 * Alternative to OpenAI using Hugging Face Inference API
 * Free tier available with rate limits
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceEngine = void 0;
const inference_1 = require("@huggingface/inference");
const zod_1 = require("zod");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const secretsClient = new client_secrets_manager_1.SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
let cachedApiKey = null;
// Zod schemas for validation
const AIGeneratedStepSchema = zod_1.z.object({
    action: zod_1.z.enum(['navigate', 'click', 'type', 'assert', 'wait']),
    description: zod_1.z.string(),
    elementDescription: zod_1.z.string().optional(),
    value: zod_1.z.string().optional(),
    assertion: zod_1.z.object({
        type: zod_1.z.enum(['exists', 'visible', 'text', 'value', 'attribute']),
        expected: zod_1.z.string(),
    }).optional(),
});
const TestSpecificationSchema = zod_1.z.object({
    testName: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    steps: zod_1.z.array(AIGeneratedStepSchema).min(1),
    tags: zod_1.z.array(zod_1.z.string()),
});
/**
 * Get Hugging Face API key from Secrets Manager or environment
 */
async function getHuggingFaceApiKey() {
    if (cachedApiKey) {
        return cachedApiKey;
    }
    // Check environment variable first (for local dev)
    if (process.env.HUGGINGFACE_API_KEY) {
        cachedApiKey = process.env.HUGGINGFACE_API_KEY;
        return cachedApiKey;
    }
    // Retrieve from Secrets Manager
    try {
        const secretName = process.env.HUGGINGFACE_SECRET_NAME || 'aibts/huggingface-api-key';
        const command = new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretName });
        const response = await secretsClient.send(command);
        if (!response.SecretString) {
            throw new Error('Hugging Face API key not found in Secrets Manager');
        }
        cachedApiKey = response.SecretString;
        return cachedApiKey;
    }
    catch (error) {
        throw new Error(`Failed to retrieve Hugging Face API key: ${error instanceof Error ? error.message : String(error)}`);
    }
}
class HuggingFaceEngine {
    client = null;
    // Free models available on Hugging Face
    MODEL = 'mistralai/Mixtral-8x7B-Instruct-v0.1'; // Good for code generation
    // Alternative: 'meta-llama/Llama-2-70b-chat-hf' or 'HuggingFaceH4/zephyr-7b-beta'
    async getClient() {
        if (this.client) {
            return this.client;
        }
        const apiKey = await getHuggingFaceApiKey();
        this.client = new inference_1.HfInference(apiKey);
        return this.client;
    }
    /**
     * Generate test specification from application analysis
     */
    async generateTestSpecification(analysis, scenario, context) {
        const startTime = Date.now();
        try {
            const client = await this.getClient();
            const prompt = this.constructPrompt(analysis, scenario, context);
            // Call Hugging Face Inference API
            const response = await client.textGeneration({
                model: this.MODEL,
                inputs: prompt,
                parameters: {
                    max_new_tokens: 2000,
                    temperature: 0.3,
                    top_p: 0.95,
                    return_full_text: false,
                },
            });
            const generatedText = response.generated_text;
            // Extract JSON from response (model might include extra text)
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            const specification = JSON.parse(jsonMatch[0]);
            const validatedSpec = this.validateResponse(specification);
            console.log(`[HuggingFace] Generated test in ${Date.now() - startTime}ms`);
            return validatedSpec;
        }
        catch (error) {
            console.error('[HuggingFace] Error:', error);
            throw error;
        }
    }
    /**
     * Construct prompt for Hugging Face model
     */
    constructPrompt(analysis, scenario, context) {
        const elementsDescription = analysis.elements
            .slice(0, 30) // Limit for token constraints
            .map((el, idx) => {
            const attrs = Object.entries(el.attributes)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');
            return `${idx + 1}. ${el.type} [${attrs}]`;
        })
            .join('\n');
        const patternsDescription = analysis.patterns
            .map((pattern) => `- ${pattern.type}: ${pattern.description}`)
            .join('\n');
        // Hugging Face models work better with clear instructions
        return `<s>[INST] You are an expert QA engineer. Generate a test case in JSON format.

Web Page Analysis:
- URL: ${analysis.url}
- Title: ${analysis.title}

Interactive Elements:
${elementsDescription}

UI Patterns:
${patternsDescription}

Test Scenario: "${scenario}"

Generate a JSON object with this exact structure (no extra text):
{
  "testName": "descriptive test name",
  "description": "what the test validates",
  "steps": [
    {
      "action": "navigate|click|type|assert|wait",
      "description": "step description",
      "elementDescription": "element to interact with",
      "value": "value for type action",
      "assertion": {
        "type": "exists|visible|text|value|attribute",
        "expected": "expected value"
      }
    }
  ],
  "tags": ["tag1", "tag2"]
}

Return ONLY the JSON object, no explanations. [/INST]`;
    }
    /**
     * Validate response against schema
     */
    validateResponse(response) {
        try {
            return TestSpecificationSchema.parse(response);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
                throw new Error(`Invalid test specification. Errors: ${issues}`);
            }
            throw new Error('Invalid test specification format');
        }
    }
}
exports.HuggingFaceEngine = HuggingFaceEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnZ2luZ2ZhY2UtZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHVnZ2luZ2ZhY2UtZW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBRUgsc0RBQXFEO0FBQ3JELDZCQUF3QjtBQU94Qiw0RUFBOEY7QUFFOUYsTUFBTSxhQUFhLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2xHLElBQUksWUFBWSxHQUFrQixJQUFJLENBQUM7QUFFdkMsNkJBQTZCO0FBQzdCLE1BQU0scUJBQXFCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNyQyxNQUFNLEVBQUUsT0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvRCxXQUFXLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRTtJQUN2QixrQkFBa0IsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3pDLEtBQUssRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzVCLFNBQVMsRUFBRSxPQUFDLENBQUMsTUFBTSxDQUFDO1FBQ2xCLElBQUksRUFBRSxPQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2pFLFFBQVEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFO0tBQ3JCLENBQUMsQ0FBQyxRQUFRLEVBQUU7Q0FDZCxDQUFDLENBQUM7QUFFSCxNQUFNLHVCQUF1QixHQUFHLE9BQUMsQ0FBQyxNQUFNLENBQUM7SUFDdkMsUUFBUSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENB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QUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25HLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDbkUsQ0FBQztZQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBeklELDhDQXlJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBIdWdnaW5nIEZhY2UgQUkgRW5naW5lXHJcbiAqIFxyXG4gKiBBbHRlcm5hdGl2ZSB0byBPcGVuQUkgdXNpbmcgSHVnZ2luZyBGYWNlIEluZmVyZW5jZSBBUElcclxuICogRnJlZSB0aWVyIGF2YWlsYWJsZSB3aXRoIHJhdGUgbGltaXRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgSGZJbmZlcmVuY2UgfSBmcm9tICdAaHVnZ2luZ2ZhY2UvaW5mZXJlbmNlJztcclxuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XHJcbmltcG9ydCB7XHJcbiAgVGVzdFNwZWNpZmljYXRpb24sXHJcbiAgQUlHZW5lcmF0ZWRTdGVwLFxyXG4gIEFwcGxpY2F0aW9uQW5hbHlzaXMsXHJcbiAgTGVhcm5pbmdDb250ZXh0LFxyXG59IGZyb20gJy4uLy4uL3R5cGVzL2FpLXRlc3QtZ2VuZXJhdGlvbic7XHJcbmltcG9ydCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcclxuXHJcbmNvbnN0IHNlY3JldHNDbGllbnQgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmxldCBjYWNoZWRBcGlLZXk6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cclxuLy8gWm9kIHNjaGVtYXMgZm9yIHZhbGlkYXRpb25cclxuY29uc3QgQUlHZW5lcmF0ZWRTdGVwU2NoZW1hID0gei5vYmplY3Qoe1xyXG4gIGFjdGlvbjogei5lbnVtKFsnbmF2aWdhdGUnLCAnY2xpY2snLCAndHlwZScsICdhc3NlcnQnLCAnd2FpdCddKSxcclxuICBkZXNjcmlwdGlvbjogei5zdHJpbmcoKSxcclxuICBlbGVtZW50RGVzY3JpcHRpb246IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcclxuICB2YWx1ZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxyXG4gIGFzc2VydGlvbjogei5vYmplY3Qoe1xyXG4gICAgdHlwZTogei5lbnVtKFsnZXhpc3RzJywgJ3Zpc2libGUnLCAndGV4dCcsICd2YWx1ZScsICdhdHRyaWJ1dGUnXSksXHJcbiAgICBleHBlY3RlZDogei5zdHJpbmcoKSxcclxuICB9KS5vcHRpb25hbCgpLFxyXG59KTtcclxuXHJcbmNvbnN0IFRlc3RTcGVjaWZpY2F0aW9uU2NoZW1hID0gei5vYmplY3Qoe1xyXG4gIHRlc3ROYW1lOiB6LnN0cmluZygpLm1pbigxKSxcclxuICBkZXNjcmlwdGlvbjogei5zdHJpbmcoKSxcclxuICBzdGVwczogei5hcnJheShBSUdlbmVyYXRlZFN0ZXBTY2hlbWEpLm1pbigxKSxcclxuICB0YWdzOiB6LmFycmF5KHouc3RyaW5nKCkpLFxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgSHVnZ2luZyBGYWNlIEFQSSBrZXkgZnJvbSBTZWNyZXRzIE1hbmFnZXIgb3IgZW52aXJvbm1lbnRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEh1Z2dpbmdGYWNlQXBpS2V5KCk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgaWYgKGNhY2hlZEFwaUtleSkge1xyXG4gICAgcmV0dXJuIGNhY2hlZEFwaUtleTtcclxuICB9XHJcbiAgXHJcbiAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGUgZmlyc3QgKGZvciBsb2NhbCBkZXYpXHJcbiAgaWYgKHByb2Nlc3MuZW52LkhVR0dJTkdGQUNFX0FQSV9LRVkpIHtcclxuICAgIGNhY2hlZEFwaUtleSA9IHByb2Nlc3MuZW52LkhVR0dJTkdGQUNFX0FQSV9LRVk7XHJcbiAgICByZXR1cm4gY2FjaGVkQXBpS2V5O1xyXG4gIH1cclxuICBcclxuICAvLyBSZXRyaWV2ZSBmcm9tIFNlY3JldHMgTWFuYWdlclxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzZWNyZXROYW1lID0gcHJvY2Vzcy5lbnYuSFVHR0lOR0ZBQ0VfU0VDUkVUX05BTUUgfHwgJ2FpYnRzL2h1Z2dpbmdmYWNlLWFwaS1rZXknO1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQoeyBTZWNyZXRJZDogc2VjcmV0TmFtZSB9KTtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0h1Z2dpbmcgRmFjZSBBUEkga2V5IG5vdCBmb3VuZCBpbiBTZWNyZXRzIE1hbmFnZXInKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY2FjaGVkQXBpS2V5ID0gcmVzcG9uc2UuU2VjcmV0U3RyaW5nO1xyXG4gICAgcmV0dXJuIGNhY2hlZEFwaUtleTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmV0cmlldmUgSHVnZ2luZyBGYWNlIEFQSSBrZXk6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEh1Z2dpbmdGYWNlRW5naW5lIHtcclxuICBwcml2YXRlIGNsaWVudDogSGZJbmZlcmVuY2UgfCBudWxsID0gbnVsbDtcclxuICBcclxuICAvLyBGcmVlIG1vZGVscyBhdmFpbGFibGUgb24gSHVnZ2luZyBGYWNlXHJcbiAgcHJpdmF0ZSByZWFkb25seSBNT0RFTCA9ICdtaXN0cmFsYWkvTWl4dHJhbC04eDdCLUluc3RydWN0LXYwLjEnOyAvLyBHb29kIGZvciBjb2RlIGdlbmVyYXRpb25cclxuICAvLyBBbHRlcm5hdGl2ZTogJ21ldGEtbGxhbWEvTGxhbWEtMi03MGItY2hhdC1oZicgb3IgJ0h1Z2dpbmdGYWNlSDQvemVwaHlyLTdiLWJldGEnXHJcbiAgXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRDbGllbnQoKTogUHJvbWlzZTxIZkluZmVyZW5jZT4ge1xyXG4gICAgaWYgKHRoaXMuY2xpZW50KSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNsaWVudDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgYXBpS2V5ID0gYXdhaXQgZ2V0SHVnZ2luZ0ZhY2VBcGlLZXkoKTtcclxuICAgIHRoaXMuY2xpZW50ID0gbmV3IEhmSW5mZXJlbmNlKGFwaUtleSk7XHJcbiAgICByZXR1cm4gdGhpcy5jbGllbnQ7XHJcbiAgfVxyXG4gIFxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIHRlc3Qgc3BlY2lmaWNhdGlvbiBmcm9tIGFwcGxpY2F0aW9uIGFuYWx5c2lzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGVUZXN0U3BlY2lmaWNhdGlvbihcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzLFxyXG4gICAgc2NlbmFyaW86IHN0cmluZyxcclxuICAgIGNvbnRleHQ/OiBMZWFybmluZ0NvbnRleHRcclxuICApOiBQcm9taXNlPFRlc3RTcGVjaWZpY2F0aW9uPiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjbGllbnQgPSBhd2FpdCB0aGlzLmdldENsaWVudCgpO1xyXG4gICAgICBjb25zdCBwcm9tcHQgPSB0aGlzLmNvbnN0cnVjdFByb21wdChhbmFseXNpcywgc2NlbmFyaW8sIGNvbnRleHQpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2FsbCBIdWdnaW5nIEZhY2UgSW5mZXJlbmNlIEFQSVxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNsaWVudC50ZXh0R2VuZXJhdGlvbih7XHJcbiAgICAgICAgbW9kZWw6IHRoaXMuTU9ERUwsXHJcbiAgICAgICAgaW5wdXRzOiBwcm9tcHQsXHJcbiAgICAgICAgcGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgbWF4X25ld190b2tlbnM6IDIwMDAsXHJcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxyXG4gICAgICAgICAgdG9wX3A6IDAuOTUsXHJcbiAgICAgICAgICByZXR1cm5fZnVsbF90ZXh0OiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGdlbmVyYXRlZFRleHQgPSByZXNwb25zZS5nZW5lcmF0ZWRfdGV4dDtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgSlNPTiBmcm9tIHJlc3BvbnNlIChtb2RlbCBtaWdodCBpbmNsdWRlIGV4dHJhIHRleHQpXHJcbiAgICAgIGNvbnN0IGpzb25NYXRjaCA9IGdlbmVyYXRlZFRleHQubWF0Y2goL1xce1tcXHNcXFNdKlxcfS8pO1xyXG4gICAgICBpZiAoIWpzb25NYXRjaCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gSlNPTiBmb3VuZCBpbiBBSSByZXNwb25zZScpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBzcGVjaWZpY2F0aW9uID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xyXG4gICAgICBjb25zdCB2YWxpZGF0ZWRTcGVjID0gdGhpcy52YWxpZGF0ZVJlc3BvbnNlKHNwZWNpZmljYXRpb24pO1xyXG4gICAgICBcclxuICAgICAgY29uc29sZS5sb2coYFtIdWdnaW5nRmFjZV0gR2VuZXJhdGVkIHRlc3QgaW4gJHtEYXRlLm5vdygpIC0gc3RhcnRUaW1lfW1zYCk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gdmFsaWRhdGVkU3BlYztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tIdWdnaW5nRmFjZV0gRXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0IHByb21wdCBmb3IgSHVnZ2luZyBGYWNlIG1vZGVsXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RQcm9tcHQoXHJcbiAgICBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpcyxcclxuICAgIHNjZW5hcmlvOiBzdHJpbmcsXHJcbiAgICBjb250ZXh0PzogTGVhcm5pbmdDb250ZXh0XHJcbiAgKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGVsZW1lbnRzRGVzY3JpcHRpb24gPSBhbmFseXNpcy5lbGVtZW50c1xyXG4gICAgICAuc2xpY2UoMCwgMzApIC8vIExpbWl0IGZvciB0b2tlbiBjb25zdHJhaW50c1xyXG4gICAgICAubWFwKChlbCwgaWR4KSA9PiB7XHJcbiAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuZW50cmllcyhlbC5hdHRyaWJ1dGVzKVxyXG4gICAgICAgICAgLmZpbHRlcigoW18sIHZhbHVlXSkgPT4gdmFsdWUpXHJcbiAgICAgICAgICAubWFwKChba2V5LCB2YWx1ZV0pID0+IGAke2tleX09XCIke3ZhbHVlfVwiYClcclxuICAgICAgICAgIC5qb2luKCcgJyk7XHJcbiAgICAgICAgcmV0dXJuIGAke2lkeCArIDF9LiAke2VsLnR5cGV9IFske2F0dHJzfV1gO1xyXG4gICAgICB9KVxyXG4gICAgICAuam9pbignXFxuJyk7XHJcblxyXG4gICAgY29uc3QgcGF0dGVybnNEZXNjcmlwdGlvbiA9IGFuYWx5c2lzLnBhdHRlcm5zXHJcbiAgICAgIC5tYXAoKHBhdHRlcm4pID0+IGAtICR7cGF0dGVybi50eXBlfTogJHtwYXR0ZXJuLmRlc2NyaXB0aW9ufWApXHJcbiAgICAgIC5qb2luKCdcXG4nKTtcclxuXHJcbiAgICAvLyBIdWdnaW5nIEZhY2UgbW9kZWxzIHdvcmsgYmV0dGVyIHdpdGggY2xlYXIgaW5zdHJ1Y3Rpb25zXHJcbiAgICByZXR1cm4gYDxzPltJTlNUXSBZb3UgYXJlIGFuIGV4cGVydCBRQSBlbmdpbmVlci4gR2VuZXJhdGUgYSB0ZXN0IGNhc2UgaW4gSlNPTiBmb3JtYXQuXHJcblxyXG5XZWIgUGFnZSBBbmFseXNpczpcclxuLSBVUkw6ICR7YW5hbHlzaXMudXJsfVxyXG4tIFRpdGxlOiAke2FuYWx5c2lzLnRpdGxlfVxyXG5cclxuSW50ZXJhY3RpdmUgRWxlbWVudHM6XHJcbiR7ZWxlbWVudHNEZXNjcmlwdGlvbn1cclxuXHJcblVJIFBhdHRlcm5zOlxyXG4ke3BhdHRlcm5zRGVzY3JpcHRpb259XHJcblxyXG5UZXN0IFNjZW5hcmlvOiBcIiR7c2NlbmFyaW99XCJcclxuXHJcbkdlbmVyYXRlIGEgSlNPTiBvYmplY3Qgd2l0aCB0aGlzIGV4YWN0IHN0cnVjdHVyZSAobm8gZXh0cmEgdGV4dCk6XHJcbntcclxuICBcInRlc3ROYW1lXCI6IFwiZGVzY3JpcHRpdmUgdGVzdCBuYW1lXCIsXHJcbiAgXCJkZXNjcmlwdGlvblwiOiBcIndoYXQgdGhlIHRlc3QgdmFsaWRhdGVzXCIsXHJcbiAgXCJzdGVwc1wiOiBbXHJcbiAgICB7XHJcbiAgICAgIFwiYWN0aW9uXCI6IFwibmF2aWdhdGV8Y2xpY2t8dHlwZXxhc3NlcnR8d2FpdFwiLFxyXG4gICAgICBcImRlc2NyaXB0aW9uXCI6IFwic3RlcCBkZXNjcmlwdGlvblwiLFxyXG4gICAgICBcImVsZW1lbnREZXNjcmlwdGlvblwiOiBcImVsZW1lbnQgdG8gaW50ZXJhY3Qgd2l0aFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwidmFsdWUgZm9yIHR5cGUgYWN0aW9uXCIsXHJcbiAgICAgIFwiYXNzZXJ0aW9uXCI6IHtcclxuICAgICAgICBcInR5cGVcIjogXCJleGlzdHN8dmlzaWJsZXx0ZXh0fHZhbHVlfGF0dHJpYnV0ZVwiLFxyXG4gICAgICAgIFwiZXhwZWN0ZWRcIjogXCJleHBlY3RlZCB2YWx1ZVwiXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdLFxyXG4gIFwidGFnc1wiOiBbXCJ0YWcxXCIsIFwidGFnMlwiXVxyXG59XHJcblxyXG5SZXR1cm4gT05MWSB0aGUgSlNPTiBvYmplY3QsIG5vIGV4cGxhbmF0aW9ucy4gWy9JTlNUXWA7XHJcbiAgfVxyXG4gIFxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHJlc3BvbnNlIGFnYWluc3Qgc2NoZW1hXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB2YWxpZGF0ZVJlc3BvbnNlKHJlc3BvbnNlOiB1bmtub3duKTogVGVzdFNwZWNpZmljYXRpb24ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIFRlc3RTcGVjaWZpY2F0aW9uU2NoZW1hLnBhcnNlKHJlc3BvbnNlKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIHouWm9kRXJyb3IpIHtcclxuICAgICAgICBjb25zdCBpc3N1ZXMgPSBlcnJvci5pc3N1ZXMubWFwKChpc3N1ZSkgPT4gYCR7aXNzdWUucGF0aC5qb2luKCcuJyl9OiAke2lzc3VlLm1lc3NhZ2V9YCkuam9pbignLCAnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGVzdCBzcGVjaWZpY2F0aW9uLiBFcnJvcnM6ICR7aXNzdWVzfWApO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0ZXN0IHNwZWNpZmljYXRpb24gZm9ybWF0Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==