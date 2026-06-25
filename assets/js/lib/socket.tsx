import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { Socket, type Channel } from "phoenix"
import { useQueryClient } from "@tanstack/react-query"
import {
  createAccountChannel,
  onAccountChannelMessages,
  unsubscribeAccountChannel,
} from "../ash_typed_channels"
import type { UserUpdatedPayload } from "../ash_typed_channels"
import { queryKeys } from "./ashRpc"

const SocketContext = createContext<Socket | null>(null)

/** The live Phoenix socket, or null before it connects. */
export const useSocket = () => useContext(SocketContext)

/**
 * Connects the Phoenix socket (authenticated from the session cookie) and joins
 * the per-user account channel. Realtime contract: typed channel payloads are
 * written straight into the Query cache for low-latency live updates, while
 * every (re)connect still invalidates-and-refetches to resync events missed
 * while disconnected.
 */
export function SocketProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Token embedded by the SPA shell (derived from the session user).
    const token =
      document
        .querySelector('meta[name="user-token"]')
        ?.getAttribute("content") ?? undefined
    const socket = new Socket("/socket", { params: { token } })
    const channel = createAccountChannel(socket, userId)
    const phxChannel = channel as unknown as Channel

    // Push the typed payload straight into the Query cache (merged over the
    // cached record). The publication's `user_summary` calc must carry every
    // field the cached view renders, or merged-in stale fields can linger.
    const applyUserUpdate = (payload: UserUpdatedPayload) =>
      queryClient.setQueryData<UserUpdatedPayload>(
        queryKeys.currentUser(),
        (old) => (old ? { ...old, ...payload } : payload),
      )

    const refs = onAccountChannelMessages(channel, {
      user_updated: applyUserUpdate,
    })

    // Typed pushes are missed while disconnected, so still resync (refetch) on
    // every (re)connect to catch up.
    const resync = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() })
    }

    socket.onOpen(resync)
    socket.connect()
    phxChannel.join()
    setSocket(socket)

    return () => {
      unsubscribeAccountChannel(channel, refs)
      phxChannel.leave()
      socket.disconnect()
    }
  }, [userId, queryClient])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}
