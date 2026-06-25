defmodule SampleProjectWeb.ConnCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ConnTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  we enable the SQL sandbox, so changes done to the database
  are reverted at the end of every test. If you are using
  PostgreSQL, you can even run database tests asynchronously
  by setting `use SampleProjectWeb.ConnCase, async: true`, although
  this option is not recommended for other databases.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # The default endpoint for testing
      @endpoint SampleProjectWeb.Endpoint

      use SampleProjectWeb, :verified_routes

      # Import conveniences for testing with connections
      import Plug.Conn
      import Phoenix.ConnTest
      import SampleProjectWeb.ConnCase
    end
  end

  setup tags do
    SampleProject.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end

  @doc """
  Seed a user and return a connection authenticated as them, plus the `user`.

  Pass `role: :admin` for an admin. Usage:

      setup :register_and_log_in_user            # a regular user
      # or, for an admin:
      setup %{conn: conn} do
        register_and_log_in_user(%{conn: conn}, role: :admin)
      end
  """
  def register_and_log_in_user(%{conn: conn}, opts \\ []) do
    role = Keyword.get(opts, :role, :user)
    email = "conn-#{System.unique_integer([:positive])}@test.io"
    user = Ash.Seed.seed!(SampleProject.Accounts.User, %{email: email, role: role})
    %{conn: log_in_user(conn, user), user: user}
  end

  @doc """
  Put `user` into the connection's session the way the magic-link callback does.

  Token presence is required for authentication, so we sign the user in through
  the real magic-link action to obtain a session token before storing it.
  """
  def log_in_user(conn, user) do
    conn
    |> Phoenix.ConnTest.init_test_session(%{})
    |> AshAuthentication.Plug.Helpers.store_in_session(sign_in_user(user))
  end

  # Drive the magic-link sign-in action to get a user struct carrying a session
  # token in its metadata (mirrors test/sample_project/accounts/user_test.exs).
  defp sign_in_user(user) do
    :ok = SampleProject.Accounts.request_magic_link!(to_string(user.email))

    receive do
      {:email, %Swoosh.Email{html_body: html}} ->
        [_, token] = Regex.run(~r{/magic_link/([^"\s<]+)}, html)

        SampleProject.Accounts.User
        |> Ash.Query.for_read(:sign_in_with_magic_link, %{token: URI.decode(token)})
        |> Ash.read_one!()
    after
      0 -> raise "expected a magic-link email but none was sent"
    end
  end
end
