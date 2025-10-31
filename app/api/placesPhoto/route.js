// app/api/placesPhoto/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // name may already be URL-encoded from the client
    const rawName = searchParams.get('name') || '';
    const w = parseInt(searchParams.get('w') || '256', 10);
    const h = parseInt(searchParams.get('h') || '256', 10);

    if (!rawName) {
      return NextResponse.json({ error: 'Missing photo name' }, { status: 400 });
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });
    }

    // Decode once (in case client encoded it), then re-encode safely per path segment.
    // We must preserve the slashes between segments.
    const decoded = decodeURIComponent(rawName);
    const safePath = decoded
      .split('/')                     // ['places', '<placeId>', 'photos', '<photoId>']
      .map(seg => encodeURIComponent(seg))
      .join('/');                     // 'places/<encPlaceId>/photos/<encPhotoId>'

    const maxW = Math.min(1024, Math.max(32, w));
    const maxH = Math.min(1024, Math.max(32, h));

    const url =
      `https://places.googleapis.com/v1/${safePath}/media` +
      `?maxWidthPx=${maxW}&maxHeightPx=${maxH}`;

    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'Accept': 'image/*',
      },
      cache: 'no-store',
      redirect: 'follow', // follow 302s to googleusercontent.com
    });

    if (!res.ok) {
      // Surface upstream error to help debugging
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Places media error ${res.status}`, details: text?.slice(0, 500) },
        { status: 502 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    });
  } catch (e) {
    console.error('placesPhoto error:', e);
    return NextResponse.json({ error: 'Failed to load photo' }, { status: 500 });
  }
}
