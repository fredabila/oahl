# OAHL Developer Portal & CLI Updates

## 1. Developer Portal Enhancements
- **Portal Mode Switcher**: Added a role switcher in the sidebar to toggle between **Developer** and **Provider** views.
- **Provider Dashboard**:
  - **Earnings & Nodes**: Track total revenue, active device counts, and online node status.
  - **My Hardware**: Dedicated view for providers to monitor their own connected devices and individual device earnings.
- **Refresh Buttons**: Added "Refresh" buttons with loading spinners to all data-heavy views (Agents, Hardware, Billing, Earnings).
- **Elegant UI**: Refined the dashboard with glassmorphism effects, consistent spacing, and polished stat cards.

## 2. CLI Improvements
- **Provider Authentication**:
  - Added `oahl login` command to link a machine to a Developer Portal account.
  - `oahl start` and `oahl init` now require authentication, ensuring nodes are correctly registered under the provider's email.
  - Credentials (email + 6-digit PIN) are securely stored in a local `.oahl-session.json` file.
- **Linked Registration**: Nodes now automatically report their owner's credentials to the OAHL Cloud for earnings attribution.

## 3. Cloud Backend
- Added `/v1/portal/provider/stats` and `/v1/portal/provider/devices` endpoints.
- Updated node registration to support `owner_email` and `owner_pin` for account linking.
- Simulated earnings logic for hardware nodes.

## Next Steps
- **Production Billing**: Integrate Stripe into the `fundAgent` and provider `payout` logic.
- **Hardware Reservations**: Add a "Reserve" button to the Hardware Explorer.
