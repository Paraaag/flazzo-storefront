import { getUser } from "@netlify/identity";

/** Returns the signed-in Identity user if they hold the `admin` role, otherwise null. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) return { user: null, error: "Please sign in.", status: 401 } as const;
  const roles = user.roles ?? [];
  if (!roles.includes("admin")) return { user: null, error: "This account does not have admin access.", status: 403 } as const;
  return { user, error: null, status: 200 } as const;
}
