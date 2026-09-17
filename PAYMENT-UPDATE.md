# Payment + doctor UPI update

## Replace/copy these files into your Codespaces repository

This patch adds:
- Doctor PIN session authentication (existing) plus UPI ID captured at login.
- Token price and UPI ID in clinic settings.
- 1-5 patients per online payment (`count x price`).
- Exact-amount UPI QR/deep link.
- UTR/reference submission by patient.
- Doctor payment-confirmation queue.
- Tokens are allocated only after staff confirms the payment.
- The old unauthenticated `/api/public/tokens` direct-token endpoint is disabled.

## After copying the files

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Local URLs:
- Patient: `/clinic`
- Doctor: `/doctor/login`
- Default development PIN: `2468`

## Important payment behavior

This pilot sends money directly to the doctor's UPI ID. A plain UPI QR does not provide your web app with authoritative payment-success data. Therefore the patient submits the UPI transaction/UTR reference and clinic staff verifies the payment in their UPI/bank app before pressing **Confirm payment**. Only that action creates queue tokens.

For fully automatic verification later, replace this manual confirmation with a payment provider integration and signed webhook verification.
