defmodule SampleProject.Audit.LogRead do
  @moduledoc """
  Global read preparation that records access to a PHI-bearing resource.

  Added to a resource's `preparations` block, it runs on every read action. In the
  query's `after_action` it builds one `SampleProject.Audit.AccessLog` entry per returned
  record and enqueues them for asynchronous writing, so the read itself is never
  blocked or failed by logging. The actor and request metadata come from the action
  context (set on reads by the `put_audit_context` plug).
  """
  use Ash.Resource.Preparation

  alias SampleProject.Audit.Recorder

  @impl true
  def prepare(query, _opts, context) do
    action_name = query.action.name
    actor = Map.get(context, :actor)
    audit = context |> Map.get(:source_context) |> Recorder.audit()

    Ash.Query.after_action(query, fn query, results ->
      entries =
        Enum.map(results, fn record ->
          Recorder.entry(record, :read, action_name, query.resource, actor, audit)
        end)

      Recorder.enqueue(entries)
      {:ok, results}
    end)
  end
end
