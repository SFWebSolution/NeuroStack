// =========================
// auth.js
// =========================

// Firebase references
const auth = firebase.auth();

// Admin email
const ADMIN_EMAIL = "neuro_stack@outlook.com";

// -------------------------
// LOGIN
function loginUser(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      // Save login status
      localStorage.setItem('loggedIn', true);

      // Check if admin
      if (user.email === ADMIN_EMAIL) {
        window.location.href = "admin.html"; // admin dashboard
      } else {
        window.location.href = "home.html"; // normal user home
      }
    })
    .catch((error) => {
      alert(error.message);
    });
}

// -------------------------
// SIGNUP
function signupUser(email, password) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      localStorage.setItem('loggedIn', true);

      // New users go to home
      window.location.href = "home.html";
    })
    .catch((error) => {
      alert(error.message);
    });
}

// -------------------------
// LOGOUT
function logoutUser() {
  auth.signOut()
    .then(() => {
      localStorage.removeItem('loggedIn');
      window.location.href = "login.html";
    })
    .catch((error) => {
      alert(error.message);
    });
}

// -------------------------
// FORGOT PASSWORD
function resetPassword(email) {
  auth.sendPasswordResetEmail(email)
    .then(() => {
      alert("Password reset email sent! Check your inbox.");
    })
    .catch((error) => {
      alert(error.message);
    });
}

// -------------------------
// AUTO LOGIN CHECK (can be used on splash screen)
function checkAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // Check admin
      if (user.email === ADMIN_EMAIL) {
        window.location.href = "admin.html";
      } else {
        window.location.href = "home.html";
      }
    } else {
      window.location.href = "login.html";
    }
  });
}