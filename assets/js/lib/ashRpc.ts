import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import {
  activateUser,
  buildCSRFHeaders,
  deactivateUser,
  destroyApiKey,
  generateApiKey,
  listAccessLogs,
  listApiKeys,
  getAnthropicConfig,
  getCurrentUser,
  getGcsConfig,
  getUser,
  inviteUser,
  listAnthropicModels,
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  searchMemories,
  updateMemory,
  listUsers,
  requestMagicLink,
  setAnthropicConfig,
  setGcsConfig,
  updateProfile,
  updateUser,
  type CreateMemoryInput,
  type UpdateMemoryInput,
  type GenerateApiKeyInput,
  type InviteUserInput,
  type SetAnthropicConfigInput,
  type SetGcsConfigInput,
  type UpdateProfileInput,
  type UpdateUserInput,
} from "../ash_rpc"
import type {
  MemoryResourceSchema,
  MemorySortField,
  UserSortField,
} from "../ash_types"
import { AshError, unwrap } from "./ashErrors"
import { pageViewId } from "./pageView"

/**
 * Headers for every RPC call: the Phoenix CSRF token plus the current page-load id
 * (`x-page-view-id`), which the server records on each access-log row so reads from
 * one navigation can be grouped. See lib/pageView.
 */
function rpcHeaders(): Record<string, string> {
  return buildCSRFHeaders({ "x-page-view-id": pageViewId() })
}

/**
 * Stable query-key convention: `[resource, action, ...args]`. Channel events
 * invalidate by matching a prefix of these keys (see lib/socket).
 */
export const queryKeys = {
  currentUser: () => ["User", "get_current_user"] as const,
  apiKeys: () => ["ApiKey", "list_api_keys"] as const,
  users: (params: ListUsersParams) => ["User", "list_users", params] as const,
  user: (id: string) => ["User", "get_user", id] as const,
  anthropicConfig: () => ["AnthropicConfig", "get_anthropic_config"] as const,
  gcsConfig: () => ["GcsConfig", "get_gcs_config"] as const,
  anthropicModels: () => ["AnthropicConfig", "list_anthropic_models"] as const,
  accessLogs: (params: ListAccessLogsParams) =>
    ["AccessLog", "list_access_logs", params] as const,
  accessLog: (id: string) =>
    ["AccessLog", "list_access_logs", "one", id] as const,
  memories: (params: ListMemoriesParams) =>
    ["Memory", "list_memories", params] as const,
  memory: (id: string) => ["Memory", "get_memory", id] as const,
  memorySearch: (params: SearchMemoriesParams) =>
    ["Memory", "search_memories", params] as const,
}

/**
 * Tanstack Query options for the signed-in user (the `:me` read action). `role`
 * is fetched so the admin section / nav can gate on it. Field arrays are inlined
 * (not extracted to a const) so ash_typescript can infer the result shape.
 */
export function meQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.currentUser(),
    queryFn: () =>
      getCurrentUser({
        fields: ["id", "email", "name", "role", "active"],
        headers: rpcHeaders(),
      }).then(unwrap),
  })
}

/** Request a magic-link email for `email` (the `request_magic_link` action). */
export function sendMagicLink(email: string) {
  return requestMagicLink({
    input: { email },
    headers: rpcHeaders(),
  }).then(unwrap)
}

// --- Admin: users management -------------------------------------------------

const USERS_PAGE_SIZE = 25

export type UserSort = `${"" | "-"}${UserSortField}`

export interface ListUsersParams {
  /** Phrase-aware email search, e.g. `mc iotrak` (blank = no filter). */
  search?: string
  /** Sort column with optional `-` descending prefix. */
  sort?: UserSort
}

/**
 * Infinite (keyset) listing for the admin users table. `id` is always appended
 * as a stable tiebreaker so keyset cursors are deterministic regardless of the
 * chosen sort column.
 */
export function listUsersInfiniteQueryOptions(params: ListUsersParams) {
  const sort: UserSort[] = params.sort
    ? [params.sort, "id"]
    : ["-insertedAt", "id"]
  const search = params.search?.trim()

  return infiniteQueryOptions({
    queryKey: queryKeys.users(params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listUsers({
        fields: [
          "id",
          "email",
          "name",
          "role",
          "active",
          "insertedAt",
          "updatedAt",
        ],
        ...(search ? { input: { search } } : {}),
        sort,
        // Always include `after` (undefined on the first page) so the result
        // type resolves to the keyset page shape, not the bare array.
        page: { limit: USERS_PAGE_SIZE, after: pageParam },
        headers: rpcHeaders(),
      }).then(unwrap),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
  })
}

/** Tanstack Query options for a single user by id (the `get_user` action). */
export function userQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.user(id),
    queryFn: () =>
      getUser({
        input: { id },
        fields: [
          "id",
          "email",
          "name",
          "role",
          "active",
          "insertedAt",
          "updatedAt",
        ],
        headers: rpcHeaders(),
      }).then(unwrap),
  })
}

/** Invite a user: creates the account and emails them a magic link. */
export function inviteNewUser(input: InviteUserInput) {
  return inviteUser({
    input,
    fields: [
      "id",
      "email",
      "name",
      "role",
      "active",
      "insertedAt",
      "updatedAt",
    ],
    headers: rpcHeaders(),
  }).then(unwrap)
}

/** Admin update of a user's email and/or role. */
export function updateExistingUser(id: string, input: UpdateUserInput) {
  return updateUser({
    identity: id,
    input,
    fields: [
      "id",
      "email",
      "name",
      "role",
      "active",
      "insertedAt",
      "updatedAt",
    ],
    headers: rpcHeaders(),
  }).then(unwrap)
}

/** Self-service update of the signed-in user's own profile (display name). */
export function updateCurrentProfile(id: string, input: UpdateProfileInput) {
  return updateProfile({
    identity: id,
    input,
    fields: ["id", "email", "name", "role", "active"],
    headers: rpcHeaders(),
  }).then(unwrap)
}

/** Activate or deactivate a user (admin only). Inactive users cannot sign in. */
export function setUserActive(id: string, active: boolean) {
  const fn = active ? activateUser : deactivateUser
  return fn({
    identity: id,
    fields: [
      "id",
      "email",
      "name",
      "role",
      "active",
      "insertedAt",
      "updatedAt",
    ],
    headers: rpcHeaders(),
  }).then(unwrap)
}

// --- Admin: access log -------------------------------------------------------

const ACCESS_LOG_PAGE_SIZE = 50

export type AccessLogActionType = "read" | "create" | "update" | "destroy"

// The access log's resource_type is a free-form string (derived from the logged
// resource's module name). These are the resources currently in the app; extend
// the union as you wire access logging onto more resources.
export type AccessLogResourceType = "memory" | "user"

export interface ListAccessLogsParams {
  /** Substring match on the acting user's snapshotted email. */
  actorEmail?: string
  actionType?: AccessLogActionType
  resourceType?: AccessLogResourceType
  /** Deep-link facets: show all access by a user / to a record / in a project, or
   *  all reads from one page load. */
  actorId?: string
  recordId?: string
  projectId?: string
  pageViewId?: string
  /** Inclusive day bounds, `YYYY-MM-DD` (converted to UTC datetimes). */
  from?: string
  to?: string
}

// Map the page's facets onto the `list_access_logs` action input. `resourceType`
// isn't an action argument, so it rides the generated `filter` (see below).
// Exported for unit testing.
export function accessLogInput(params: ListAccessLogsParams) {
  const input: Record<string, string> = {}
  if (params.actorEmail?.trim()) input.actorEmail = params.actorEmail.trim()
  if (params.actionType) input.actionType = params.actionType
  if (params.actorId) input.actorId = params.actorId
  if (params.recordId) input.recordId = params.recordId
  if (params.projectId) input.projectId = params.projectId
  if (params.from) input.from = `${params.from}T00:00:00.000000Z`
  if (params.to) input.to = `${params.to}T23:59:59.999999Z`
  return input
}

// Inlined so ash_typescript can infer the row shape from the field list.
const ACCESS_LOG_FIELDS = [
  "id",
  "occurredAt",
  "actionType",
  "actionName",
  "resourceType",
  "recordId",
  "projectId",
  "actorId",
  "actorEmail",
  "ipAddress",
  "userAgent",
  "requestId",
  "requestPath",
  "pageViewId",
] as const

/**
 * Infinite (keyset) listing for the admin access-log table, newest first (the
 * action's default sort). App-admin only — the resource read policy gates it.
 */
export function listAccessLogsInfiniteQueryOptions(
  params: ListAccessLogsParams,
) {
  const input = accessLogInput(params)
  // resourceType / pageViewId aren't action arguments, so they ride the generated filter.
  const filter: Record<string, { eq: string }> = {}
  if (params.resourceType) filter.resourceType = { eq: params.resourceType }
  if (params.pageViewId) filter.pageViewId = { eq: params.pageViewId }
  const hasFilter = Object.keys(filter).length > 0

  return infiniteQueryOptions({
    queryKey: queryKeys.accessLogs(params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listAccessLogs({
        fields: [...ACCESS_LOG_FIELDS],
        ...(Object.keys(input).length ? { input } : {}),
        ...(hasFilter ? { filter } : {}),
        // `after` is always present (undefined on page one) so the result type
        // resolves to the keyset page shape, not the bare array.
        page: { limit: ACCESS_LOG_PAGE_SIZE, after: pageParam },
        headers: rpcHeaders(),
      }).then(unwrap),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
  })
}

/** A single access-log entry by id (fetched via the list action, filtered to one). */
export function accessLogQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.accessLog(id),
    queryFn: () =>
      listAccessLogs({
        fields: [...ACCESS_LOG_FIELDS],
        filter: { id: { eq: id } },
        page: { limit: 1 },
        headers: rpcHeaders(),
      })
        .then(unwrap)
        .then((rows) => rows[0] ?? null),
  })
}

// --- Self-service: API keys --------------------------------------------------

/**
 * Tanstack Query options for the signed-in user's API keys (newest first). The
 * `valid` calculation reflects whether the key has passed its expiry. The
 * plaintext key is never listed here — only `generateNewApiKey` ever returns it.
 */
export function apiKeysQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.apiKeys(),
    queryFn: () =>
      listApiKeys({
        fields: ["id", "name", "expiresAt", "insertedAt", "valid"],
        headers: rpcHeaders(),
      }).then(unwrap),
  })
}

/** A freshly generated API key, including its one-time plaintext value. */
export type GeneratedApiKey = {
  id: string
  name: string | null
  expiresAt: string
  insertedAt: string
  valid: boolean | null
  plaintextApiKey: string
}

/**
 * Generate a new API key for the signed-in user. The full plaintext key is
 * returned ONLY here (in the action's metadata) and can never be retrieved
 * again, so the caller must surface it to the user immediately.
 */
export function generateNewApiKey(
  input: GenerateApiKeyInput,
): Promise<GeneratedApiKey> {
  return generateApiKey({
    input,
    fields: ["id", "name", "expiresAt", "insertedAt", "valid"],
    metadataFields: ["plaintextApiKey"],
    headers: rpcHeaders(),
  }).then((result) => {
    if (!result.success) throw new AshError(result.errors)
    return { ...result.data, plaintextApiKey: result.metadata.plaintextApiKey }
  })
}

/** Permanently revoke one of the signed-in user's API keys. */
export function deleteExistingApiKey(id: string) {
  return destroyApiKey({ identity: id, headers: rpcHeaders() }).then(unwrap)
}

// --- Admin: Anthropic settings -----------------------------------------------

/**
 * The singleton Anthropic configuration as surfaced to the admin UI. The API key
 * itself is never returned (it's encrypted and non-public) — only `apiKeySet`
 * indicates whether one is configured.
 */
export interface AnthropicConfig {
  id: string
  defaultModel: string | null
  apiKeySet: boolean | null
}

const ANTHROPIC_CONFIG_FIELDS = ["id", "defaultModel", "apiKeySet"] as const

/**
 * Tanstack Query options for the singleton Anthropic config. The backing read is
 * a plain (non-`get?`) action returning a 0- or 1-element list, so this resolves
 * to the single config or `null` when none has been saved yet.
 */
export function anthropicConfigQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.anthropicConfig(),
    queryFn: () =>
      getAnthropicConfig({
        fields: [...ANTHROPIC_CONFIG_FIELDS],
        headers: rpcHeaders(),
      })
        .then(unwrap)
        .then((rows): AnthropicConfig | null => rows[0] ?? null),
  })
}

/**
 * Create or update the singleton Anthropic config. A blank `apiKey` leaves the
 * existing key unchanged (enforced server-side), so the form can omit it when
 * only the default model is being edited.
 */
export function saveAnthropicConfig(input: SetAnthropicConfigInput) {
  return setAnthropicConfig({
    input,
    fields: [...ANTHROPIC_CONFIG_FIELDS],
    headers: rpcHeaders(),
  }).then(unwrap)
}

/** A Claude model available to the configured API key (for the model picker). */
export interface AnthropicModelOption {
  id: string
  displayName: string
}

/**
 * Tanstack Query options for the Claude models available to the configured key.
 * The server caches the Anthropic response in ETS for ~1h; `staleTime` mirrors
 * that so the client doesn't re-request within the window. Only meaningful once
 * a key is set — callers should gate this with `enabled: apiKeySet`.
 */
export function anthropicModelsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.anthropicModels(),
    queryFn: (): Promise<AnthropicModelOption[]> =>
      listAnthropicModels({
        fields: ["id", "displayName"],
        headers: rpcHeaders(),
      }).then(unwrap),
    staleTime: 60 * 60 * 1000,
  })
}

// --- Admin: Google Cloud Storage settings ------------------------------------

/**
 * The singleton GCS configuration as surfaced to the admin UI. The service
 * account JSON is never returned (encrypted, non-public) — only
 * `serviceAccountJsonSet` indicates whether one is configured.
 */
export interface GcsConfig {
  id: string
  bucketName: string | null
  serviceAccountJsonSet: boolean | null
}

const GCS_CONFIG_FIELDS = ["id", "bucketName", "serviceAccountJsonSet"] as const

/**
 * Tanstack Query options for the singleton GCS config. The backing read returns a
 * 0- or 1-element list, so this resolves to the single config or `null` when none
 * has been saved yet.
 */
export function gcsConfigQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.gcsConfig(),
    queryFn: () =>
      getGcsConfig({
        fields: [...GCS_CONFIG_FIELDS],
        headers: rpcHeaders(),
      })
        .then(unwrap)
        .then((rows): GcsConfig | null => rows[0] ?? null),
  })
}

/**
 * Create or update the singleton GCS config. A blank `serviceAccountJson` leaves
 * the stored key unchanged (enforced server-side), so the form can omit it when
 * only the bucket name is being edited.
 */
export function saveGcsConfig(input: SetGcsConfigInput) {
  return setGcsConfig({
    input,
    fields: [...GCS_CONFIG_FIELDS],
    headers: rpcHeaders(),
  }).then(unwrap)
}

// --- Admin: memories management ----------------------------------------------

const MEMORIES_PAGE_SIZE = 25

/** The visibility scope of a memory. */
export type MemoryScope = MemoryResourceSchema["scope"]

/** Scope options for selects and badges, in display order. */
export const MEMORY_SCOPE_OPTIONS: { value: MemoryScope; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "repository", label: "Repository" },
  { value: "user", label: "User" },
]

export type MemorySort = `${"" | "-"}${MemorySortField}`

export interface ListMemoriesParams {
  /** Phrase-aware search over content (blank = no filter). */
  search?: string
  /** Narrow to a single scope. */
  scope?: MemoryScope
  /** Narrow to a single normalized repo key, e.g. `org/repo`. */
  repoKey?: string
  /** Sort column with optional `-` descending prefix. */
  sort?: MemorySort
}

export interface SearchMemoriesParams {
  /** The semantic search query (required for results). */
  query: string
  scope?: MemoryScope
  repoKey?: string
}

/**
 * Infinite (keyset) listing for the admin memories table. `id` is always appended
 * as a stable tiebreaker so keyset cursors are deterministic regardless of sort.
 */
export function listMemoriesInfiniteQueryOptions(params: ListMemoriesParams) {
  const sort: MemorySort[] = params.sort
    ? [params.sort, "id"]
    : ["-insertedAt", "id"]
  const search = params.search?.trim()
  const input = {
    ...(search ? { search } : {}),
    ...(params.scope ? { scope: params.scope } : {}),
    ...(params.repoKey ? { repoKey: params.repoKey } : {}),
  }

  return infiniteQueryOptions({
    queryKey: queryKeys.memories(params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listMemories({
        fields: [
          "id",
          "scope",
          "repoKey",
          "content",
          "insertedAt",
          "updatedAt",
          { createdBy: ["id", "email", "name"] },
        ],
        ...(Object.keys(input).length ? { input } : {}),
        sort,
        // Always include `after` (undefined on the first page) so the result type
        // resolves to the keyset page shape, not the bare array.
        page: { limit: MEMORIES_PAGE_SIZE, after: pageParam },
        headers: rpcHeaders(),
      }).then(unwrap),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
  })
}

/** Tanstack Query options for a single memory by id (the `get_memory` action). */
export function memoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.memory(id),
    queryFn: () =>
      getMemory({
        input: { id },
        fields: [
          "id",
          "scope",
          "repoKey",
          "content",
          "insertedAt",
          "updatedAt",
          { createdBy: ["id", "email", "name"] },
        ],
        headers: rpcHeaders(),
      }).then(unwrap),
  })
}

/**
 * Tanstack Query options for the semantic search. Disabled until there's a query;
 * results are ranked by vector similarity server-side.
 */
export function searchMemoriesQueryOptions(params: SearchMemoriesParams) {
  const query = params.query.trim()

  return queryOptions({
    queryKey: queryKeys.memorySearch({ ...params, query }),
    enabled: query.length > 0,
    queryFn: () =>
      searchMemories({
        input: {
          query,
          ...(params.scope ? { scope: params.scope } : {}),
          ...(params.repoKey ? { repoKey: params.repoKey } : {}),
        },
        fields: [
          "id",
          "scope",
          "repoKey",
          "content",
          "insertedAt",
          "updatedAt",
          { createdBy: ["id", "email", "name"] },
        ],
        headers: rpcHeaders(),
      }).then(unwrap),
  })
}

/** Record a new memory (the acting user becomes its owner). */
export function createNewMemory(input: CreateMemoryInput) {
  return createMemory({
    input,
    fields: [
      "id",
      "scope",
      "repoKey",
      "content",
      "insertedAt",
      "updatedAt",
      { createdBy: ["id", "email", "name"] },
    ],
    headers: rpcHeaders(),
  }).then(unwrap)
}

/** Update a memory's content (and, for repository scope, its repo key). */
export function updateExistingMemory(id: string, input: UpdateMemoryInput) {
  return updateMemory({
    identity: id,
    input,
    fields: [
      "id",
      "scope",
      "repoKey",
      "content",
      "insertedAt",
      "updatedAt",
      { createdBy: ["id", "email", "name"] },
    ],
    headers: rpcHeaders(),
  }).then(unwrap)
}

/** Delete a memory. */
export function deleteExistingMemory(id: string) {
  return deleteMemory({ identity: id, headers: rpcHeaders() }).then(unwrap)
}
