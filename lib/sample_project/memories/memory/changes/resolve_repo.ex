defmodule SampleProject.Memories.Memory.Changes.ResolveRepo do
  @moduledoc """
  Normalizes a `:repository` memory's `repo_key`.

  `repo_key` is the authority for repository identity: an agent on any workstation
  passes the repo it's working in (a remote URL or "owner/name"), and we canonicalize
  it to a lowercase `owner/name` so the same repo always groups together. Reads and
  search key off this normalized value.

  For non-`:repository` scopes there is no repo identity, so `repo_key` is cleared.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    case Ash.Changeset.get_attribute(changeset, :scope) do
      :repository ->
        normalized = changeset |> Ash.Changeset.get_attribute(:repo_key) |> normalize()
        Ash.Changeset.change_attribute(changeset, :repo_key, normalized)

      _ ->
        Ash.Changeset.change_attribute(changeset, :repo_key, nil)
    end
  end

  # "https://github.com/Org/Repo.git" / "git@github.com:Org/Repo.git" /
  # "github.com/Org/Repo" / "Org/Repo" -> "org/repo".
  defp normalize(nil), do: nil

  defp normalize(key) when is_binary(key) do
    normalized =
      key
      |> String.trim()
      |> String.replace(~r{^\w+://}, "")
      |> String.replace(~r{^git@}, "")
      |> String.replace(~r{^github\.com[:/]}i, "")
      |> String.replace_suffix(".git", "")
      |> String.trim("/")
      |> String.downcase()

    if normalized == "", do: nil, else: normalized
  end
end
