# Portfolio (Vercel)

Static portfolio hosted on Vercel with a serverless contact API.

## Local setup

1. Copy `env.example` to `.env.local`
2. Fill in `GMAIL_USER`, `GMAIL_PASSWORD`, `RECIPIENT_EMAIL`

## Development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Import the repo in Vercel
2. Add the environment variables from `.env.local`
3. Deploy

## Contact API

- Endpoint: `POST /api/send-email`
- Form data: `name`, `email`, `category`, `message`, `file_attach[]`
- Attachments allowed: pdf, doc, docx, jpg, jpeg, png, zip
- Limits: 10MB per file, 15MB total
