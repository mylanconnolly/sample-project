defmodule SampleProject.Repo do
  use AshPostgres.Repo,
    otp_app: :sample_project

  @impl true
  def installed_extensions do
    # Add extensions here, and the migration generator will install them.
    # "vector" (pgvector) also enables AshPostgres's vector_cosine_distance/2
    # expression function, used by the memory semantic search.
    ["ash-functions", "citext", "vector"]
  end

  # Don't open unnecessary transactions
  # will default to `false` in 4.0
  @impl true
  def prefer_transaction? do
    false
  end

  @impl true
  def min_pg_version do
    %Version{major: 17, minor: 10, patch: 0}
  end
end
