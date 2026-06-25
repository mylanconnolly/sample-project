defmodule SampleProjectWeb.AccountChannel do
  @moduledoc """
  Realtime channel for account-scoped events.

  Publishes the `user_updated` event (declared as a `pub_sub` publication on
  `SampleProject.Accounts.User`) to the client. The React client uses these pushes only
  as a signal to invalidate and refetch the relevant query — see the
  invalidate-and-refetch realtime contract.
  """
  use AshTypescript.TypedChannel
  use Phoenix.Channel

  typed_channel do
    topic "user:*"

    resource SampleProject.Accounts.User do
      publish :user_updated
    end
  end

  @impl true
  def join("user:" <> user_id, _payload, socket) do
    case socket.assigns[:current_user] do
      %{id: id} ->
        if to_string(id) == user_id,
          do: {:ok, socket},
          else: {:error, %{reason: "unauthorized"}}

      _ ->
        {:error, %{reason: "unauthorized"}}
    end
  end
end
