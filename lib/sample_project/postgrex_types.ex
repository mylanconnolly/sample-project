# Custom Postgrex types module so pgvector `vector` values encode/decode over the
# wire as `Ash.Vector` structs. Required by AshPostgres.Extensions.Vector — unlike
# citext, pgvector needs an explicit Postgrex extension registered here and wired
# into every repo's `:types` config (see config/{dev,test,runtime}.exs).
Postgrex.Types.define(
  SampleProject.PostgrexTypes,
  [AshPostgres.Extensions.Vector] ++ Ecto.Adapters.Postgres.extensions(),
  []
)
