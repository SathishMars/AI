// src/app/utils/streaming-manager.ts
import { StreamChunk, StreamingConfig, DEFAULT_STREAMING_CONFIG } from '@/app/types/conversation';

export class StreamingMessageRenderer {
  private currentStream: AbortController | null = null;
  private config: StreamingConfig;
  
  constructor(config: StreamingConfig = DEFAULT_STREAMING_CONFIG) {
    this.config = config;
  }
  
  async renderStreamingMessage(
    messageId: string,
    stream: AsyncGenerator<StreamChunk>,
    container: HTMLElement,
    onChunkReceived?: (chunk: StreamChunk) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    this.currentStream = new AbortController();
    
    try {
      for await (const chunk of stream) {
        if (this.currentStream.signal.aborted) break;
        
        this.appendChunk(messageId, chunk, container);
        onChunkReceived?.(chunk);
        
        if (this.config.enableSmoothScrolling) {
          this.smoothScrollToBottom(container);
        }
        
        // Add natural pause between chunks for readability
        if (this.config.delayBetweenChunks > 0) {
          await this.chunkDelay(chunk.content.length);
        }
      }
      
      onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Streaming error');
      this.handleStreamError(messageId, errorMessage, container);
      onError?.(errorMessage);
    } finally {
      this.markStreamComplete(messageId, container);
      this.currentStream = null;
    }
  }
  
  cancelStream(): void {
    if (this.currentStream) {
      this.currentStream.abort();
      this.currentStream = null;
    }
  }
  
  private appendChunk(messageId: string, chunk: StreamChunk, container: HTMLElement): void {
    const messageElement = this.getMessageElement(messageId, container);
    if (!messageElement) return;
    
    const contentElement = messageElement.querySelector('.message-content') as HTMLElement;
    if (!contentElement) return;
    
    // Create or update chunk element
    let chunkElement = messageElement.querySelector(`[data-chunk-id="${chunk.id}"]`) as HTMLElement;
    if (!chunkElement) {
      chunkElement = document.createElement('span');
      chunkElement.setAttribute('data-chunk-id', chunk.id);
      chunkElement.className = 'stream-chunk';
      contentElement.appendChild(chunkElement);
    }
    
    // Update content with fade-in animation
    chunkElement.textContent = chunk.content;
    if (this.config.enableSmoothScrolling) {
      chunkElement.style.opacity = '0';
      chunkElement.style.transition = 'opacity 0.3s ease-in';
      
      // Trigger animation
      requestAnimationFrame(() => {
        chunkElement.style.opacity = '1';
      });
    }
  }
  
  private getMessageElement(messageId: string, container: HTMLElement): HTMLElement | null {
    return container.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
  }
  
  private smoothScrollToBottom(container: HTMLElement): void {
    const scrollContainer = this.findScrollContainer(container);
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }
  
  private findScrollContainer(element: HTMLElement): HTMLElement | null {
    let current = element;
    while (current && current !== document.body) {
      const style = getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return current;
      }
      current = current.parentElement as HTMLElement;
    }
    return null;
  }
  
  private chunkDelay(contentLength: number): Promise<void> {
    // Longer chunks get slightly longer delays for natural reading
    const baseDelay = this.config.delayBetweenChunks;
    const lengthMultiplier = Math.min(2, Math.max(0.5, contentLength / 50));
    const delay = Math.min(500, Math.max(50, baseDelay * lengthMultiplier));
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  private handleStreamError(messageId: string, error: Error, container: HTMLElement): void {
    const messageElement = this.getMessageElement(messageId, container);
    if (!messageElement) return;
    
    const errorElement = document.createElement('div');
    errorElement.className = 'stream-error';
    errorElement.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">Streaming error: ${error.message}</span>
        <button class="retry-button" onclick="this.dispatchEvent(new CustomEvent('retry-stream', { bubbles: true, detail: { messageId: '${messageId}' } }))">
          Retry
        </button>
      </div>
    `;
    
    messageElement.appendChild(errorElement);
  }
  
  private markStreamComplete(messageId: string, container: HTMLElement): void {
    const messageElement = this.getMessageElement(messageId, container);
    if (!messageElement) return;
    
    messageElement.setAttribute('data-stream-status', 'complete');
    
    // Remove typing indicator if present
    const typingIndicator = messageElement.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  // Add typing indicator
  showTypingIndicator(messageId: string, container: HTMLElement): void {
    if (!this.config.showTypingIndicator) return;
    
    const messageElement = this.getMessageElement(messageId, container);
    if (!messageElement) return;
    
    const existingIndicator = messageElement.querySelector('.typing-indicator');
    if (existingIndicator) return;
    
    const typingElement = document.createElement('div');
    typingElement.className = 'typing-indicator';
    typingElement.innerHTML = `
      <div class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    
    const contentElement = messageElement.querySelector('.message-content') as HTMLElement;
    if (contentElement) {
      contentElement.appendChild(typingElement);
    }
  }
  
  hideTypingIndicator(messageId: string, container: HTMLElement): void {
    const messageElement = this.getMessageElement(messageId, container);
    if (!messageElement) return;
    
    const typingIndicator = messageElement.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  // Get current streaming status
  isStreaming(): boolean {
    return this.currentStream !== null;
  }
}

// Stream chunk generator utility
export class StreamChunkGenerator {
  private chunkCounter = 0;
  
  async* generateFromText(text: string, chunkSize: number = 50): AsyncGenerator<StreamChunk> {
    const words = text.split(' ');
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 > chunkSize && currentChunk.length > 0) {
        yield this.createChunk(currentChunk.trim());
        currentChunk = word + ' ';
      } else {
        currentChunk += word + ' ';
      }
    }
    
    // Yield final chunk if any content remains
    if (currentChunk.trim().length > 0) {
      yield this.createChunk(currentChunk.trim(), true);
    }
  }
  
  async* generateFromSentences(text: string): AsyncGenerator<StreamChunk> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 0) {
        const isLast = i === sentences.length - 1;
        yield this.createChunk(sentence + (isLast ? '' : '.'), isLast);
      }
    }
  }
  
  private createChunk(content: string, isComplete: boolean = false): StreamChunk {
    return {
      id: `chunk_${Date.now()}_${this.chunkCounter++}`,
      content,
      timestamp: new Date(),
      chunkIndex: this.chunkCounter - 1,
      isComplete
    };
  }
  
  reset(): void {
    this.chunkCounter = 0;
  }
}

// Mock API for testing streaming
export class MockStreamingAPI {
  private chunkGenerator = new StreamChunkGenerator();
  
  async* generateResponse(prompt: string, _config?: StreamingConfig): AsyncGenerator<StreamChunk> {
    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const responses = [
      `I understand you want to create a workflow for "${prompt}". Let me help you build this step by step.`,
      `First, let's define the trigger for this workflow. What event should start this process?`,
      `Based on your requirements, I recommend using these functions: @requestApproval, @createAnEvent, and @surveyForFeedback.`,
      `Here's a draft workflow structure that we can refine together...`
    ];
    
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    
    yield* this.chunkGenerator.generateFromSentences(selectedResponse);
  }
  
  async* generateWorkflowJSON(_conversation: string[], _context: Record<string, unknown>): AsyncGenerator<StreamChunk> {
    const jsonContent = `{
  "steps": {
    "start": {
      "name": "Meeting Request Received",
      "type": "trigger",
      "action": "onMRFSubmit",
      "params": { "mrfID": "{{mrf.id}}" },
      "nextSteps": ["checkApproval"]
    },
    "checkApproval": {
      "name": "Check if Approval Required",
      "type": "condition",
      "condition": {
        "all": [
          { "fact": "mrf.attendees", "operator": "greaterThan", "value": 50 }
        ]
      },
      "onSuccess": "requestApproval",
      "onFailure": "createEvent"
    },
    "requestApproval": {
      "name": "Request Manager Approval",
      "type": "action",
      "action": "functions.requestApproval",
      "params": {
        "to": "{{user.manager}}",
        "subject": "Approval needed for {{mrf.title}}"
      },
      "onSuccess": "createEvent",
      "onFailure": "terminateWithError"
    },
    "createEvent": {
      "name": "Create Calendar Event",
      "type": "action",
      "action": "functions.createAnEvent",
      "params": { "mrfData": "{{mrf}}" },
      "nextSteps": ["end"]
    },
    "end": { "type": "end", "result": "success" }
  }
}`;
    
    yield* this.chunkGenerator.generateFromText(jsonContent, 100);
  }
}