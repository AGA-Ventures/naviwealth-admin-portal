import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function getDatasetRequestUser(request: Request) {
  const hostname = new URL(request.url).hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return {
      displayName: "Local Admin",
      email: "local@naviwealth.test",
      fullName: "Local Admin",
    };
  }

  return getChatGPTUser();
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Sign in is required to manage this workspace." },
    { status: 401 },
  );
}
