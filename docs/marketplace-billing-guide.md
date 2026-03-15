# 💰 OAHL Marketplace & Billing Guide

This guide explains how to attach pricing models to your physical hardware, turning your OAHL Node into a revenue-generating provider.

## 1. How Pricing Works in OAHL

The OAHL architecture supports a decentralized marketplace model. Instead of a single central bank, you (the Hardware Provider) declare your price and your wallet address. When an AI Agent wants to use your hardware, it is responsible for fulfilling that payment contract.

You can set pricing in two ways:
1. **Pay-per-Time (Metered Sessions):** Agents pay based on how long they hold a session lock on your hardware.
2. **Pay-per-Action (Execution Fees):** Agents pay a flat fee every time they successfully execute a capability (e.g., $0.10 per photo).

---

## 2. Setting Up Pricing in your Configuration

To start charging for your hardware, simply add a `pricing` block to your device in `oahl-config.json`.

```json
{
  "devices": [
    {
      "id": "premium-microscope-01",
      "type": "microscope",
      "pricing": {
        "currency": "USD",
        "rate_per_minute": 0.50,
        "rate_per_execution": 0.05,
        "payment_address": "acct_1032D82eB69" // e.g., Stripe Connect ID or Ethereum Wallet
      }
    }
  ]
}
```

### The Pricing Fields
*   `currency`: The currency code (e.g., `USD`, `EUR`, `USDC`).
*   `rate_per_minute`: (Optional) The cost to hold an active session for 60 seconds.
*   `rate_per_execution`: (Optional) The cost every time the `/execute` endpoint is called.
*   `payment_address`: The destination where the agent (or the cloud relay's ledger) should send the funds.

---

## 3. How AI Agents Handle Payments

When you set a price, the OAHL Cloud Registry automatically exposes this metadata in the `/v1/capabilities` discovery endpoint.

1.  **Discovery:** The AI Agent searches for a device and sees your pricing block.
2.  **Consent:** The Agent's internal logic (the `hardware.SKILL.md`) instructs it to verify it has the budget.
3.  **Payment/Ledger:** 
    *   *If you are using a managed Cloud Relay:* The cloud relay intercepts the `/execute` request, checks the Agent's identity headers (`x-agent-id`, `x-agent-org-id`), deducts the amount from the Agent's cloud balance, credits your `payment_address`, and then forwards the command to your node.
    *   *If you are using direct peer-to-peer:* The agent must include proof-of-payment in the payload.

---

## 4. Tracking Agent Identities

As a hardware provider, you might want to know *who* is using your hardware and who paid for it.

The OAHL Cloud tracks agent identities using standard headers:
*   `x-agent-id`: A unique string identifying the specific AI instance.
*   `x-agent-org-id`: The tenant or company that owns the agent.

When an execution completes, the cloud's ledger records a transaction tying the `operation_id` to the `x-agent-id` and your `node_id`. You can view this data in your Cloud Dashboard to audit your earnings.
