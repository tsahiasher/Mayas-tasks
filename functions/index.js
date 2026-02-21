const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * One-time bootstrap function to create the single admin user.
 * Enforces a lock in Firestore so it can only be run once.
 */
exports.bootstrapAdmin = functions.https.onCall(async (data, context) => {
  const { username, password } = data;

  if (!username || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'שם משתמש וסיסמה הם שדות חובה.');
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'הסיסמה חייבת להכיל לפחות 6 תווים.');
  }

  const db = admin.firestore();
  const auth = admin.auth();
  const authDocRef = db.collection('settings').doc('auth');

  try {
    return await db.runTransaction(async (transaction) => {
      const authDoc = await transaction.get(authDocRef);
      
      if (authDoc.exists && authDoc.data().bootstrapped === true) {
        throw new functions.https.HttpsError('already-exists', 'המערכת כבר הוגדרה בעבר.');
      }

      const email = `${username}@local-admin.invalid`;
      
      // Check if user already exists in Auth
      try {
        await auth.getUserByEmail(email);
        throw new functions.https.HttpsError('already-exists', 'שם המשתמש כבר קיים במערכת האימות.');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          console.error("Error checking user existence:", error);
          throw new functions.https.HttpsError('internal', 'שגיאה בבדיקת קיום משתמש.');
        }
      }

      // Create the user
      let user;
      try {
        user = await auth.createUser({
          email,
          password,
          displayName: username
        });
      } catch (error) {
        console.error("Error creating user:", error);
        throw new functions.https.HttpsError('internal', `שגיאה ביצירת המשתמש: ${error.message}`);
      }

      // Set custom claims
      try {
        await auth.setCustomUserClaims(user.uid, { admin: true });
      } catch (error) {
        console.error("Error setting custom claims:", error);
        await auth.deleteUser(user.uid);
        throw new functions.https.HttpsError('internal', 'שגיאה בהגדרת הרשאות מנהל.');
      }

      // Mark as bootstrapped
      transaction.set(authDocRef, { 
        bootstrapped: true,
        adminUid: user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, uid: user.uid, email: user.email };
    });
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("Bootstrap error:", error);
    throw new functions.https.HttpsError('internal', 'שגיאה פנימית בשרת במהלך תהליך ה-Bootstrap.');
  }
});
