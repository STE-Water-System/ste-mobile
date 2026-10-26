# Mock data (frontend-only)

Everything in this folder is a **stand-in for backend endpoints that do not exist yet**.
Screens that read from here show a small "Démo · données fictives" ribbon (`MockBanner`).

| Dataset | Used by | Real integration to add later |
|---|---|---|
| `customer.ts` → `MOCK_CLIENT_NOTIFICATIONS` | customer notifications screen, home preview | a notifications endpoint per customer |
| `customer.ts` → `MOCK_OUTAGES` | outages screen, home banner | planned works / incidents feed |
| `customer.ts` → `MOCK_COMPLAINTS` | complaints ("plaintes") list + detail | `GET /api/client/complaints/:customerId` (does not exist yet) |
| `customer.ts` → `MOCK_REQUESTS` | installation requests list, verification lookup | connection-request endpoints exposed to customers |
| `customer.ts` → `MOCK_AGENCIES`, `MOCK_CONTACT` | agencies & contact screen | static config from the API |
| `customer.ts` → `MOCK_PAYMENT_METHODS` | mock payment flow | mobile-money / payment gateway |
| `customer.ts` → `MOCK_TIPS` | customer home | CMS content |
| `agent.ts` → `MOCK_TASKS` | agent tasks (disconnections, interventions) | disconnection-action assignments for the agent |
| `agent.ts` → `MOCK_AGENT_NOTIFICATIONS`, `MOCK_ANNOUNCEMENTS` | agent notifications / home | push + announcements endpoint |
| `agent.ts` → `MOCK_INCIDENT_TYPES` | incident report form | incident endpoint |

Records the user creates on the device (complaints, installation requests, self-readings,
mock payments, incident reports, task progress) are kept in `src/store/localStore.ts`
and merged with these datasets on screen. Submissions wait `MOCK_LATENCY_MS`
(`src/config/auth.ts`) so loading states are visible.

Existing backend calls (login, assigned round, reading update, customer lookup, bills,
consumption, complaint creation) are **not** mocked and keep their contracts in
`src/services/api.ts`.
