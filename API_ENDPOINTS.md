# API Endpoints

Base URL: `http://localhost:3000`

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Check that the API server is running |

## Authentication APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | User registration |
| POST | `/api/auth/login` | No | User login |

### Signup body

```json
{
	"username": "Ajit",
	"email": "ajit@example.com",
	"password": "your-password"
}
```

### Login body

```json
{
	"email": "ajit@example.com",
	"password": "your-password"
}
```

## Lead APIs

Lead endpoints are scoped to the authenticated user's workspace. New leads remain attributed to the creating user.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/leads` | Yes | Create a new lead |
| GET | `/api/leads` | Yes | Get all leads for the current workspace |
| GET | `/api/leads/status` | Yes | Get lead counts by status |
| GET | `/api/leads/:id` | Yes | Get one lead by ID |
| PUT | `/api/leads/:id` | Yes | Update a lead by ID |
| DELETE | `/api/leads/:id` | Yes | Delete a lead by ID |

### Create/update lead body

The six default fields are always supported. Custom values are stored inside `customFields`; no dynamic MongoDB columns are created.

```json
{
	"name": "Ravi Mehta",
	"company": "Jaipur Hotels",
	"email": "ravi@example.com",
	"phone": "+91 98765 12001",
	"status": "New",
	"notes": "Requested a product walkthrough",
	"customFields": {
		"budget": 2500000,
		"property_type": "Villa",
		"site_visit": true
	}
}
```

Valid lead statuses: `New`, `Contacted`, `Qualified`, `Proposal`, `Negotiation`, `Won`, `Lost`.

### Lead import and export

Import and export are handled by the client using the lead APIs above. There is no separate server import/export endpoint.

Supported formats:

- CSV files (`.csv`)
- Microsoft Excel workbooks (`.xls`, `.xlsx`)
- Google Sheets through a public or published Google Sheets URL

The preferred first-row column names are:

```text
Name, Company, Email, Phone, Status, Notes
```

Recognized standard fields are mapped when present. Missing `Name`, `Company`, or `Email` values receive safe import defaults so customized sheets are not rejected. `Status` is optional and defaults to `New`; invalid status values also default to `New`.

Column matching is case-insensitive and accepts common alternatives such as `Full Name`, `Company Name`, `Organization`, `Email Address`, `Mobile Number`, and `Lead Status`. Any additional or unrecognized columns are stored in the lead's `customFields` object, so the complete customized sheet data is preserved. Blank rows are ignored.

When an import contains headers that are not already configured as CRM custom fields, LeadFlow automatically creates them as optional text fields and displays them in the lead table. The importer detects the actual header row even when a Google Sheet has title, totals, or filter rows above it. Headers such as `Company / Client` and `Client Name` are mapped to the CRM `Name` field automatically.

Exported CSV and Excel files use the same column names, so they can be imported back into LeadFlow CRM or uploaded to Google Sheets. Google Sheets imports use the selected sheet tab (`gid`) and require the sheet to be published or shared as “Anyone with the link can view”.

## Contact APIs

Contacts represent people independently from leads. All endpoints require authentication and are scoped to the current workspace. New contacts remain attributed to the creating user. Contact import and export are handled by the client using CSV and Excel files.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/contacts` | Yes | List active contacts |
| GET | `/api/contacts?archived=true` | Yes | List archived contacts |
| GET | `/api/contacts/owners` | Yes | Get the current user's contact owner record |
| GET | `/api/contacts/:id` | Yes | Get contact details, linked leads, follow-ups, and activity |
| POST | `/api/contacts` | Yes | Create a contact |
| PUT | `/api/contacts/:id` | Yes | Update a contact |
| POST | `/api/contacts/:id/leads` | Yes | Link an owned lead to the contact |
| DELETE | `/api/contacts/:id/leads/:leadId` | Yes | Unlink a lead without deleting it |
| PATCH | `/api/contacts/:id/archive` | Yes | Archive or restore a contact |
| POST | `/api/contacts/:id/merge` | Yes | Merge another contact into this contact |
| POST | `/api/contacts/:id/merge-duplicate` | Yes | Merge submitted duplicate details into this contact |
| DELETE | `/api/contacts/:id` | Yes | Delete a contact after confirming linked-record impact |
| DELETE | `/api/contacts/:id?confirmLinked=true` | Yes | Confirm contact deletion while keeping linked leads and follow-ups |

### Create/update contact body

```json
{
  "name": "Ravi Mehta",
  "phone": "+91 98765 12001",
  "email": "ravi@example.com",
  "company": "Jaipur Hotels",
  "designation": "Operations Manager",
  "city": "Jaipur",
  "notes": "Prefers afternoon calls.",
  "tags": ["Customer"],
  "customFields": {
    "budget": 2500000
  }
}
```

The `customFields` keys reuse configured lead-field keys. Creating or updating a contact with a matching phone number or email returns `409` with code `CONTACT_DUPLICATE` and matching records for review. Deleting a contact with linked leads returns `409` with code `CONTACT_LINKED`; confirming deletion removes only the contact. Merging contacts preserves their linked leads and combines their activity history; the source contact is archived.

## Deal APIs

Deals are workspace-scoped opportunities that can optionally be linked to a contact and lead in the same workspace. All endpoints require authentication. New deals remain attributed to the creating user.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/deals` | Yes | List the current user's deals with linked contact and lead details |
| POST | `/api/deals` | Yes | Create a deal |
| PUT | `/api/deals/:id` | Yes | Update a deal |
| DELETE | `/api/deals/:id` | Yes | Delete a deal |

### Create/update deal body

```json
{
  "name": "Annual software renewal",
  "value": 125000,
  "currency": "INR",
  "stage": "Proposal",
  "probability": 50,
  "expectedCloseDate": "2026-12-15",
  "contactId": "contact-object-id",
  "leadId": "lead-object-id",
  "notes": "Send the revised proposal."
}
```

Valid stages: `Prospecting`, `Qualification`, `Proposal`, `Negotiation`, `Won`, and `Lost`. Probability is a whole number from 0 to 100. Values must be non-negative and currency must be a three-letter code. Contact and lead IDs are optional and must belong to the authenticated user.

## Follow-up APIs

Follow-ups are separate activity records. One lead can have many follow-ups. All follow-up endpoints require authentication and only access leads/follow-ups in the current workspace. New follow-ups remain attributed to the creating user.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/follow-ups` | Yes | Get the current user's follow-ups |
| GET | `/api/follow-ups?status=Completed` | Yes | Filter follow-ups by status |
| GET | `/api/follow-ups/lead/:leadId` | Yes | Get follow-ups for one owned lead |
| POST | `/api/follow-ups` | Yes | Schedule a follow-up |
| PUT | `/api/follow-ups/:id` | Yes | Edit a pending follow-up |
| PATCH | `/api/follow-ups/:id/complete` | Yes | Mark a pending follow-up completed |
| PATCH | `/api/follow-ups/:id/cancel` | Yes | Mark a pending follow-up cancelled |

### Create follow-up body

```json
{
	"leadId": "lead-object-id",
	"type": "Call",
	"scheduledDate": "2026-09-20",
	"scheduledTime": "10:30",
	"note": "Discuss the quotation and confirm requirements."
}
```

Follow-up types: `Call`, `WhatsApp`, `Email`, `Meeting`, `Other`.

Follow-up statuses: `Pending`, `Completed`, `Cancelled`.

Follow-ups must be scheduled in the future. Completing or cancelling updates the existing record and preserves its activity history.

The Calendar page displays these follow-ups by scheduled date, supports month navigation and status filtering, and can schedule, edit, complete, or cancel events. Calendar events are therefore linked to an existing lead and share the same follow-up history; they are not independent all-day or recurring calendar entries.

## Lead Field APIs

Lead fields are workspace-shared definitions used by the Add Lead form. These endpoints are authenticated and do not add columns to the lead collection.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/lead-fields` | Yes | Get enabled custom fields for the current workspace |
| POST | `/api/lead-fields` | Yes | Create a custom field |
| PUT | `/api/lead-fields/:id` | Yes | Update a custom field |
| DELETE | `/api/lead-fields/:id` | Yes | Delete a custom field |

### Create lead field body

```json
{
	"name": "Budget",
	"key": "budget",
	"type": "number",
	"options": [],
	"required": false,
	"order": 0
}
```

Supported field types: `text`, `number`, `email`, `phone`, `date`, `dropdown`, `checkbox`, `url`.

For a dropdown field, provide at least one option:

```json
{
	"name": "Property Type",
	"key": "property_type",
	"type": "dropdown",
	"options": ["Villa", "Apartment", "Office"],
	"required": false,
	"order": 1
}
```

### Update lead field body

```json
{
	"name": "Estimated Budget",
	"order": 2,
	"enabled": true
}
```

## Team and workspace APIs

Workspace membership is created lazily for existing accounts. Workspace members share access to leads, contacts, deals, follow-ups, and lead-field definitions; new records retain the acting user's owner/creator ID. Removing a member stops sharing that member's records with the workspace without deleting those records.

Invitations are email-bound, single-use links that expire after seven days. The API does not send email; an admin copies and shares the returned token as a client link. The token is stored hashed and is returned only when creating or renewing an invitation. Joining an existing account requires signing in with the invited email. A user who owns a workspace with other members must resolve that workspace before joining a different one.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/team` | Yes | Get current workspace, member roles, and active invitations |
| POST | `/api/team/invitations` | Yes (owner/admin) | Create or renew an invitation |
| GET | `/api/team/invitations/preview/:token` | No | Preview an active invitation without accepting it |
| POST | `/api/team/invitations/accept` | Yes | Accept an invitation using the signed-in account |
| DELETE | `/api/team/invitations/:id` | Yes (owner/admin) | Revoke a pending invitation |
| PATCH | `/api/team/members/:id` | Yes (owner/admin) | Change a member's role to `admin` or `member` |
| DELETE | `/api/team/members/:id` | Yes (owner/admin) | Remove a member; their records remain in their account |

### Create or renew invitation body

```json
{
  "email": "teammate@example.com",
  "role": "member"
}
```

The response contains the invitation ID, email, role, expiry, and one-time raw `token`. The client constructs the join URL as `/join/:token`. Roles are `owner` (assigned to the workspace creator), `admin` (can manage workspace members and invitations), and `member`.

## Dashboard data notes

The dashboard derives lead-creation trends from each lead's `createdAt` value and pipeline counts from its current status. The API does not provide status-change or conversion timestamps, so historical conversion trends and a status-change activity feed are not available. Follow-ups include their schedule and completion status but do not include priority. No account-level time zone is currently exposed; dashboard date filtering and task display use the browser's local time zone.
