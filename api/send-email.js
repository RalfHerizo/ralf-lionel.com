import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import Busboy from 'busboy';

dotenv.config();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed'
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip']);

export const config = {
  api: {
    bodyParser: false
  }
};

function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const fields = {};
    const files = [];
    let totalSize = 0;

    const fail = (statusCode, message) => {
      if (finished) return;
      finished = true;
      const err = new Error(message);
      err.statusCode = statusCode;
      reject(err);
    };

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: MAX_FILE_SIZE
      }
    });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, file, info) => {
      const filename = info?.filename || '';
      const mimeType = info?.mimeType || '';
      const extension = filename.split('.').pop().toLowerCase();

      if (!filename) {
        file.resume();
        return;
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType) || !ALLOWED_EXTENSIONS.has(extension)) {
        file.resume();
        fail(400, 'Unsupported file type');
        return;
      }

      const chunks = [];

      file.on('data', (data) => {
        totalSize += data.length;

        if (totalSize > MAX_TOTAL_SIZE) {
          file.resume();
          fail(413, 'Total upload size exceeded');
          return;
        }

        chunks.push(data);
      });

      file.on('limit', () => {
        fail(413, 'File size exceeded');
      });

      file.on('end', () => {
        if (finished) return;
        files.push({
          filename,
          contentType: mimeType,
          content: Buffer.concat(chunks)
        });
      });
    });

    busboy.on('error', (err) => {
      fail(500, err.message || 'Upload error');
    });

    busboy.on('finish', () => {
      if (finished) return;
      finished = true;
      resolve({ fields, files });
    });

    req.pipe(busboy);
  });
}

export default async function handler(req, res) {
  // Define les headers CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Traiter les requests OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Seulement POST accepted
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseMultipartForm(req);
    const { name, email, category, message } = fields;

    // Validation des champs obligatoires
    if (!name || !email || !category || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'category', 'message']
      });
    }

    // Validation simple de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Ensure que les variables environment sont définies
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
      console.error('Missing Gmail credentials in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Configurer Nodemailer avec Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD, // Mot de passe d'application Gmail
      },
    });

    // Build le contenu HTML de l'email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; margin-top: 15px; }
            .value { margin-top: 5px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📧 New message from portfolio</h2>
            </div>
            <div class="content">
              <div class="label">👤 Name:</div>
              <div class="value">${name}</div>

              <div class="label">📧 Email:</div>
              <div class="value">${email}</div>

              <div class="label">📌 Subject:</div>
              <div class="value">${category}</div>

              <div class="label">💬 Message:</div>
              <div class="value">${message.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER,
      subject: `Portfolio - Nouveau message de ${name}`,
      html: htmlContent,
      replyTo: email,
      text: `Nom: ${name}\nEmail: ${email}\nSujet: ${category}\n\nMessage:\n${message}`,
      attachments: files.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType
      }))
    });

    console.log('Email sent successfully:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully !',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: 'Erreur lors de l\'envoi du message',
      details: process.env.NODE_ENV === 'development' ? error.Message: 'Please try again later'
    });
  }
}


