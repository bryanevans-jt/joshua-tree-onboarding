import { NextResponse } from 'next/server';
import {
  listUploadedTemplates,
  jobKeysFromPositions,
  getTemplateFilename,
  hasTemplate,
  SHARED_KEYS,
} from '@/lib/template-storage';
import { legacyJobTemplateKey } from '@/lib/config';
import { listAllPositions } from '@/lib/onboarding-positions';

export async function GET() {
  try {
    const positions = await listAllPositions();
    const jobKeys = jobKeysFromPositions(positions);
    const uploadedSet = new Set(await listUploadedTemplates(jobKeys));
    const filenames: Record<string, string> = {};

    for (const p of positions) {
      const stateKey = jobKeysFromPositions([p])[0];
      const legacyKey = legacyJobTemplateKey(p.slug);
      for (const key of [stateKey, legacyKey]) {
        if (uploadedSet.has(key)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (await hasTemplate(key)) uploadedSet.add(key);
      }
    }

    for (const key of [...SHARED_KEYS, ...Array.from(uploadedSet)]) {
      // eslint-disable-next-line no-await-in-loop
      const name = await getTemplateFilename(key);
      if (name) filenames[key] = name;
    }
    return NextResponse.json({
      uploaded: Array.from(uploadedSet),
      filenames,
      positions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
