import { NextRequest } from "next/server";

// Proxy for OpenStreetMap Nominatim to avoid CORS issues
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 3) {
    return Response.json([]);
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=0`,
      {
        headers: {
          "User-Agent": "AnSarCalendar/1.0 (calendar@ansartechnologies.my)",
          "Accept-Language": "en",
        },
      }
    );

    if (!res.ok) return Response.json([]);

    const data = await res.json();
    return Response.json(
      data.map((r: { display_name: string; place_id: number }) => ({
        display_name: r.display_name,
        place_id: String(r.place_id),
      }))
    );
  } catch {
    return Response.json([]);
  }
}
