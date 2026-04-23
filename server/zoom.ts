/**
 * Zoom Server-to-Server OAuth helper.
 * Required env vars:
 *   ZOOM_ACCOUNT_ID    – from Zoom Marketplace app (Server-to-Server OAuth)
 *   ZOOM_CLIENT_ID     – from Zoom Marketplace app
 *   ZOOM_CLIENT_SECRET – from Zoom Marketplace app
 */

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
// #23: Mutex to prevent concurrent token refresh race conditions
let tokenRefreshPromise: Promise<string> | null = null;

const ZOOM_FETCH_TIMEOUT_MS = 10_000; // #24: 10-second timeout on all Zoom API calls

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = ZOOM_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function _refreshZoomToken(): Promise<string> {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Zoom credentials not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET.");
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");
  const res = await fetchWithTimeout(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    // #27: Distinguish auth errors from rate limiting
    if (res.status === 401) throw new Error(`Zoom auth error (401): invalid credentials — ${err}`);
    if (res.status === 429) throw new Error(`Zoom rate limit exceeded (429): too many token requests — ${err}`);
    throw new Error(`Zoom token error (${res.status}): ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken!;
}

export async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }
  // #23: Serialize concurrent refreshes — second caller waits for first to finish
  if (!tokenRefreshPromise) {
    tokenRefreshPromise = _refreshZoomToken().finally(() => { tokenRefreshPromise = null; });
  }
  return tokenRefreshPromise;
}

export interface ZoomMeeting {
  id: string;
  join_url: string;
  start_url: string;
  password: string;
  topic: string;
}

export async function createZoomMeeting(
  topic: string,
  durationMinutes: number,
  startTime?: string
): Promise<ZoomMeeting> {
  const token = await getZoomAccessToken();

  const body = {
    topic,
    type: startTime ? 2 : 1, // 1 = instant, 2 = scheduled
    ...(startTime && { start_time: startTime }),
    duration: durationMinutes,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: true,
      auto_recording: "none",
    },
  };

  const res = await fetchWithTimeout("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    // #27: Distinguish 429 rate limit from 401 auth errors
    if (res.status === 429) throw new Error(`Zoom rate limit exceeded (429): too many meeting creation requests — ${err}`);
    if (res.status === 401) throw new Error(`Zoom auth error (401): token may be expired — ${err}`);
    throw new Error(`Zoom meeting creation failed (${res.status}): ${err}`);
  }

  const data = await res.json() as ZoomMeeting;
  return data;
}

// #165: List cloud recordings for a Zoom meeting ID
export async function listZoomRecordings(meetingId: string): Promise<any[]> {
  const token = await getZoomAccessToken();
  const res = await fetchWithTimeout(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom recordings fetch failed (${res.status}): ${err}`);
  }
  const data = await res.json() as any;
  return (data.recording_files || []).filter((f: any) => f.status === "completed");
}

export async function testZoomCredentials(): Promise<{ ok: boolean; error?: string }> {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    return { ok: false, error: "Zoom credentials not set — add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET to .env" };
  }
  try {
    await getZoomAccessToken();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  const token = await getZoomAccessToken();
  const res = await fetchWithTimeout(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete Zoom meeting: ${err}`);
  }
}
