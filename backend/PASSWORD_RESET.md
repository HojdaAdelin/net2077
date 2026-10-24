Password reset uses Brevo's HTTPS transactional email API and the existing root
`.env` locally. No extra dependency is required (Node 18+ provides fetch).

Backend environment variables:

- `EMAIL_FURNIZOR`: Brevo API key, not the SMTP key.
- `EMAIL`: sender email configured and verified in Brevo.
- `JWT_SECRET`: existing application secret, also used to protect reset hashes.
- `MONGODB_URI`: existing application database.

Set these in the backend project's Vercel Production environment and redeploy.
Never expose the Brevo key through a `VITE_` variable. The frontend continues to
use its existing `VITE_API_URL`/API routing and credential configuration.

Flow: POST `/api/auth/password-reset/request` with email; POST `.../verify`
with requestId and the eight-digit code; POST `.../complete` with requestId,
resetToken, password and confirmPassword. The UI implements all three steps at
`/reset-password` and does not sign the user in automatically afterward.

Codes last 15 minutes. Five wrong guesses lock that attempt, not the account.
Successful verification consumes the code and issues a random one-use grant,
valid for at most five minutes and never beyond the code's original expiration.
Resending successfully supersedes older pending codes and verification grants.
A failed delivery preserves the previous valid code. Unknown accounts and
delivery failures produce the same public request response. Normal responses
have a minimum delay to reduce account-enumeration timing differences.

MongoDB stores code/grant HMACs and expiration dates. Expiration is checked in
queries; TTL indexes are cleanup only. There are no in-memory security limits
or background delivery tasks, so separate Vercel invocations share the state.

Limits are stored atomically in MongoDB: 60-second resend cooldown, three requests
per email/hour, ten requests per IP/hour, 50 verification calls per IP/15 minutes,
20 completion calls per IP/15 minutes, and 250 reset requests globally per UTC day.
The global cap reserves some room in Brevo Free's 300 sends/day allowance; it
does not measure other mail sent outside this feature or Brevo's own quota.

New passwords require at least eight characters and at most 72 UTF-8 bytes
(bcrypt's input limit). Password updates use a conditional write. Successful
reset increments `authVersion`; required and optional auth paths reject older
sessions. Existing cookies with no version remain valid on accounts that have
not reset their password. Users must log in again after resetting.

Tests use model and email mocks. They do not load `.env`, connect to MongoDB,
send real email or verify the production sender/key. A successful API send
means Brevo accepted the message, not that inbox delivery is guaranteed.
