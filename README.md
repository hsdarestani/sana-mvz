# Sana MVZ Frankfurt Karriere

Premium recruitment landing page for Sana MVZ Orthopädie und Chirurgie Frankfurt, prepared for Cloudflare Pages.

## Cloudflare Pages

Build command: leave empty

Build output directory: public

## Application form

The upload form uses a Cloudflare Pages Function at `/api/apply`.

Set these environment variables in Cloudflare Pages:

`RESEND_API_KEY`

`APPLICATION_TO_EMAIL` optional, defaults to info@ortho-frankfurt.de

`APPLICATION_FROM_EMAIL` required for production, for example a verified sender such as bewerbung@your-domain.de

Accepted CV formats: PDF, DOC, DOCX

Maximum CV size: 5 MB
