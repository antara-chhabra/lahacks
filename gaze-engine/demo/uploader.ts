const CLOUD_NAME = 'dsddkg2x6';
const UPLOAD_PRESET = 'Lahacks';

export async function uploadSessionVideo(blob: Blob, sessionId: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, `session-${sessionId}.webm`);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('resource_type', 'video');
  form.append('folder', 'sessions');
  form.append('public_id', `sessions/session-${sessionId}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: 'POST', body: form },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed (${res.status}): ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}
