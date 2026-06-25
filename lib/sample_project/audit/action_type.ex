defmodule SampleProject.Audit.ActionType do
  @moduledoc """
  The kind of access an `SampleProject.Audit.AccessLog` row records.

  `:read` covers viewing/listing/downloading a record (the access that paper-trail
  versioning does *not* capture); the write types mirror the Ash action types so the
  access log is a single, unified trail of who touched a record and how.
  """
  use Ash.Type.Enum,
    values: [
      read: [
        label: "Read",
        description: "The record was viewed, listed, or downloaded."
      ],
      create: [
        label: "Create",
        description: "The record was created."
      ],
      update: [
        label: "Update",
        description: "The record was modified."
      ],
      destroy: [
        label: "Destroy",
        description: "The record was deleted."
      ]
    ]
end
