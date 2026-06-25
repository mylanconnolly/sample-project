# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     SampleProject.Repo.insert!(%SampleProject.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

# Seed the first admin user. Registration is invite-only, so this is the
# bootstrap account that can then invite everyone else. Idempotent: only
# creates the user if it doesn't already exist. Override via env vars when
# bootstrapping a real environment.
require Ash.Query

admin_email = System.get_env("ADMIN_EMAIL", "admin@example.com")
admin_name = System.get_env("ADMIN_NAME", "Admin")

existing_admin =
  SampleProject.Accounts.User
  |> Ash.Query.filter(email == ^admin_email)
  |> Ash.read_one!(authorize?: false)

case existing_admin do
  nil ->
    # Ash.Seed.seed! inserts directly, bypassing actions/policies/email side effects.
    Ash.Seed.seed!(SampleProject.Accounts.User, %{
      email: admin_email,
      role: :admin,
      name: admin_name
    })

    IO.puts("Seeded admin user #{admin_email}.")

  %{role: :admin, name: ^admin_name} ->
    IO.puts("Admin user #{admin_email} already exists, skipping.")

  user ->
    # Pre-existing account — ensure it's an admin with the expected display name.
    user
    |> Ash.Changeset.for_update(:update_user, %{role: :admin, name: admin_name},
      authorize?: false
    )
    |> Ash.update!()

    IO.puts("Updated existing user #{admin_email} (admin role + name).")
end
