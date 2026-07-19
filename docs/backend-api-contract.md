# Backend API Contract

## POST `/api/users`

Required role: `SYSTEM_ADMIN`

Example URL:

`http://localhost:3000/api/users`

Request body:

```json
{
  "firstName": "Abena",
  "middleName": "",
  "lastName": "Owusu",
  "role": "OFFICE_USER",
  "officeId": "office-legal",
  "phoneNumber": "0200000000",
  "accountStatus": "Active",
  "temporaryPassword": "Password123"
}
```

The request must not include:

- `email`
- `officeName`
- office email subdomain values
- generated usernames
- generated institutional email addresses

Expected success response:

```json
{
  "user": {
    "id": "user-123",
    "firstName": "Abena",
    "middleName": "",
    "lastName": "Owusu",
    "displayName": "Abena Owusu",
    "email": "abena.owusu@legal.mrh.gov.gh",
    "role": "OFFICE_USER",
    "officeId": "office-legal",
    "officeName": "Legal Directorate",
    "accountStatus": "Active",
    "createdAt": "2026-07-19T17:00:00.000Z"
  }
}
```

Preferred future response:

```json
{
  "user": {
    "id": "user-123",
    "firstName": "Abena",
    "middleName": "",
    "lastName": "Owusu",
    "displayName": "Abena Owusu",
    "email": "abena.owusu@legal.mrh.gov.gh",
    "role": "OFFICE_USER",
    "officeId": "office-legal",
    "officeName": "Legal Directorate",
    "accountStatus": "Active",
    "createdAt": "2026-07-19T17:00:00.000Z"
  },
  "auditEntry": {
    "id": "audit-user-created-001",
    "type": "Security",
    "title": "User Created",
    "description": "User account created for Abena Owusu in Legal Directorate.",
    "reference": "abena.owusu@legal.mrh.gov.gh",
    "user": "Esi Owusu",
    "office": "ICT Directorate",
    "role": "System Administrator",
    "time": "19 Jul 2026, 5:00 PM",
    "dateGroup": "Today"
  }
}
```

Common error responses:

- `400`: Invalid request payload or malformed field values
- `401`: Authentication required
- `403`: Administrator permission required
- `404`: Office or resource not found
- `409`: Email or account conflict
- `422`: Validation failure
- `500+`: Backend service failure

Backend responsibilities:

- authenticate the requester
- require `SYSTEM_ADMIN`
- validate `officeId`
- ensure the office is active
- look up the stored office email subdomain
- normalise names into the institutional username
- generate the final institutional email
- enforce case-insensitive uniqueness with a database constraint
- hash the temporary password
- persist the user
- create the administrator audit event
- return the created user
- perform user creation and audit logging atomically

The frontend must not be trusted for these operations.
