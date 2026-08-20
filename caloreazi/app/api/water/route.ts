import { publicState, updateState } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const { amount = 250 } = await request.json();
  const state = await updateState((state) => { state.today.waterMl = Math.max(0, Number(state.today.waterMl || 0) + Number(amount || 0)); return state; });
  return Response.json(publicState(state));
}
