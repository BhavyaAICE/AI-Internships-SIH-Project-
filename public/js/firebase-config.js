// js/firebase-config.js - CREATE THIS NEW FILE
        const firebaseConfig = {
            apiKey: "AIzaSyCB_qvrrjHFpkhp953y3Po8jDrbPpBbamc",
            authDomain: "chotu-5ebda.firebaseapp.com",
            projectId: "chotu-5ebda",
            storageBucket: "chotu-5ebda.firebasestorage.app",
            messagingSenderId: "158953678257",
            appId: "1:158953678257:web:469ade2854cdbbb8874990",
            measurementId: "G-9WYNS9VF16"
        };

// Initialize Firebase (only if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Helper functions for user management
const FirebaseHelper = {
    // Get current authenticated user
    getCurrentUser: () => {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    },

    // Get user profile from Firestore
    getUserProfile: async (uid) => {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    // Create or update user profile
    updateUserProfile: async (uid, data) => {
        try {
            await db.collection('users').doc(uid).set(data, { merge: true });
            return true;
        } catch (error) {
            console.error('Error updating user profile:', error);
            return false;
        }
    },

    // Sign out user
    signOut: async () => {
        try {
            await auth.signOut();
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    }
};
