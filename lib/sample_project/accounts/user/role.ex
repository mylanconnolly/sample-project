defmodule SampleProject.Accounts.User.Role do
  @moduledoc """
  Authorization role for a `SampleProject.Accounts.User`.
  """
  use Ash.Type.Enum,
    values: [
      user: [label: "User", description: "A regular user."],
      admin: [label: "Admin", description: "Can access the admin section and manage users."]
    ]
end
