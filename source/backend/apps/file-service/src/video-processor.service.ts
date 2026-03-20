import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegStatic from 'ffmpeg-static';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { randomUUID } from 'crypto';

// Set ffmpeg path from ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);

  /**
   * Probe a video file to get metadata.
   */
  private probeVideo(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  /**
   * Transcode video to H.264 MP4, max 1080p height.
   * - If height > 1080: scale down maintaining aspect ratio
   * - Otherwise: re-encode for H.264 compatibility
   */
  async compress(inputBuffer: Buffer): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${randomUUID()}.input`);
    const outputPath = path.join(tmpDir, `${randomUUID()}.mp4`);

    try {
      fs.writeFileSync(inputPath, inputBuffer);

      // Probe to get dimensions
      const probeData = await this.probeVideo(inputPath);
      const videoStream = probeData.streams.find((s) => s.codec_type === 'video');
      const inputHeight = videoStream?.height ?? 0;

      // Scale filter: max 1080p, ensure even dimensions
      const scaleFilter = inputHeight > 1080
        ? 'scale=-2:1080'
        : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

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
            '-y',
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const outputBuffer = fs.readFileSync(outputPath);
      this.logger.log(
        `Video compressed: ${inputBuffer.length} -> ${outputBuffer.length} bytes`,
      );
      return outputBuffer;
    } finally {
      try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
    }
  }

  /**
   * Extract a thumbnail frame at ~1 second (or 0 for short videos).
   * Output: JPEG buffer.
   */
  async generateThumbnail(inputBuffer: Buffer): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${randomUUID()}.input`);
    const outputName = `${randomUUID()}.jpg`;
    const outputPath = path.join(tmpDir, outputName);

    try {
      fs.writeFileSync(inputPath, inputBuffer);

      // Probe to check duration
      const probeData = await this.probeVideo(inputPath);
      const duration = probeData.format.duration ?? 0;
      const seekTime = duration >= 1 ? '00:00:01' : '00:00:00';

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [seekTime],
            filename: outputName,
            folder: tmpDir,
            size: '480x?',
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      return fs.readFileSync(outputPath);
    } finally {
      try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
    }
  }
}
