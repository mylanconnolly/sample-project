defmodule SampleProject.Audit.LogWriter do
  @moduledoc """
  Oban worker that persists a batch of access-log entries enqueued by
  `SampleProject.Audit.Recorder`.

  Keeping the write off the request path means a read or write is never slowed or
  failed by logging, while Oban's durability bounds how much can be lost. Entries
  arrive as string-keyed JSON (from the job `args`); this worker maps them onto the
  `SampleProject.Audit.AccessLog` `:log` action and inserts them as a trusted system write.
  """
  use Oban.Worker, queue: :default, max_attempts: 5

  alias SampleProject.Audit.AccessLog

  # The accepted attributes of AccessLog's `:log` action, in the form they arrive as
  # job-args keys. Listed explicitly so we never call String.to_atom on job input.
  @fields ~w(action_type action_name resource_type record_id project_id actor_id
             actor_email ip_address user_agent request_id request_path page_view_id
             occurred_at)

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"entries" => entries}}) when is_list(entries) do
    inputs = Enum.map(entries, &to_input/1)

    case Ash.bulk_create(inputs, AccessLog, :log,
           authorize?: false,
           return_errors?: true,
           stop_on_error?: true
         ) do
      %Ash.BulkResult{status: :success} -> :ok
      %Ash.BulkResult{status: :error, errors: errors} -> {:error, errors}
      %Ash.BulkResult{status: :partial_success, errors: errors} -> {:error, errors}
    end
  end

  defp to_input(entry) do
    Enum.reduce(@fields, %{}, fn key, acc ->
      case Map.get(entry, key) do
        nil -> acc
        value -> Map.put(acc, String.to_existing_atom(key), value)
      end
    end)
  end
end
