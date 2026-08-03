// Vercel exposes runtime secrets through Node's environment. This module keeps
// the database layer's Cloudflare binding contract intact for Nitro builds.
export const env = process.env;
