# WordPress Portal Manager

A web application to manage multiple WordPress sites and their login credentials in one place.

## Project Structure

```text
manage-wordpress/
├── css/
│   └── styles.css       # All styling for the application
├── js/
│   └── app.js           # JavaScript functionality and WordPressManager class
├── img/
│   └── favicon.svg      # Application favicon
├── index.html           # Main HTML structure
└── README.md            # This documentation file
```

## Features

- Add and store WordPress admin portal credentials
- Auto-login to WordPress admin with a single click in a new tab
- Loading indicator screen during login process
- Comprehensive automatic handling of WordPress cookie errors with multiple fix techniques
- Auto-refresh with smart continuation for seamless login experience
- Visual progress feedback for login attempts
- Securely store credentials in the browser's localStorage
- Clean, responsive UI for managing multiple WordPress sites

## How to Use

1. Open `index.html` in a web browser
2. Add your WordPress sites with their credentials
3. Use the "Auto Login" button to quickly access your WordPress admin panels
4. Cookie errors are automatically handled with multiple techniques
5. You can click "Coba Lagi" (Try Again) button if you need alternative login methods
6. Or use "Buka Manual" to open the site manually

## Security Note

Credentials are stored in browser localStorage. This application is intended for personal use on a secure device.
# wp-portal
