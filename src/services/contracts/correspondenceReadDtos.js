/**
 * Provisional DTO boundaries for read-only correspondence API preparation.
 *
 * Confirmed by supplied documentation:
 * - GET /api/correspondence/
 * - GET /api/correspondence/{id}/
 * - GET /api/correspondence/{id}/movements/
 * - GET /api/correspondence/{id}/attachments/
 * - GET /api/correspondence/{id}/notes/
 *
 * Pending backend confirmation:
 * - exact list envelope and pagination fields beyond count/next/previous/results
 * - filter and search query parameters
 * - authoritative enum values returned by read endpoints
 * - office object representation
 * - admin oversight scope and historical scopes
 * - detailed movement and note shapes
 */

/**
 * @typedef {object} ApiPaginationDto
 * @property {number | null | undefined} [count] Confirmed when a paginated list envelope is used.
 * @property {string | null | undefined} [next] Confirmed when a paginated list envelope is used.
 * @property {string | null | undefined} [previous] Confirmed when a paginated list envelope is used.
 * @property {number | null | undefined} [page] Pending backend confirmation.
 * @property {number | null | undefined} [page_size] Pending backend confirmation.
 * @property {number | null | undefined} [pageSize] Pending backend confirmation.
 */

/**
 * @typedef {object} ApiCorrespondenceListItemDto
 * @property {string | null | undefined} [id] Confirmed as the machine identifier for endpoint paths.
 * @property {string | null | undefined} [reference_number] Confirmed as the human-facing identifier.
 * @property {string | null | undefined} [type] Documented for registration and likely present in reads; returned enum still pending confirmation.
 * @property {string | null | undefined} [subject] Currently optional; pending backend confirmation for read endpoints.
 * @property {string | null | undefined} [sender] Currently optional; pending backend confirmation for read endpoints.
 * @property {string | null | undefined} [priority] Documented for registration; returned enum still pending confirmation.
 * @property {string | null | undefined} [direction] Documented for registration; returned enum still pending confirmation.
 * @property {string | null | undefined} [status] Currently optional; authoritative read enum pending confirmation.
 * @property {string | null | undefined} [current_stage] Currently optional; pending backend confirmation for reads.
 * @property {object | string | null | undefined} [current_office] Currently optional; exact shape pending backend confirmation.
 * @property {object | null | undefined} [registered_by] Currently optional; exact shape pending backend confirmation.
 * @property {string | null | undefined} [registered_at] Currently optional; pending backend confirmation for reads.
 * @property {string | null | undefined} [created_at] Currently optional; pending backend confirmation for reads.
 * @property {string | null | undefined} [updated_at] Currently optional; pending backend confirmation for reads.
 */

/**
 * @typedef {object} ApiCorrespondenceListResponse
 * @property {ApiCorrespondenceListItemDto[] | undefined} [results] Confirmed only for the provisional paginated envelope.
 * @property {number | null | undefined} [count] Confirmed only for the provisional paginated envelope.
 * @property {string | null | undefined} [next] Confirmed only for the provisional paginated envelope.
 * @property {string | null | undefined} [previous] Confirmed only for the provisional paginated envelope.
 */

/**
 * @typedef {ApiCorrespondenceListItemDto & {
 *   receipt_status?: string | null | undefined,
 *   deadline?: string | null | undefined,
 *   journey?: Array<object> | undefined,
 *   attachments?: Array<object> | undefined,
 *   notes?: Array<object> | undefined,
 * }} ApiCorrespondenceDetailDto
 * Additional read-only fields are currently optional and pending backend confirmation.
 */

/**
 * @typedef {object} ApiMovementDto
 * @property {string | null | undefined} [id] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [action] Currently optional; authoritative enum pending confirmation.
 * @property {object | string | null | undefined} [from_office] Currently optional; exact shape pending backend confirmation.
 * @property {object | string | null | undefined} [to_office] Currently optional; exact shape pending backend confirmation.
 * @property {object | null | undefined} [performed_by] Currently optional; exact shape pending backend confirmation.
 * @property {string | null | undefined} [performed_at] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [note] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [current_stage] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [status] Currently optional; authoritative enum pending confirmation.
 */

/**
 * @typedef {object} ApiAttachmentDto
 * @property {string | null | undefined} [id] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [filename] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [original_filename] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [mime_type] Currently optional; pending backend confirmation.
 * @property {number | null | undefined} [size_bytes] Currently optional; pending backend confirmation.
 * @property {object | null | undefined} [uploaded_by] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [uploaded_at] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [file_url] Confirmed backend-provided file URL for direct preview/download use.
 * @property {string | null | undefined} [download_url] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [preview_url] Currently optional; pending backend confirmation.
 */

/**
 * @typedef {object} ApiNoteDto
 * @property {string | null | undefined} [id] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [text] Currently optional; pending backend confirmation.
 * @property {object | null | undefined} [author] Currently optional; pending backend confirmation.
 * @property {object | null | undefined} [user] Currently optional; pending backend confirmation.
 * @property {object | string | null | undefined} [office] Currently optional; pending backend confirmation.
 * @property {string | null | undefined} [created_at] Currently optional; pending backend confirmation.
 */

export const correspondenceReadDtos = Object.freeze({
  listResponse: 'ApiCorrespondenceListResponse',
  listItem: 'ApiCorrespondenceListItemDto',
  detail: 'ApiCorrespondenceDetailDto',
  movement: 'ApiMovementDto',
  attachment: 'ApiAttachmentDto',
  note: 'ApiNoteDto',
  pagination: 'ApiPaginationDto',
})
