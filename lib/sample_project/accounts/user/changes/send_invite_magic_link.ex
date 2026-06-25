defmodule SampleProject.Accounts.User.Changes.SendInviteMagicLink do
  @moduledoc """
  After an invited user is created, send them a magic-link email so they can sign
  in. Runs in `after_transaction` so the email only goes out once the user has
  been committed, and a delivery failure doesn't roll back the invite.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_transaction(changeset, fn
      _changeset, {:ok, user} = result ->
        SampleProject.Accounts.request_magic_link!(user.email, authorize?: false)
        result

      _changeset, result ->
        result
    end)
  end
end
