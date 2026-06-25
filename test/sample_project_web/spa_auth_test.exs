defmodule SampleProjectWeb.SpaAuthTest do
  @moduledoc """
  Smoke test for the `ConnCase` login helpers: a session built by
  `register_and_log_in_user/2` must be recognized by `:load_from_session`, which
  is what makes the SPA shell embed a `user-token` for the realtime socket.
  """
  use SampleProjectWeb.ConnCase, async: true

  test "an authenticated session loads the current user into the SPA shell", %{conn: conn} do
    %{conn: conn} = register_and_log_in_user(%{conn: conn})

    html = conn |> get(~p"/app") |> html_response(200)
    assert html =~ "user-token"
  end

  test "an anonymous session gets no user-token", %{conn: conn} do
    html = conn |> get(~p"/app") |> html_response(200)
    refute html =~ "user-token"
  end
end
