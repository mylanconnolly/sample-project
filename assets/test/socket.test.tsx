import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock the Phoenix client so we can drive channel events and reconnects.
const mocks = vi.hoisted(() => {
  const state = {
    channelHandlers: {} as Record<string, (p: unknown) => void>,
    openCb: undefined as undefined | (() => void),
  }
  const channel = {
    on: vi.fn((event: string, cb: (p: unknown) => void) => {
      state.channelHandlers[event] = cb
      return 1
    }),
    off: vi.fn(),
    join: vi.fn(() => ({ receive: vi.fn() })),
    leave: vi.fn(),
  }
  class Socket {
    channel = vi.fn(() => channel)
    onOpen = vi.fn((cb: () => void) => {
      state.openCb = cb
    })
    connect = vi.fn()
    disconnect = vi.fn()
  }
  return { state, channel, Socket }
})

vi.mock("phoenix", () => ({ Socket: mocks.Socket }))

import { SocketProvider } from "../js/lib/socket"

const CURRENT_USER_KEY = ["User", "get_current_user"]

describe("SocketProvider (typed-channel payload push + reconnect resync)", () => {
  beforeEach(() => {
    mocks.state.channelHandlers = {}
    mocks.state.openCb = undefined
  })

  function setup() {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, "invalidateQueries")
    render(
      <QueryClientProvider client={client}>
        <SocketProvider userId="user-1">
          <div />
        </SocketProvider>
      </QueryClientProvider>,
    )
    invalidate.mockClear()
    return { client, invalidate }
  }

  it("writes the typed payload into the cache on a push, and resyncs on reconnect", () => {
    const { client, invalidate } = setup()

    // A user_updated push writes the typed payload straight into the cache —
    // no refetch.
    const payload = { id: "user-1", email: "updated@example.com" }
    act(() => mocks.state.channelHandlers["user_updated"]?.(payload))
    expect(client.getQueryData(CURRENT_USER_KEY)).toEqual(payload)
    expect(invalidate).not.toHaveBeenCalled()

    // Reconnecting still resyncs (refetch) to catch up on missed pushes.
    act(() => mocks.state.openCb?.())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CURRENT_USER_KEY })
  })
})
