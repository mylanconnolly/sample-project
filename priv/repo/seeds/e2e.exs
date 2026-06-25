# Deterministic fixtures for the Playwright E2E suite. Idempotent: safe to run on
# every server start. Creates a known admin to log in as (registration is
# invite-only, so the magic-link flow needs an existing user).
require Ash.Query

alias SampleProject.Accounts.User

email = "e2e@example.com"

user =
  case User |> Ash.Query.filter(email == ^email) |> Ash.read_one!(authorize?: false) do
    nil ->
      Ash.Seed.seed!(User, %{email: email, role: :admin, name: "E2E Admin"})

    existing ->
      existing
  end

IO.puts("E2E seed ready: #{email} (#{user.role})")
