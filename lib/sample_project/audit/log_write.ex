defmodule SampleProject.Audit.LogWrite do
  @moduledoc """
  Notifier that records a write to a PHI-bearing resource in the access log.

  Added to a resource's `notifiers`, it fires after each create/update/destroy commits
  — including atomic updates — without forcing those actions to run non-atomically (the
  reason this is a notifier rather than an `after_action` change). It enqueues one
  `SampleProject.Audit.AccessLog` entry for the affected record, tagged with the matching
  action type. The access log is thus a single, unified trail of all access;
  `ash_paper_trail` still records *what changed*.
  """
  use Ash.Notifier

  alias SampleProject.Audit.Recorder

  @impl true
  def notify(%Ash.Notifier.Notification{} = notification) do
    %{resource: resource, action: action, data: record, actor: actor, changeset: changeset} =
      notification

    audit = changeset && Recorder.audit(changeset.context)

    entry = Recorder.entry(record, action.type, action.name, resource, actor, audit)
    Recorder.enqueue([entry])
    :ok
  end
end
