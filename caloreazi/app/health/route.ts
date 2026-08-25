export function GET() {
  return Response.json({ status: "ok", service: "caloreazi", version: "1.18.24", build: process.env.CALOREAZI_BUILD_COMMIT || "development" });
}
