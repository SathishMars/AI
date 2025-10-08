import { LLMProviderType } from '@/app/types/llm';
import { OpenAIProvider } from './openai-provider';

export class AnthropicProvider extends OpenAIProvider {
  public readonly name: LLMProviderType = 'anthropic';
}
