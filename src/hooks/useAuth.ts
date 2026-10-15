import { useEffect, useState } from "react";
import { getSessionToken } from "../lib/api";

export function useAuth() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const token = await getSessionToken();
      setHasToken(!!token);
    }
    check();
  }, []);

  return { hasToken };
}
// this is a hook
