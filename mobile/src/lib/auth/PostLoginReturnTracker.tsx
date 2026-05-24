import { useSegments } from "expo-router";
import { useEffect } from "react";
import { updatePostLoginReturnFromSegments } from "@/lib/auth/postLoginReturn";

/** Keeps the latest `/(app)/…` href for login return + 401 handling. */
export function PostLoginReturnTracker() {
  const segments = useSegments();
  useEffect(() => {
    updatePostLoginReturnFromSegments(segments);
  }, [segments]);
  return null;
}
