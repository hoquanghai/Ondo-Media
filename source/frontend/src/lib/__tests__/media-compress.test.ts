import { processFilesForUpload } from '../media-compress';

// Mock URL.createObjectURL and URL.revokeObjectURL
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

/**
 * Helper to create a mock File with a specific size.
 */
function createMockFile(
  name: string,
  sizeBytes: number,
  type: string,
): File {
  // Create a buffer of the specified size (capped at 1KB for performance, size is overridden)
  const buffer = new ArrayBuffer(Math.min(sizeBytes, 1024));
  const file = new File([buffer], name, { type });
  // Override the size property since File constructor size depends on actual content
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('processFilesForUpload()', () => {
  describe('images', () => {
    it('should pass through small images without compression', async () => {
      const smallImage = createMockFile('photo.jpg', 100 * 1024, 'image/jpeg'); // 100KB

      // Mock Image constructor for compressImage
      const mockImg = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        set src(_val: string) {
          // Trigger onload synchronously for small files
          // But compressImage skips files < 500KB, so it returns the original
          setTimeout(() => this.onload?.(), 0);
        },
        width: 800,
        height: 600,
      };
      jest.spyOn(window, 'Image').mockImplementation(() => mockImg as unknown as HTMLImageElement);

      const result = await processFilesForUpload([smallImage]);

      expect(result.errors).toHaveLength(0);
      expect(result.processedFiles).toHaveLength(1);
      // Small image should be passed through as-is (< 500KB skip in compressImage)
      expect(result.processedFiles[0].name).toBe('photo.jpg');
    });
  });

  describe('videos', () => {
    it('should reject videos over 100MB', async () => {
      const largeVideo = createMockFile(
        'big-video.mp4',
        150 * 1024 * 1024, // 150MB
        'video/mp4',
      );

      // Mock video element for validateVideo
      const mockVideo = {
        preload: '',
        onloadedmetadata: null as (() => void) | null,
        onerror: null as (() => void) | null,
        set src(_val: string) {
          // Size check happens before resolution check, so validateVideo will
          // reject based on size before even creating the video element.
        },
        videoHeight: 720,
      };
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'video') return mockVideo as unknown as HTMLVideoElement;
          return document.createElement.bind(document)(tag) as unknown as HTMLElement;
        });

      const result = await processFilesForUpload([largeVideo]);

      expect(result.processedFiles).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('100MB');
    });

    it('should accept videos under 100MB with valid resolution', async () => {
      const video = createMockFile('clip.mp4', 50 * 1024 * 1024, 'video/mp4'); // 50MB

      const mockVideo = {
        preload: '',
        onloadedmetadata: null as (() => void) | null,
        onerror: null as (() => void) | null,
        set src(_val: string) {
          setTimeout(() => this.onloadedmetadata?.(), 0);
        },
        videoHeight: 720,
      };

      const originalCreateElement = document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'video') return mockVideo as unknown as HTMLVideoElement;
          return originalCreateElement(tag);
        });

      const result = await processFilesForUpload([video]);

      expect(result.errors).toHaveLength(0);
      expect(result.processedFiles).toHaveLength(1);
    });
  });

  describe('documents', () => {
    it('should reject documents over 20MB', async () => {
      const bigDoc = createMockFile(
        'huge.pdf',
        25 * 1024 * 1024, // 25MB
        'application/pdf',
      );

      const result = await processFilesForUpload([bigDoc]);

      expect(result.processedFiles).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('20MB');
    });

    it('should pass through documents under 20MB', async () => {
      const doc = createMockFile('report.pdf', 5 * 1024 * 1024, 'application/pdf'); // 5MB

      const result = await processFilesForUpload([doc]);

      expect(result.errors).toHaveLength(0);
      expect(result.processedFiles).toHaveLength(1);
      expect(result.processedFiles[0].name).toBe('report.pdf');
    });
  });

  describe('mixed files', () => {
    it('should process multiple files and collect errors', async () => {
      const smallImage = createMockFile('ok.jpg', 200 * 1024, 'image/jpeg');
      const hugeDoc = createMockFile('too-big.pdf', 25 * 1024 * 1024, 'application/pdf');
      const goodDoc = createMockFile('ok.pdf', 1 * 1024 * 1024, 'application/pdf');

      const result = await processFilesForUpload([smallImage, hugeDoc, goodDoc]);

      expect(result.processedFiles).toHaveLength(2); // smallImage + goodDoc
      expect(result.errors).toHaveLength(1); // hugeDoc rejected
    });
  });
});
