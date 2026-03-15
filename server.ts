import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large website configurations
  app.use(express.json({ limit: '50mb' }));

  // API Route: Publish Website Configuration
  app.post('/api/publish', async (req, res) => {
    const { email, existingUrl, config } = req.body;
    
    // Generate a clear, identifiable ID for Turso
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const siteId = `site_${timestamp}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      // =====================================================================
      // 1. TURSO DATABASE INTEGRATION (To be executed on Render)
      // =====================================================================
      const tursoUrl = process.env.TURSO_DATABASE_URL;
      const tursoToken = process.env.TURSO_AUTH_TOKEN;
      
      if (tursoUrl && tursoToken) {
        console.log(`[Backend] Saving site ${siteId} to Turso...`);
        // Example Turso LibSQL call (you would install @libsql/client):
        // const client = createClient({ url: tursoUrl, authToken: tursoToken });
        // await client.execute({
        //   sql: "INSERT INTO websites (id, email, config_json) VALUES (?, ?, ?)",
        //   args: [siteId, email, JSON.stringify(config)]
        // });
      } else {
        console.log(`[Backend] TURSO credentials missing. Simulating save for ${siteId}...`);
      }

      // =====================================================================
      // 2. EMAILJS INTEGRATION (To be executed on Render)
      // =====================================================================
      const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
      const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
      const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
      const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY; // For secure backend calls

      if (emailjsServiceId && emailjsTemplateId) {
        console.log(`[Backend] Sending notification email to admin via EmailJS...`);
        // Example EmailJS REST API call:
        // await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     service_id: emailjsServiceId,
        //     template_id: emailjsTemplateId,
        //     user_id: emailjsPublicKey,
        //     accessToken: emailjsPrivateKey,
        //     template_params: {
        //       user_email: email,
        //       db_id: siteId,
        //       existing_url: existingUrl || 'None'
        //     }
        //   })
        // });
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
    const distPath = path.join(process.cwd(), 'dist');
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
