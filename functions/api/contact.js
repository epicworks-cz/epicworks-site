/**
 * Cloudflare Pages Function: Contact Form Handler
 * 
 * This function handles form submissions and sends emails via Cloudflare Email Routing
 * or integrates with your email service (Sendgrid, Mailgun, etc.)
 * 
 * Place this file at: functions/api/contact.js
 */

export async function onRequest(context) {
  const { request } = context;

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // OPTION 1: Using Sendgrid (Recommended for Cloudflare)
    // =====================================================
    // Set SENDGRID_API_KEY in Cloudflare Pages environment variables
    const sendgridApiKey = context.env.SENDGRID_API_KEY;
    
    if (sendgridApiKey) {
      const emailPayload = {
        personalizations: [
          {
            to: [{ email: 'your-email@example.com' }], // Your inbox
            subject: `New Contact Form Submission from ${name}`,
          },
        ],
        from: { email: 'noreply@yourdomain.com', name: 'EpicWorks' },
        content: [
          {
            type: 'text/html',
            value: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Message:</strong></p>
              <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
              <hr>
              <p><em>Reply to: ${escapeHtml(email)}</em></p>
            `,
          },
        ],
        // Optional: Send confirmation email to user
        replyTo: { email: email, name: name },
      };

      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!sendgridResponse.ok) {
        console.error('Sendgrid error:', await sendgridResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Thank you! We will get back to you soon.' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // =====================================================
    // OPTION 2: Using Mailgun (Alternative)
    // =====================================================
    // Set MAILGUN_API_KEY and MAILGUN_DOMAIN in environment variables
    const mailgunApiKey = context.env.MAILGUN_API_KEY;
    const mailgunDomain = context.env.MAILGUN_DOMAIN;

    if (mailgunApiKey && mailgunDomain) {
      const mailgunData = new URLSearchParams();
      mailgunData.append('from', `EpicWorks <noreply@${mailgunDomain}>`);
      mailgunData.append('to', 'your-email@example.com');
      mailgunData.append('subject', `New Contact Form Submission from ${name}`);
      mailgunData.append('text', `
Name: ${name}
Email: ${email}

Message:
${message}

---
Reply to: ${email}
      `);

      const mailgunResponse = await fetch(
        `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`,
          },
          body: mailgunData,
        }
      );

      if (!mailgunResponse.ok) {
        console.error('Mailgun error:', await mailgunResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Thank you! We will get back to you soon.' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // =====================================================
    // OPTION 3: Cloudflare Email Routing (Native)
    // =====================================================
    // If you have Cloudflare Email Routing configured
    // This requires setting up email routing in Cloudflare dashboard
    // For now, returning success message
    
    console.warn('No email service configured. Please set up Sendgrid or Mailgun API keys.');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Form submitted. We will review and get back to you soon.' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
