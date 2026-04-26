export class SessionRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async start(): Promise<void> {
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    this.recorder = new MediaRecorder(this.stream, { mimeType });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('Not recording'));
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.stream?.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.recorder = null;
        resolve(blob);
      };
      this.recorder.stop();
    });
  }
}
