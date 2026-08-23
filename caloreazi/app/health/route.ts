export function GET() {
  return Response.json({ status: "ok", service: "caloreazi", version: "1.13.5", build: process.env.CALOREAZI_BUILD_COMMIT || "development" });
}
