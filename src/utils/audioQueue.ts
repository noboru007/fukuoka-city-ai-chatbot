
import { decode, decodeAudioData } from './audioHelper';

export class AudioQueue {
  private audioContext: AudioContext | null = null;
  private queue: string[] = [];
  private isPlaying: boolean = false;
  private nextStartTime: number = 0;
  private sourceNodes: AudioBufferSourceNode[] = [];
  private onEndedCallback: (() => void) | null = null;
  private processingCount: number = 0;

  constructor(onEnded?: () => void) {
    this.onEndedCallback = onEnded || null;
  }

  private initContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async enqueue(base64Audio: string) {
    this.queue.push(base64Audio);
    if (this.isPlaying) {
      await this.scheduleNext();
    }
  }

  public async play() {
    if (this.isPlaying) return;
    
    this.initContext();
    
    // Critical for mobile: resume context if suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.nextStartTime = this.audioContext!.currentTime;
    await this.scheduleNext();
  }

  private async scheduleNext() {
    if (!this.audioContext) return;

    // Process all available chunks
    while (this.queue.length > 0) {
        const chunk = this.queue.shift();
        if (!chunk) continue;

        this.processingCount++;
        try {
            const decodedBytes = decode(chunk);
            const audioBuffer = await decodeAudioData(decodedBytes, this.audioContext, 24000);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            
            // Schedule ahead
            // Ensure we don't schedule in the past
            const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime + 0.05);
            source.start(startTime);
            
            this.nextStartTime = startTime + audioBuffer.duration;
            
            source.onended = () => {
                this.sourceNodes = this.sourceNodes.filter(n => n !== source);
                // Check if playback is fully complete:
                // 1. No items in queue
                // 2. No active source nodes playing
                // 3. No chunks currently being decoded/processed
                // 4. Currently marked as playing
                if (this.queue.length === 0 && this.sourceNodes.length === 0 && this.processingCount === 0 && this.isPlaying) {
                    this.isPlaying = false;
                    if (this.onEndedCallback) this.onEndedCallback();
                }
            };

            this.sourceNodes.push(source);
        } catch (e) {
            console.error("Error decoding/playing chunk:", e);
        } finally {
            this.processingCount--;
        }
    }
  }

  public stop() {
    this.isPlaying = false;
    this.queue = [];
    this.sourceNodes.forEach(node => {
        node.onended = null; // Clean up listener to prevent callbacks during forced stop
        try { node.stop(); } catch (e) {}
        node.disconnect();
    });
    this.sourceNodes = [];
    this.processingCount = 0;
    if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
    }
    this.audioContext = null;
    if (this.onEndedCallback) this.onEndedCallback();
  }

  public getIsPlaying() {
    return this.isPlaying;
  }
}
