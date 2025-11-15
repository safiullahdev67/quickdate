import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase/admin';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

function sanitizeFilename(name?: string) {
  return String(name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing file in form-data under key "file"' }, { status: 400 });
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
    if (!bucketName) {
      return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured' }, { status: 500 });
    }

    const bucket = adminStorage.bucket(bucketName);
    const buf = Buffer.from(await file.arrayBuffer());

    const id = randomUUID();
    const filePath = `users/${id}-${sanitizeFilename((file as any).name)}`;

    const gcsFile = bucket.file(filePath);
    await gcsFile.save(buf, { contentType: (file as any).type || 'application/octet-stream', resumable: false });
    await gcsFile.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return NextResponse.json({ ok: true, url: publicUrl, path: filePath });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
