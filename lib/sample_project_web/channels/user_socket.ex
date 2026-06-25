defmodule SampleProjectWeb.UserSocket do
  @moduledoc """
  Socket for the React SPA's realtime channels.

  Authenticated with a short-lived signed token that the SPA shell embeds in a
  `<meta name="user-token">` tag (generated server-side from the session user —
  see `SampleProjectWeb.PageController.spa/2`). This is the canonical Phoenix pattern:
  session cookies are not reliably delivered on the WebSocket handshake, so we
  pass a token derived from the session instead. The resolved user is assigned
  as `:current_user` so channels can authorize joins.
  """
  use Phoenix.Socket

  channel "user:*", SampleProjectWeb.AccountChannel

  # Token lifetime; the SPA re-renders (and re-embeds a fresh token) on each load.
  @token_max_age 86_400

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) when is_binary(token) do
    {:ok, assign(socket, :current_user, user_from_token(token))}
  end

  def connect(_params, socket, _connect_info) do
    {:ok, assign(socket, :current_user, nil)}
  end

  @impl true
  def id(%{assigns: %{current_user: %{id: id}}}), do: "user_socket:#{id}"
  def id(_socket), do: nil

  defp user_from_token(token) do
    with {:ok, user_id} <-
           Phoenix.Token.verify(SampleProjectWeb.Endpoint, "user socket", token,
             max_age: @token_max_age
           ),
         {:ok, user} <- Ash.get(SampleProject.Accounts.User, user_id, authorize?: false) do
      user
    else
      _ -> nil
    end
  end
end
