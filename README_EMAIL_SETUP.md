# Email Service Setup

This application includes email functionality for RSVP confirmations. To enable email sending, you need to configure SMTP settings in your `.env` file.

## Configuration

Add the following environment variables to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # Your SMTP server hostname
SMTP_PORT=587                      # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com     # Your SMTP username/email
SMTP_PASSWORD=your-app-password    # Your SMTP password or app password
SMTP_FROM=noreply@collegebuddy.com # From email address (optional, defaults to SMTP_USER)
SMTP_REJECT_UNAUTHORIZED=false     # Set to 'true' to reject self-signed certificates (default: false for development)
```

## Email Provider Examples

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
```

**Note:** For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password)

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Other SMTP Providers
Most email providers support SMTP. Check your provider's documentation for:
- SMTP server hostname
- Port (usually 587 for TLS or 465 for SSL)
- Authentication requirements

## TLS Certificate Issues

If you encounter a "self-signed certificate in certificate chain" error:

1. **For Development/Testing**: Set `SMTP_REJECT_UNAUTHORIZED=false` in your `.env` file (this is the default)
2. **For Production**: Set `SMTP_REJECT_UNAUTHORIZED=true` to enforce proper certificate validation

```env
SMTP_REJECT_UNAUTHORIZED=false  # Allows self-signed certs (development)
# or
SMTP_REJECT_UNAUTHORIZED=true   # Rejects self-signed certs (production)
```

## Testing Without SMTP

If SMTP is not configured, the application will:
- Still function normally (RSVPs will work)
- Log email content to the console instead of sending
- Not fail RSVP requests if email sending fails

## Email Features

When a user RSVPs to an event, they will receive a confirmation email with:
- RSVP status (Going, Maybe, Not Going)
- Event details (title, description, location, time)
- Link to view event details

The email is sent asynchronously and will not block the RSVP request if it fails.

