defmodule SampleProjectWeb.PageController do
  use SampleProjectWeb, :controller

  @doc """
  Serves the React SPA shell for any non-API, non-auth, non-admin path so that
  deep links survive a hard refresh. Client-side routing takes over from there.
  """
  def spa(conn, _params) do
    # Signed token for the realtime socket, derived from the session user.
    user_token =
      case conn.assigns[:current_user] do
        %{id: id} -> Phoenix.Token.sign(conn, "user socket", id)
        _ -> nil
      end

    conn
    |> put_root_layout(html: {SampleProjectWeb.Layouts, :spa_root})
    |> assign(:user_token, user_token)
    |> render(:spa)
  end
end
