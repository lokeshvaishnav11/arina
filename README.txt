ARINA NODE.JS + MYSQL ADMIN

Requirements:
- Node.js 18+
- MySQL 8+
- Hosting/VPS that supports Node.js

Install:
1. Import setup.sql into MySQL.
2. Copy .env.example to .env and enter DB credentials + a long SESSION_SECRET.
3. Run: npm install
4. Create admin:
   npm run create-admin -- admin ChangeMe123!
5. Seed all 400 profiles:
   npm run seed
6. Start:
   npm start
7. Open:
   Website: http://YOUR-DOMAIN/
   Admin:   http://YOUR-DOMAIN/admin

Default example admin:
Username: admin
Password: ChangeMe123!
Change it immediately after first login.

Features:
- Secure admin login using bcrypt password hashes
- Session-based admin authentication
- Change password from admin UI
- 400 profiles stored in MySQL
- Edit profile name/age/city/country/status/image URL
- Image URL live preview
- Registered users table
- Online users based on last_seen
- User-wise total payment amount
- Payment history and totals
- API endpoints for profiles, heartbeat, pending payment creation

Real PIX:
Do not mark a PIX payment paid from browser JavaScript.
Use a real PIX provider webhook on the server, validate its signature/reference,
then update payments.status to "paid". The current project gives the database
and API structure but does not contain provider credentials or a provider-specific webhook.
