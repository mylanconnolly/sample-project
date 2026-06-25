import type { AccountChannel, AccountChannelEvents, AccountChannelHandlers, AccountChannelRefs } from "./ash_types";
export type * from "./ash_types";

export function createAccountChannel(
  socket: { channel(topic: string, params?: object): unknown },
  suffix: string
): AccountChannel {
  return socket.channel(`user:${suffix}`) as AccountChannel;
}

export function onAccountChannelMessage<E extends keyof AccountChannelEvents>(
  channel: AccountChannel,
  event: E,
  handler: (payload: AccountChannelEvents[E]) => void
): number {
  return channel.on(event, (payload: unknown) => handler(payload as AccountChannelEvents[E]));
}

export function onAccountChannelMessages(
  channel: AccountChannel,
  handlers: AccountChannelHandlers
): AccountChannelRefs {
  const refs: AccountChannelRefs = {};
  for (const event in handlers) {
    const e = event as keyof AccountChannelEvents;
    const handler = handlers[e];
    if (handler) {
      refs[e] = channel.on(event, (payload) => (handler as (p: unknown) => void)(payload));
    }
  }
  return refs;
}

export function unsubscribeAccountChannel(
  channel: AccountChannel,
  refs: AccountChannelRefs
): void {
  for (const event in refs) {
    const e = event as keyof AccountChannelRefs;
    const ref = refs[e];
    if (ref !== undefined) {
      channel.off(event, ref);
    }
  }
}