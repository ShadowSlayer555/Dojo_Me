import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import emailjs from '@emailjs/nodejs';
import { db, initDb } from './src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large website configurations
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- API Routes ---

  // Auth: Register (Step 1: Create unverified account and send email)
  app.post('/api/auth/register', async (req, res) => {
    const { email, username, password, profile_picture } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    try {
      const existingUserResult = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ? OR username = ?',
        args: [email, username]
      });
      const existingUser = existingUserResult.rows[0] as any;

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = bcrypt.hashSync(password, 10);
      const pic = profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

      if (existingUser) {
        if (existingUser.is_verified) {
          return res.status(400).json({ error: 'Username or email already exists' });
        } else {
          // Check 10 minute cooldown
          if (existingUser.last_email_sent_at) {
            const lastSent = new Date(existingUser.last_email_sent_at + 'Z').getTime();
            const now = Date.now();
            if (now - lastSent < 10 * 60 * 1000) {
              const minutesLeft = Math.ceil((10 * 60 * 1000 - (now - lastSent)) / 60000);
              return res.status(429).json({ error: `Please wait ${minutesLeft} minutes before requesting a new code.` });
            }
          }
          // Update unverified user
          await db.execute({
            sql: 'UPDATE users SET username = ?, password_hash = ?, profile_picture = ?, two_factor_secret = ?, last_email_sent_at = CURRENT_TIMESTAMP WHERE email = ?',
            args: [username, hash, pic, code, email]
          });
        }
      } else {
        // Insert new unverified user
        await db.execute({
          sql: 'INSERT INTO users (email, username, password_hash, profile_picture, two_factor_secret, is_verified, last_email_sent_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
          args: [email, username, hash, pic, code]
        });
      }

      // Send email
      try {
        if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_2FA_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
          await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_2FA_TEMPLATE_ID,
            { 
              to_email: email, 
              code: code,
              app: 'Dojo Me',
              name: username,
              email: email
            },
            { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY }
          );
        } else {
          console.log(`[DEV MODE] Verification Code for ${email}: ${code}`);
        }
      } catch (err) {
        console.error('Failed to send email via EmailJS:', err);
      }

      res.json({ requireVerification: true, email });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Auth: Resend Verification Email
  app.post('/api/auth/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      const userResult = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email]
      });
      const user = userResult.rows[0] as any;
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.is_verified) return res.status(400).json({ error: 'User is already verified' });

      if (user.last_email_sent_at) {
        const lastSent = new Date(user.last_email_sent_at + 'Z').getTime();
        const now = Date.now();
        if (now - lastSent < 10 * 60 * 1000) {
          const minutesLeft = Math.ceil((10 * 60 * 1000 - (now - lastSent)) / 60000);
          return res.status(429).json({ error: `Please wait ${minutesLeft} minutes before requesting a new code.` });
        }
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await db.execute({
        sql: 'UPDATE users SET two_factor_secret = ?, last_email_sent_at = CURRENT_TIMESTAMP WHERE email = ?',
        args: [code, email]
      });

      try {
        if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_2FA_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
          await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_2FA_TEMPLATE_ID,
            { 
              to_email: email, 
              code: code,
              app: 'Dojo Me',
              name: user.username,
              email: email
            },
            { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY }
          );
        } else {
          console.log(`[DEV MODE] Verification Code for ${email}: ${code}`);
        }
      } catch (err) {
        console.error('Failed to send email via EmailJS:', err);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Auth: Login (Direct login, no 2FA)
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields.' });
    }
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    const user = userResult.rows[0] as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email first. Switch to Register to resend the code.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ id: user.id, email: user.email, username: user.username, profile_picture: user.profile_picture });
  });

  // Auth: Verify Email (Step 2 of Registration)
  app.post('/api/auth/verify-email', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Missing fields.' });
    }
    
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    const user = userResult.rows[0] as any;
    
    if (!user || user.two_factor_secret !== code) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Mark as verified and clear the code
    await db.execute({
      sql: 'UPDATE users SET is_verified = 1, two_factor_secret = NULL WHERE id = ?',
      args: [user.id]
    });

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ id: user.id, email: user.email, username: user.username, profile_picture: user.profile_picture });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const userResult = await db.execute({
      sql: 'SELECT id, email, username, profile_picture FROM users WHERE id = ?',
      args: [req.user.id]
    });
    res.json(userResult.rows[0]);
  });
  
  // Users: Update Profile
  app.put('/api/users/me', authenticate, async (req: any, res) => {
    const { password, profile_picture } = req.body;
    try {
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        await db.execute({
          sql: 'UPDATE users SET password_hash = ?, profile_picture = ? WHERE id = ?',
          args: [hash, profile_picture, req.user.id]
        });
      } else {
        await db.execute({
          sql: 'UPDATE users SET profile_picture = ? WHERE id = ?',
          args: [profile_picture, req.user.id]
        });
      }
      
      const userResult = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
      });
      const user = userResult.rows[0] as any;
      res.json({ id: user.id, email: user.email, username: user.username, profile_picture: user.profile_picture });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // User's latest config
  app.get('/api/config/me', authenticate, async (req: any, res) => {
    try {
      const result = await db.execute({
        sql: 'SELECT config_json FROM websites WHERE email = ? ORDER BY created_at DESC LIMIT 1',
        args: [req.user.email]
      });
      if (result.rows.length > 0) {
        res.json({ config: JSON.parse(result.rows[0].config_json as string) });
      } else {
        res.json({ config: null });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  // API Route: Publish Website Configuration
  app.post('/api/publish', authenticate, async (req: any, res) => {
    const { existingUrl, config } = req.body;
    const email = req.user.email;
    
    // Generate a clear, identifiable ID for Turso
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const siteId = `site_${timestamp}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      // =====================================================================
      // 1. TURSO DATABASE INTEGRATION
      // =====================================================================
      console.log(`[Backend] Saving site ${siteId} to Turso...`);
      await db.execute({
        sql: "INSERT INTO websites (id, email, config_json) VALUES (?, ?, ?)",
        args: [siteId, email, JSON.stringify(config)]
      });
      console.log(`[Backend] Successfully saved to Turso.`);

      // =====================================================================
      // 2. EMAILJS INTEGRATION
      // =====================================================================
      const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
      const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
      const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
      const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY; // For secure backend calls

      if (emailjsServiceId && emailjsTemplateId) {
        console.log(`[Backend] Sending notification email to admin via EmailJS...`);
        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: emailjsServiceId,
            template_id: emailjsTemplateId,
            user_id: emailjsPublicKey,
            accessToken: emailjsPrivateKey,
            template_params: {
              user_email: email,
              db_id: siteId,
              existing_url: existingUrl || 'None'
            }
          })
        });
        
        if (!emailResponse.ok) {
          const errText = await emailResponse.text();
          console.error(`[Backend] EmailJS Error:`, errText);
        } else {
          console.log(`[Backend] Successfully sent email via EmailJS.`);
        }
      } else {
        console.log(`[Backend] EMAILJS credentials missing. Simulating email send...`);
      }

      res.json({ 
        success: true, 
        siteId, 
        message: 'Successfully saved to database and notified admin.' 
      });
    } catch (error) {
      console.error('[Backend] Publish error:', error);
      res.status(500).json({ success: false, error: 'Failed to publish website.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
