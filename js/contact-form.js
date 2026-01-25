/**
 * Contact form handler for engagement section
 * Handles form submission and displays success/error messages
 */

(function () {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const form = document.querySelector('form[action="/api/contact"]');
    if (!form) return;

    form.addEventListener('submit', handleSubmit);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      // Prepare form data
      const formData = new FormData(form);

      // Send to Cloudflare Pages Function
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Success
        showMessage('✓ Message sent! We will get back to you soon.', 'success');
        form.reset();
        submitBtn.textContent = 'Message sent!';
        submitBtn.disabled = true;

        // Reset after 3 seconds
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }, 3000);
      } else {
        // Error from server
        showMessage(result.error || 'Failed to send message. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showMessage('Network error. Please check your connection and try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  function showMessage(text, type) {
    // Remove existing message if any
    const existing = document.querySelector('.form-message');
    if (existing) {
      existing.remove();
    }

    // Create message element
    const message = document.createElement('div');
    message.className = `form-message form-message--${type}`;
    message.textContent = text;

    // Add styles dynamically if needed
    if (!document.querySelector('style[data-form-messages]')) {
      const style = document.createElement('style');
      style.setAttribute('data-form-messages', '');
      style.textContent = `
        .form-message {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 14px;
          animation: slideDown 0.3s ease-out;
        }

        .form-message--success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .form-message--error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Insert message before the form
    const form = document.querySelector('form[action="/api/contact"]');
    if (form) {
      form.parentNode.insertBefore(message, form);
    }

    // Auto-remove error messages after 5 seconds
    if (type === 'error') {
      setTimeout(() => {
        message.remove();
      }, 5000);
    }
  }
})();
