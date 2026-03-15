/**
 * Hugging Face AI Engine
 * 
 * Alternative to OpenAI using Hugging Face Inference API
 * Free tier available with rate limits
 */

import { HfInference } from '@huggingface/inference';
import { z } from 'zod';
import {
  TestSpecification,
  AIGeneratedStep,
  ApplicationAnalysis,
  LearningContext,
} from '../../types/ai-test-generation';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
let cachedApiKey: string | null = null;

// Zod schemas for validation
const AIGeneratedStepSchema = z.object({
  action: z.enum(['navigate', 'click', 'type', 'assert', 'wait']),
  description: z.string(),
  elementDescription: z.string().optional(),
  value: z.string().optional(),
  assertion: z.object({
    type: z.enum(['exists', 'visible', 'text', 'value', 'attribute']),
    expected: z.string(),
  }).optional(),
});

const TestSpecificationSchema = z.object({
  testName: z.string().min(1),
  description: z.string(),
  steps: z.array(AIGeneratedStepSchema).min(1),
  tags: z.array(z.string()),
});

/**
 * Get Hugging Face API key from Secrets Manager or environment
 */
async function getHuggingFaceApiKey(): Promise<string> {
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
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('Hugging Face API key not found in Secrets Manager');
    }
    
    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    throw new Error(`Failed to retrieve Hugging Face API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export class HuggingFaceEngine {
  private client: HfInference | null = null;
  
  // Free models available on Hugging Face
  private readonly MODEL = 'mistralai/Mixtral-8x7B-Instruct-v0.1'; // Good for code generation
  // Alternative: 'meta-llama/Llama-2-70b-chat-hf' or 'HuggingFaceH4/zephyr-7b-beta'
  
  private async getClient(): Promise<HfInference> {
    if (this.client) {
      return this.client;
    }
    
    const apiKey = await getHuggingFaceApiKey();
    this.client = new HfInference(apiKey);
    return this.client;
  }
  
  /**
   * Generate test specification from application analysis
   */
  async generateTestSpecification(
    analysis: ApplicationAnalysis,
    scenario: string,
    context?: LearningContext
  ): Promise<TestSpecification> {
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
    } catch (error) {
      console.error('[HuggingFace] Error:', error);
      throw error;
    }
  }
  
  /**
   * Construct prompt for Hugging Face model
   */
  private constructPrompt(
    analysis: ApplicationAnalysis,
    scenario: string,
    context?: LearningContext
  ): string {
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
  private validateResponse(response: unknown): TestSpecification {
    try {
      return TestSpecificationSchema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        throw new Error(`Invalid test specification. Errors: ${issues}`);
      }
      throw new Error('Invalid test specification format');
    }
  }
}
