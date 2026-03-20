/**
 * Client-side media compression utilities.
 *
 * Images: Resize to max 1920px and compress quality using Canvas API
 * Videos: Validate max resolution 1080p (1920x1080), reject if too large
 */

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 0.8;
const VIDEO_MAX_HEIGHT = 1080;
const VIDEO_MAX_SIZE_MB = 100;

/**
 * Compress an image file using Canvas API.
 * Returns a new File with reduced size.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip if not an image or is GIF (animated)
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  // Skip small images (< 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > IMAGE_MAX_WIDTH || height > IMAGE_MAX_HEIGHT) {
        const ratio = Math.min(
          IMAGE_MAX_WIDTH / width,
          IMAGE_MAX_HEIGHT / height,
        );
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compressed is larger, keep original
            resolve(file);
            return;
          }
          const ext = outputType === "image/png" ? ".png" : ".jpg";
          const name = file.name.replace(/\.[^.]+$/, ext);
          resolve(new File([blob], name, { type: outputType }));
        },
        outputType,
        IMAGE_QUALITY,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate video file.
 * - Max size: 100MB
 * - Max resolution: 1080p (1920x1080)
 * Returns error message if invalid, null if OK.
 */
export async function validateVideo(
  file: File,
): Promise<{ valid: boolean; error?: string }> {
  // Check size
  if (file.size > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `動画ファイルは${VIDEO_MAX_SIZE_MB}MB以下にしてください`,
    };
  }

  // Check resolution using video element
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.videoHeight > VIDEO_MAX_HEIGHT) {
        resolve({
          valid: false,
          error: `動画の解像度は最大1080p（${VIDEO_MAX_HEIGHT}p）までです。現在: ${video.videoHeight}p`,
        });
      } else {
        resolve({ valid: true });
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ valid: true }); // Can't validate, allow upload
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Process files before upload:
 * - Compress images
 * - Validate videos
 * Returns processed files and any errors.
 */
export async function processFilesForUpload(files: File[]): Promise<{
  processedFiles: File[];
  errors: string[];
}> {
  const processedFiles: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const compressed = await compressImage(file);
      processedFiles.push(compressed);
    } else if (file.type.startsWith("video/")) {
      const validation = await validateVideo(file);
      if (validation.valid) {
        processedFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    } else {
      // Document files: pass through, max 20MB
      if (file.size > 20 * 1024 * 1024) {
        errors.push(`${file.name}: ファイルは20MB以下にしてください`);
      } else {
        processedFiles.push(file);
      }
    }
  }

  return { processedFiles, errors };
}
