import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegStatic from 'ffmpeg-static';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Set ffmpeg path from ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

export interface VideoProcessResult {
  buffer: Buffer;
  size: number;
  mimeType: string;
  ext: string;
  width: number;
  height: number;
  duration: number;
}

export interface ThumbnailResult {
  buffer: Buffer;
  size: number;
  mimeType: string;
  ext: string;
}

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  codec: string;
}

/**
 * Probe a video file to get its metadata.
 */
function probeVideo(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

/**
 * Get video info (dimensions, duration, codec) from a buffer.
 */
export async function getVideoInfo(inputBuffer: Buffer): Promise<VideoInfo> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `${uuidv4()}.probe`);

  try {
    fs.writeFileSync(inputPath, inputBuffer);
    const probeData = await probeVideo(inputPath);
    const videoStream = probeData.streams.find((s) => s.codec_type === 'video');

    return {
      width: videoStream?.width ?? 0,
      height: videoStream?.height ?? 0,
      duration: probeData.format.duration ?? 0,
      codec: videoStream?.codec_name ?? 'unknown',
    };
  } finally {
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
  }
}

/**
 * Transcode a video to H.264 MP4, max 1080p resolution.
 * - If height > 1080: scale down maintaining aspect ratio
 * - If height <= 1080: re-encode to H.264 MP4 for compatibility
 * - Output: H.264 video, AAC audio, MP4 container
 */
export async function transcodeVideo(
  inputBuffer: Buffer,
  originalName: string,
): Promise<VideoProcessResult> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `${uuidv4()}_${originalName}`);
  const outputPath = path.join(tmpDir, `${uuidv4()}.mp4`);

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    // Probe to get dimensions
    const probeData = await probeVideo(inputPath);
    const videoStream = probeData.streams.find((s) => s.codec_type === 'video');
    const inputHeight = videoStream?.height ?? 0;
    const inputWidth = videoStream?.width ?? 0;
    const duration = probeData.format.duration ?? 0;

    // Build scale filter: if height > 1080, scale down; otherwise keep original size
    // scale=-2:1080 means: height=1080, width=auto (divisible by 2)
    const scaleFilter = inputHeight > 1080
      ? 'scale=-2:1080'
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2'; // ensure even dimensions for h264

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          `-vf ${scaleFilter}`,
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-y', // overwrite output
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    const outputBuffer = fs.readFileSync(outputPath);

    // Get output dimensions
    const outputProbe = await probeVideo(outputPath);
    const outputVideoStream = outputProbe.streams.find((s) => s.codec_type === 'video');

    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      mimeType: 'video/mp4',
      ext: 'mp4',
      width: outputVideoStream?.width ?? inputWidth,
      height: outputVideoStream?.height ?? inputHeight,
      duration,
    };
  } finally {
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
  }
}

/**
 * Generate a thumbnail (poster frame) from a video at ~1 second.
 * Falls back to 0 seconds if the video is shorter than 1 second.
 * Output: JPEG image.
 */
export async function generateVideoThumbnail(
  inputBuffer: Buffer,
): Promise<ThumbnailResult> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `${uuidv4()}.thumb_input`);
  const outputName = `${uuidv4()}.jpg`;
  const outputPath = path.join(tmpDir, outputName);

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    // Probe to check duration
    const probeData = await probeVideo(inputPath);
    const duration = probeData.format.duration ?? 0;
    const seekTime = duration >= 1 ? '00:00:01' : '00:00:00';

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [seekTime],
          filename: outputName,
          folder: tmpDir,
          size: '480x?', // 480px wide, auto height
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const thumbBuffer = fs.readFileSync(outputPath);

    return {
      buffer: thumbBuffer,
      size: thumbBuffer.length,
      mimeType: 'image/jpeg',
      ext: 'jpg',
    };
  } finally {
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
  }
}
