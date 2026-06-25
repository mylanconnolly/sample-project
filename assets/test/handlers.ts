import { http, HttpResponse } from "msw"

/**
 * All ash_typescript RPC traffic goes through the single `/rpc/run` endpoint,
 * so one handler — switching on the action name — covers every call.
 */
export const handlers = [
  http.post("/rpc/run", async ({ request }) => {
    const body = (await request.json()) as { action: string }

    switch (body.action) {
      case "request_magic_link":
        return HttpResponse.json({ success: true, data: {} })

      case "get_current_user":
        return HttpResponse.json({
          success: true,
          data: { id: "user-1", email: "test@example.com" },
        })

      default:
        return HttpResponse.json({
          success: false,
          errors: [
            {
              type: "unknown",
              message: `Unhandled action: ${body.action}`,
              shortMessage: "Unhandled action",
              fields: [],
              path: [],
            },
          ],
        })
    }
  }),
]
