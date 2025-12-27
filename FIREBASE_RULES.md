# Firebase Configuration Guide

To ensure your app works perfectly and data is secure (so only Admin can change content, but Students can save their progress), you must set up **Firebase Security Rules**.

## 1. Realtime Database Rules
Go to **Firebase Console** -> **Build** -> **Realtime Database** -> **Rules**.
Paste this:

```json
{
  "rules": {
    "users": {
      "$uid": {
        // Users can read/write their own data
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'ADMIN'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
      }
    },
    "content_data": {
      // Only Admin can write content, everyone can read
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
    },
    "redeem_codes": {
      // Admin writes, Users can read to check validity and write to mark redeemed
      ".read": true,
      ".write": true
    },
    "system_settings": {
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
    },
    "content_links": {
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
    }
  }
}
```

## 2. Firestore Rules (Cloud Firestore)
Go to **Firebase Console** -> **Build** -> **Firestore Database** -> **Rules**.
Paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User Profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN');
    }
    
    // Content Data (Chapters, Links)
    match /content_data/{docId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
    
    // Redeem Codes
    match /redeem_codes/{code} {
      allow read, write: if true; // Needs to be writable by users to mark as redeemed
    }
    
    // Config
    match /config/{docId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
  }
}
```

## 3. Storage Rules (If you use Storage for PDFs)
Go to **Storage** -> **Rules**.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Or restrict write to Admin
    }
  }
}
```

## Important Note
After pasting these rules, click **Publish**. This ensures your "Admin jo badle student ko dikhe" (Admin updates are visible) and "data save ho jaye" (Persistence) works securely.
