import type { FrameData } from './types';

function extractPublicId(secureUrl: string): string {
  // Match everything after /video/upload/ (skipping any transformation segments)
  // e.g. https://res.cloudinary.com/cloud/video/upload/sessions/sess-123.webm → sessions/sess-123
  const match = secureUrl.match(/\/video\/upload\/(?:[^/]+\/)*?([^/]+\.[^/]+)$/);
  if (!match) throw new Error(`Cannot parse Cloudinary URL: ${secureUrl}`);
  // Strip file extension
  return match[1].replace(/\.[^.]+$/, '');
}

function buildFrameUrl(cloudName: string, publicId: string, offset: string): string {
  // so_0 = first frame, so_33p = 33%, so_66p = 66%, so_99p = near end
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_${offset},f_jpg/${publicId}.jpg`;
}

export async function fetchFrames(videoUrl: string): Promise<FrameData[]> {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'] ?? 'dsddkg2x6';

  let publicId: string;
  try {
    publicId = extractPublicId(videoUrl);
  } catch (err) {
    console.warn('claudinary-video: could not extract public_id from URL', err);
    return [];
  }

  const offsets = [
    { offset: '0',   time: '0%'  },
    { offset: '33p', time: '33%' },
    { offset: '66p', time: '66%' },
    { offset: '99p', time: '99%' },
  ];

  const frames: FrameData[] = [];
  for (const { offset, time } of offsets) {
    const url = buildFrameUrl(cloudName, publicId, offset);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      frames.push({
        time,
        base64: Buffer.from(buf).toString('base64'),
        mimeType: 'image/jpeg',
      });
    } catch {
      // skip frames that fail — short videos may not have all offsets
    }
  }
  return frames;
}
