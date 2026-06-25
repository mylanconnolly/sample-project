defmodule SampleProjectWeb.Router do
  use SampleProjectWeb, :router

  import Oban.Web.Router
  use AshAuthentication.Phoenix.Router

  import AshAuthentication.Plug.Helpers

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {SampleProjectWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :load_from_session
    # Set the Ash actor from the session so ash_typescript RPC calls (which read
    # the actor via Ash.PlugHelpers) run as the signed-in user.
    plug :set_actor, :user
    # Stash request metadata (IP, user-agent, request id) in the Ash context so the
    # access-logging hooks can record where each access came from.
    plug :put_audit_context
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :load_from_bearer
    plug :set_actor, :user

    plug AshAuthentication.Strategy.ApiKey.Plug,
      resource: SampleProject.Accounts.User,
      # if you want to require an api key to be supplied, set `required?` to true
      required?: false

    plug :put_audit_context
  end

  # MCP server (lib/sample_project/memories.ex `tools` block). Authenticated by API key
  # only: the plug reads the key from `Authorization: Bearer sampleproject_…`, sets the
  # Ash actor to that key's user, and (required?: true) rejects anything without a
  # valid key with a 401 — so every tool runs as a real user and the resources'
  # policies do all authorization. `put_audit_context` records reads in the access
  # log, just like the browser/RPC paths.
  pipeline :mcp do
    plug :accepts, ["json"]

    plug AshAuthentication.Strategy.ApiKey.Plug,
      resource: SampleProject.Accounts.User,
      required?: true

    plug :put_audit_context
  end

  scope "/", SampleProjectWeb do
    pipe_through :browser

    ash_authentication_live_session :authenticated_routes do
      # in each liveview, add one of the following at the top of the module:
      #
      # If an authenticated user must be present:
      # on_mount {SampleProjectWeb.LiveUserAuth, :live_user_required}
      #
      # If an authenticated user *may* be present:
      # on_mount {SampleProjectWeb.LiveUserAuth, :live_user_optional}
      #
      # If an authenticated user must *not* be present:
      # on_mount {SampleProjectWeb.LiveUserAuth, :live_no_user}
    end

    post "/rpc/run", AshTypescriptRpcController, :run
    post "/rpc/validate", AshTypescriptRpcController, :validate

    # CSV export of the access log (app-admin only; gated in the controller). A file
    # download can't go through RPC, so it lives here under the session actor.
    get "/app/admin/access-log/export", AccessLogController, :export
  end

  scope "/", SampleProjectWeb do
    pipe_through :browser

    # Auth UI lives in the React SPA (the /sign-in route is served by the SPA
    # catch-all). These remain server-side: the auth strategy endpoints, the
    # magic-link callback (sets the session, then redirects into the SPA),
    # confirmation, and sign-out.
    auth_routes AuthController, SampleProject.Accounts.User, path: "/auth"

    sign_out_route AuthController, "/sign-out",
      overrides: [SampleProjectWeb.AuthOverrides, AshAuthentication.Phoenix.Overrides.Default]

    # Remove this if you do not use the confirmation strategy
    confirm_route SampleProject.Accounts.User, :confirm_new_user,
      auth_routes_prefix: "/auth",
      overrides: [SampleProjectWeb.AuthOverrides, AshAuthentication.Phoenix.Overrides.Default]

    # Remove this if you do not use the magic link strategy.
    magic_sign_in_route(SampleProject.Accounts.User, :magic_link,
      auth_routes_prefix: "/auth",
      overrides: [SampleProjectWeb.AuthOverrides, AshAuthentication.Phoenix.Overrides.Default]
    )
  end

  # Other scopes may use custom stacks.
  # scope "/api", SampleProjectWeb do
  #   pipe_through :api
  # end

  scope "/mcp" do
    pipe_through :mcp

    forward "/", AshAi.Mcp.Router,
      tools: [
        :create_memory,
        :search_memories,
        :list_memories,
        :get_memory,
        :update_memory,
        :delete_memory
      ],
      protocol_version_statement: "2024-11-05",
      otp_app: :sample_project
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:sample_project, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: SampleProjectWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview

      # Passwordless sign-in for E2E tests (creates the user server-side and sets
      # the session). Dev-only — never compiled into test/prod.
      get "/login", SampleProjectWeb.DevLoginController, :create
    end

    scope "/" do
      pipe_through :browser

      oban_dashboard("/oban")
    end
  end

  # SPA catch-all — MUST be the last route so it doesn't shadow the API, auth,
  # or admin (LiveDashboard / Oban Web) routes above. Serves the React shell for
  # any other GET path so deep links survive a hard refresh.
  scope "/", SampleProjectWeb do
    pipe_through :browser

    get "/*path", PageController, :spa
  end

  # Capture request metadata for the access log (SampleProject.Audit). Stored under Ash's
  # `:shared` context key so it propagates to *nested* relationship loads too (Ash
  # only forwards `:shared` to related queries — without this, reads loaded via a
  # relationship would lose the IP/page info). ash_typescript forwards this into
  # every RPC action's context.
  defp put_audit_context(conn, _opts) do
    audit = %{
      ip_address: format_ip(conn.remote_ip),
      user_agent: conn |> get_req_header("user-agent") |> List.first(),
      request_id: conn |> get_resp_header("x-request-id") |> List.first(),
      # The SPA page the request came from (answers "why was this record viewed?").
      request_path: referer_path(conn),
      # Per-page-load correlation id the SPA sends, grouping every read from one
      # navigation (see assets/js/lib/pageView.ts).
      page_view_id: conn |> get_req_header("x-page-view-id") |> List.first()
    }

    Ash.PlugHelpers.update_context(conn, fn context ->
      context = context || %{}
      shared = context |> Map.get(:shared, %{}) |> Map.put(:audit, audit)
      Map.put(context, :shared, shared)
    end)
  end

  defp referer_path(conn) do
    case conn |> get_req_header("referer") |> List.first() do
      nil -> nil
      referer -> URI.parse(referer).path
    end
  end

  defp format_ip(nil), do: nil
  defp format_ip(ip) when is_tuple(ip), do: ip |> :inet.ntoa() |> to_string()
  defp format_ip(ip) when is_binary(ip), do: ip
end
