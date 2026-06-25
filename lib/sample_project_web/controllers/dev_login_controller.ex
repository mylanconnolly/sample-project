defmodule SampleProjectWeb.DevLoginController do
  @moduledoc """
  Passwordless sign-in for end-to-end tests. Mounted ONLY under the `dev_routes`
  flag (the same guard as the Swoosh mailbox preview), so it never exists in test
  or production builds.

  It find-or-creates the user **inside the running server's request process** —
  guaranteeing the row lives in the exact database the server reads — and then
  establishes a session, with no email round trip, mailbox scraping, or LiveView
  interaction page. This removes every fragile link from the E2E auth path; the
  real magic-link flow stays covered by `assets/e2e/login.spec.ts`.

  Usage: `GET /dev/login` (defaults to the seeded e2e admin) or
  `GET /dev/login?email=someone@example.com&role=user`.
  """
  use SampleProjectWeb, :controller

  require Ash.Query

  alias AshAuthentication.Strategy.MagicLink
  alias SampleProject.Accounts.User

  @default_email "e2e@example.com"

  def create(conn, params) do
    email = Map.get(params, "email", @default_email)
    role = if params["role"] == "user", do: :user, else: :admin

    user = find_or_create_user(email, role)

    # Mint a magic-link token in-process (no email), then run the real sign-in
    # action so the user carries a persisted session token for the session store.
    strategy = AshAuthentication.Info.strategy!(User, :magic_link)

    with {:ok, token} <- MagicLink.request_token_for(strategy, user),
         {:ok, %User{} = signed_in} <-
           User
           |> Ash.Query.for_read(:sign_in_with_magic_link, %{token: token})
           |> Ash.read_one() do
      conn
      |> AshAuthentication.Plug.Helpers.store_in_session(signed_in)
      |> redirect(to: ~p"/app")
    else
      # Fail loudly rather than redirecting with no session (which would bounce
      # to /sign-in and surface only as an opaque navigation timeout). The common
      # cause of `:error` here is token storage — see SampleProject.Accounts.Token.
      other ->
        conn
        |> put_status(500)
        |> text("dev login could not sign in #{email}: #{inspect(other)}")
    end
  end

  defp find_or_create_user(email, role) do
    case User |> Ash.Query.filter(email == ^email) |> Ash.read_one!(authorize?: false) do
      nil -> Ash.Seed.seed!(User, %{email: email, role: role, name: "E2E Admin"})
      user -> user
    end
  end
end
