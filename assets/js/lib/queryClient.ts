import { QueryClient } from "@tanstack/react-query"
import { isForbidden } from "./ashErrors"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't retry policy failures — they won't succeed by retrying.
      retry: (failureCount, error) =>
        isForbidden(error) ? false : failureCount < 2,
    },
  },
})
