import { publicState, readState } from "@/server/store.js";
export const runtime = "nodejs";
export async function GET() { return Response.json(publicState(await readState()), { headers: { "Cache-Control": "no-store" } }); }
