const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Import SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
// TLS certificate validation: false allows self-signed certs (default for development)
// Set SMTP_REJECT_UNAUTHORIZED=true in .env to enforce strict certificate validation (production)
const SMTP_REJECT_UNAUTHORIZED = process.env.SMTP_REJECT_UNAUTHORIZED === 'true';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
    // Check if email is configured
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
        console.warn('Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in .env file.');
        return null;
    }

    // Default to false (allow self-signed certs) unless explicitly set to true
    const rejectUnauthorized = SMTP_REJECT_UNAUTHORIZED;
    
    console.log(`Email service configured: ${SMTP_HOST}:${SMTP_PORT}, rejectUnauthorized: ${rejectUnauthorized}`);
    
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASSWORD
        },
        tls: {
            // rejectUnauthorized: false allows self-signed certificates (useful for development)
            // rejectUnauthorized: true enforces proper certificate validation (production)
            rejectUnauthorized: rejectUnauthorized
        }
    });
};

const transporter = createTransporter();
const fromEmail = SMTP_FROM || SMTP_USER || 'noreply@collegebuddy.com';

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} options.text - Plain text email body (optional)
 * @returns {Promise<Object>} - Result object with success status
 */
async function sendEmail({ to, subject, html, text }) {
    if (!transporter) {
        // Log email instead of sending if SMTP is not configured
        console.log('=== EMAIL (NOT SENT - SMTP not configured) ===');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Body:', text || html);
        return {
            success: false,
            message: 'Email service not configured',
            info: { messageId: 'not-sent' }
        };
    }

    try {
        const mailOptions = {
            from: fromEmail,
            to: to,
            subject: subject,
            html: html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return {
            success: true,
            message: 'Email sent successfully',
            info: info
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            message: 'Failed to send email',
            error: error.message
        };
    }
}

/**
 * Send RSVP confirmation email
 * @param {Object} options - Email options
 * @param {string} options.userEmail - User's email address
 * @param {string} options.userName - User's name (optional)
 * @param {string} options.eventTitle - Event title
 * @param {string} options.eventDescription - Event description (optional)
 * @param {string} options.eventLocation - Event location (optional)
 * @param {Date} options.eventStartTime - Event start time
 * @param {Date} options.eventEndTime - Event end time
 * @param {string} options.rsvpStatus - RSVP status ('going', 'maybe', 'not_going')
 * @param {string} options.eventUrl - URL to view event details (optional)
 * @returns {Promise<Object>} - Result object with success status
 */
async function sendRsvpConfirmationEmail({
    userEmail,
    userName,
    eventTitle,
    eventDescription,
    eventLocation,
    eventStartTime,
    eventEndTime,
    rsvpStatus,
    eventUrl
}) {
    const statusLabels = {
        'going': 'Going',
        'maybe': 'Maybe',
        'not_going': 'Not Going'
    };

    const statusMessages = {
        'going': 'You are confirmed to attend this event.',
        'maybe': 'You have marked yourself as maybe attending this event.',
        'not_going': 'You have indicated that you will not be attending this event.'
    };

    const statusLabel = statusLabels[rsvpStatus] || 'RSVPed';
    const statusMessage = statusMessages[rsvpStatus] || 'Your RSVP has been recorded.';

    // Format dates
    const startDate = new Date(eventStartTime);
    const endDate = new Date(eventEndTime);
    const formattedStart = startDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const formattedEnd = endDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const subject = `RSVP Confirmation: ${statusLabel} - ${eventTitle}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSVP Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4CAF50;
            margin: 0;
            font-size: 24px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .status-going {
            background-color: #4CAF50;
            color: white;
        }
        .status-maybe {
            background-color: #FF9800;
            color: white;
        }
        .status-not-going {
            background-color: #f44336;
            color: white;
        }
        .event-details {
            background-color: #f9f9f9;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            margin: 20px 0;
        }
        .event-details h2 {
            margin-top: 0;
            color: #333;
        }
        .detail-item {
            margin: 10px 0;
        }
        .detail-label {
            font-weight: bold;
            color: #666;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RSVP Confirmation</h1>
        </div>
        
        <p>Hello${userName ? ` ${userName}` : ''},</p>
        
        <p>${statusMessage}</p>
        
        <div style="text-align: center;">
            <span class="status-badge status-${rsvpStatus.replace('_', '-')}">
                ${statusLabel}
            </span>
        </div>
        
        <div class="event-details">
            <h2>${eventTitle}</h2>
            ${eventDescription ? `<p>${eventDescription}</p>` : ''}
            <div class="detail-item">
                <span class="detail-label">Start Time:</span> ${formattedStart}
            </div>
            <div class="detail-item">
                <span class="detail-label">End Time:</span> ${formattedEnd}
            </div>
            ${eventLocation ? `
            <div class="detail-item">
                <span class="detail-label">Location:</span> ${eventLocation}
            </div>
            ` : ''}
        </div>
        
        ${eventUrl ? `
        <div style="text-align: center;">
            <a href="${eventUrl}" class="button">View Event Details</a>
        </div>
        ` : ''}
        
        <p>Thank you for your RSVP!</p>
        
        <div class="footer">
            <p>This is an automated email from CollegeBuddy.</p>
            <p>If you have any questions, please contact the event organizer.</p>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
RSVP Confirmation: ${statusLabel}

Hello${userName ? ` ${userName}` : ''},

${statusMessage}

Event Details:
${eventTitle}
${eventDescription ? `\n${eventDescription}\n` : ''}
Start Time: ${formattedStart}
End Time: ${formattedEnd}
${eventLocation ? `Location: ${eventLocation}\n` : ''}

${eventUrl ? `View event details: ${eventUrl}\n` : ''}

Thank you for your RSVP!

---
This is an automated email from CollegeBuddy.
If you have any questions, please contact the event organizer.
    `;

    return await sendEmail({
        to: userEmail,
        subject: subject,
        html: html,
        text: text
    });
}

module.exports = {
    sendEmail,
    sendRsvpConfirmationEmail
};

