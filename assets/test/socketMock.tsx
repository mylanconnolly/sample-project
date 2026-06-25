import { vi } from "vitest"

/**
 * Replaces `@/lib/socket` with a pass-through provider and no-op channel hooks so
 * components that mount inside `SocketProvider` (or call `useTicketChannel` /
 * `useProjectChannel` / `useMyProjectChannels`) work in jsdom WITHOUT opening a
 * real Phoenix socket. Import this module (for its side effect) at the top of a
 * test file:
 *
 *   import "./socketMock"
 *   import { TicketDetail } from "@/routes/app/$ticketId"
 *
 * The realtime *contract* — which query keys each channel event invalidates and
 * what payloads it merges — lives in `lib/socket.tsx` and is covered directly by
 * `socket.test.tsx` (which mocks `phoenix` instead). Component tests should NOT
 * re-test it; assert cache merges by seeding/reading the QueryClient directly.
 */
vi.mock("@/lib/socket", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SocketProvider: ({ children }: { children: any }) => children,
  useSocket: () => null,
  useTicketChannel: () => {},
  useProjectChannel: () => {},
  useMyProjectChannels: () => {},
}))
