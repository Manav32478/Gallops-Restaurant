import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Digital Asset Links — required by Trusted Web Activities.
 *
 * When you wrap the site into an Android APK with Bubblewrap, Google Play's TWA
 * checks this file to prove the app is allowed to open your URLs without a
 * browser address bar. Put your signing-certificate SHA-256 in
 * ANDROID_SHA256_CERT (comma separated if you have several, e.g. one from
 * Google Play App Signing and one from your local keystore).
 */
export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME ?? 'com.gallops.app';
  const fingerprints = (process.env.ANDROID_SHA256_CERT ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith('sha256/') ? value : `sha256/${value}`));

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
