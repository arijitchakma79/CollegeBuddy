# College Buddy

Your all-in-one platform for campus connections, organizations, and events. College Buddy helps students discover and join campus organizations, stay connected with events, and build their campus community.

## Features

### 🏛️ Organizations
- Discover and join campus organizations
- Create your own organization
- Manage organization memberships with role-based access (admin/member)
- Search organizations by name
- View organization details and member counts

### 📅 Events
- Browse upcoming and past events
- Create events for your organizations
- RSVP to events
- View event details and attendees
- Event management for organization admins

### 👤 User Profiles
- Build your personal profile
- Showcase your interests and memberships
- Track your involvement across campus
- Connect with other students and organizations

### 💳 Payments
- Stripe integration for event payments
- Secure payment processing
- Webhook support for payment events

### 🔐 Authentication
- User registration and login
- Secure session management
- Protected routes and API endpoints

## Tech Stack

### Backend
- **Node.js** with **Express.js** - Server framework
- **Supabase** - Database and authentication
- **Stripe** - Payment processing
- **Nodemailer** - Email service
- **Cookie Parser** - Session management
- **Node-cron** - Scheduled tasks

### Frontend
- **HTML/CSS/JavaScript** - Client-side application
- Responsive design with modern UI

### Deployment
- **Docker** - Containerization
- **Fly.io** - Cloud hosting platform

## Project Structure

```
CollegeBuddy/
├── client/                 # Frontend application
│   ├── auth/              # Authentication pages
│   ├── protected/         # Protected pages (dashboard, events, etc.)
│   ├── css/               # Stylesheets
│   └── js/                # Client-side JavaScript
├── server/                # Backend application
│   ├── api/               # API route handlers
│   ├── middleware/        # Express middleware
│   ├── routes/             # Page routes
│   ├── services/          # External service integrations
│   ├── utils/             # Utility functions
│   └── server.js          # Main server file
├── Dockerfile             # Docker configuration
├── fly.toml              # Fly.io deployment config
└── package.json          # Dependencies and scripts
```

## Prerequisites

- Node.js (v20.18.0 or higher)
- npm or yarn
- Supabase account and project
- Stripe account (for payments)
- Email service credentials (for Nodemailer)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CollegeBuddy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server/` directory with the following variables:
   ```env
   # Supabase Configuration
   SUPABASE_PROJECT_URL=your_supabase_project_url
   SUPABASE_API_KEY=your_supabase_api_key
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   
   # Email Configuration (Nodemailer)
   EMAIL_HOST=your_email_host
   EMAIL_PORT=587
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password
   ```

4. **Set up Supabase Database**
   
   Ensure your Supabase project has the following tables:
   - `users` - User accounts
   - `organizations` - Campus organizations
   - `organization_memberships` - User-organization relationships
   - `events` - Event listings
   - `event_rsvps` - Event RSVPs

## Running the Application

### Development Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

### Production Mode

The application is configured for deployment with Docker and Fly.io.

#### Using Docker

```bash
docker build -t collegebuddy .
docker run -p 3000:3000 collegebuddy
```

#### Using Fly.io

```bash
fly deploy
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Organizations
- `GET /api/organizations` - Get all organizations
- `GET /api/organizations/:id` - Get organization by ID
- `GET /api/organizations/search?name=...` - Search organizations
- `POST /api/organizations/create` - Create new organization (authenticated)
- `PUT /api/organizations/:id` - Update organization (admin only)
- `DELETE /api/organizations/:id` - Delete organization (admin only)

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events/create` - Create new event (authenticated)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)
- `POST /api/events/:id/rsvp` - RSVP to an event
- `DELETE /api/events/:id/rsvp` - Cancel RSVP

### Memberships
- `GET /api/memberships` - Get user's memberships
- `POST /api/memberships/join` - Join an organization
- `DELETE /api/memberships/:id` - Leave an organization

### Payments
- `POST /api/payments/create-checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler

## Page Routes

- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/protected/home` - Dashboard/home page
- `/protected/profile` - User profile page
- `/protected/organizations` - Organizations listing
- `/protected/organizations/:id` - Organization details
- `/protected/events` - Events listing
- `/protected/events/:id` - Event details

## Development

### Adding New Features

1. **Backend API**: Add routes in `server/api/` or `server/routes/`
2. **Frontend Pages**: Add HTML files in `client/protected/` or `client/auth/`
3. **Client-side Logic**: Add JavaScript files in `client/js/`
4. **Styling**: Add CSS files in `client/css/`

### Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:
- Users, Organizations, Organization Memberships, Events, Event RSVPs

Refer to your Supabase dashboard for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on the repository.

---

Built with ❤️ for college students everywhere.

