# SpecTrace

A web application for tracking and managing specifications across your projects, built with SvelteKit 5 and Firebase.

## Features

- User authentication (sign up, login, logout)
- Project management
- Specification tracking and organization
- Responsive design with TailwindCSS

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd spectrace
```

2. Install dependencies
```bash
npm install
```

3. Configure Firebase

Edit the `src/lib/firebase.js` file with your Firebase project credentials. You'll need to create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/) and enable the following services:
- Authentication with Email/Password
- Firestore Database
- Storage (optional)

Replace the placeholder values in the firebase.js file with your actual Firebase configuration:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5173.

### Building for Production

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
spectrace/
├── src/
│   ├── lib/
│   │   ├── firebase.js   # Firebase configuration
│   │   └── index.js      # Library exports
│   ├── routes/
│   │   ├── +layout.svelte  # Main layout
│   │   ├── +page.svelte    # Home page
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   └── app.html            # HTML template
├── static/                # Static assets
├── svelte.config.js       # Svelte configuration
└── vite.config.js         # Vite configuration
```

## Technologies Used

- [SvelteKit 5](https://kit.svelte.dev/)
- [Firebase](https://firebase.google.com/)
- [TailwindCSS](https://tailwindcss.com/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
