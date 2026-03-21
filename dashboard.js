// =========================
// UTILITY FUNCTION (FOR LINKS)
// =========================
function linkify(text) {
  if (!text) return "";

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" style="color:#00BFFF; text-decoration:underline;">${url}</a>`;
  });
}


// =========================
// User Dashboard JS
// =========================

// Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// =========================
// DOM Elements
// =========================

const usernameInput = document.getElementById('username-input');
const updateUsernameBtn = document.getElementById('update-username');

const profilePicInput = document.getElementById('profile-pic-input');
const profilePicPreview = document.getElementById('profile-pic-preview');
const updatePicBtn = document.getElementById('update-profile-pic');

const toggleThemeBtn = document.getElementById('toggle-theme');
const logoutBtn = document.getElementById('logout-btn');

const updatesContainer = document.getElementById('updates-container');

const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message');

const reviewInput = document.getElementById('review-input');
const postReviewBtn = document.getElementById('post-review-btn');
const reviewsContainer = document.getElementById('reviews-container');

// HEADER
const headerUsername = document.getElementById('header-username');
const headerProfilePic = document.getElementById('header-profile-pic');
const statusIndicator = document.getElementById('status-indicator');

let currentUser = null;
let currentUsername = "Anonymous";

// =========================
// AUTH
// =========================

auth.onAuthStateChanged(async user => {

  if(!user){
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  const userRef = db.collection("users").doc(user.uid);
  const userDoc = await userRef.get();

  let profilePic = "";

  if(userDoc.exists){
    const data = userDoc.data();
    currentUsername = data.username || "Anonymous";
    profilePic = data.profilePic || "";
  }

  if(headerUsername) headerUsername.textContent = currentUsername;
  if(headerProfilePic && profilePic) headerProfilePic.src = profilePic;

  if(usernameInput) usernameInput.value = currentUsername;
  if(profilePicPreview && profilePic) profilePicPreview.src = profilePic;

  await userRef.set({ status:"online" },{merge:true});

  loadStatus();
  loadUpdates();
  loadMessages();
  loadReviews();
  applyTheme();
});

// =========================
// OFFLINE
// =========================

window.addEventListener("beforeunload", async ()=>{
  if(currentUser){
    await db.collection("users").doc(currentUser.uid).set({
      status:"offline"
    },{merge:true});
  }
});

// =========================
// STATUS
// =========================

function loadStatus(){
  db.collection("users")
  .doc(currentUser.uid)
  .onSnapshot(doc=>{
    if(!doc.exists) return;

    const status = doc.data().status || "offline";

    if(!statusIndicator) return;

    statusIndicator.classList.toggle("online", status==="online");
    statusIndicator.classList.toggle("offline", status!=="online");
  });
}

// =========================
// USERNAME
// =========================

if(updateUsernameBtn){
  updateUsernameBtn.addEventListener("click", async ()=>{
    const newUsername = usernameInput.value.trim();
    if(!newUsername) return alert("Username cannot be empty.");

    await db.collection("users").doc(currentUser.uid).set({
      username:newUsername
    },{merge:true});

    currentUsername = newUsername;
    if(headerUsername) headerUsername.textContent = newUsername;

    alert("Username updated!");
  });
}

// =========================
// PROFILE PIC (SIZE LIMIT)
// =========================

const MAX_FILE_SIZE = 2 * 1024 * 1024;

if(profilePicInput){
  profilePicInput.addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;

    if(file.size > MAX_FILE_SIZE){
      alert("Image too big! Max is 2MB.");
      profilePicInput.value="";
      return;
    }

    const reader = new FileReader();
    reader.onload = ()=>{
      if(profilePicPreview){
        profilePicPreview.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  });
}

if(updatePicBtn){
  updatePicBtn.addEventListener("click", ()=>{
    const file = profilePicInput.files[0];
    if(!file) return alert("Select image first.");

    if(file.size > MAX_FILE_SIZE){
      alert("Image too big! Max is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async ()=>{
      const base64 = reader.result;

      await db.collection("users").doc(currentUser.uid).set({
        profilePic:base64
      },{merge:true});

      if(headerProfilePic) headerProfilePic.src = base64;
      if(profilePicPreview) profilePicPreview.src = base64;

      alert("Profile updated!");
    };

    reader.readAsDataURL(file);
  });
}

// =========================
// LOGOUT
// =========================

if(logoutBtn){
  logoutBtn.addEventListener("click", async ()=>{
    await auth.signOut();
    window.location.href="login.html";
  });
}

// =========================
// THEME
// =========================

function applyTheme(){
  const theme = localStorage.getItem("theme") || "dark";
  if(theme==="light"){
    document.body.classList.add("light-theme");
  }
}

if(toggleThemeBtn){
  toggleThemeBtn.addEventListener("click", ()=>{
    document.body.classList.toggle("light-theme");

    const mode = document.body.classList.contains("light-theme")?"light":"dark";
    localStorage.setItem("theme",mode);
  });
}

// =========================
// UPDATES (FIXED LINKS HERE)
// =========================

function loadUpdates(){

  if(!updatesContainer) return;

  db.collection("updates")
  .orderBy("timestamp","desc")
  .onSnapshot(snapshot=>{

    updatesContainer.innerHTML="";

    snapshot.forEach(doc=>{

      const data = doc.data();
      const updateId = doc.id;

      const card = document.createElement("div");
      card.classList.add("update-card");

      const likesCount = (data.likes || []).length;

      const commentsHTML = (data.comments || []).map(c=>`
        <div class="comment">
          <strong>${c.username}:</strong> ${c.text}
        </div>
      `).join("");

      card.innerHTML = `
        <h3>${data.title}</h3>
        <p>${linkify(data.description)}</p>

        ${data.image ? `<img src="${data.image}" style="width:100%; border-radius:8px;">` : ""}

        ${data.video ? `
          <video controls style="width:100%; border-radius:8px;">
            <source src="${data.video}" type="video/mp4">
          </video>
        ` : ""}

        <button class="like-btn" data-id="${updateId}">
          ❤️ Like (${likesCount})
        </button>

        <div class="comments-section">
          ${commentsHTML}
          <input type="text" class="comment-input" data-id="${updateId}" placeholder="Add comment">
          <button class="comment-btn" data-id="${updateId}">Comment</button>
        </div>
      `;

      updatesContainer.appendChild(card);
    });

    setupUpdateEvents();
  });
}

// =========================
// EVENTS
// =========================

function setupUpdateEvents(){

  document.querySelectorAll(".like-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const ref = db.collection("updates").doc(btn.dataset.id);
      const snap = await ref.get();

      let likes = snap.data().likes || [];
      const i = likes.indexOf(currentUser.uid);

      i === -1 ? likes.push(currentUser.uid) : likes.splice(i,1);

      ref.update({likes});
    };
  });

  document.querySelectorAll(".comment-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.dataset.id;
      const input = document.querySelector(`.comment-input[data-id="${id}"]`);
      const text = input.value.trim();
      if(!text) return;

      const ref = db.collection("updates").doc(id);
      const snap = await ref.get();

      const comments = snap.data().comments || [];

      comments.push({
        userId:currentUser.uid,
        username:currentUsername,
        text,
        replies:[]
      });

      await ref.update({comments});
      input.value="";
    };
  });
}

// =========================
// CHAT
// =========================

function loadMessages(){
  if(!messagesContainer) return;

  db.collection("chats")
  .where("userId","==",currentUser.uid)
  .orderBy("timestamp")
  .onSnapshot(snapshot=>{

    messagesContainer.innerHTML="";

    snapshot.forEach(doc=>{
      const msg = doc.data();

      const div = document.createElement("div");
      div.classList.add("message-card", msg.sender==="admin"?"admin-msg":"user-msg");

      div.textContent = msg.sender==="admin"
        ? `Admin: ${msg.text}`
        : `You: ${msg.text}`;

      messagesContainer.appendChild(div);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

if(sendMessageBtn){
  sendMessageBtn.addEventListener("click", async ()=>{
    const text = messageInput.value.trim();
    if(!text) return;

    await db.collection("chats").add({
      userId:currentUser.uid,
      sender:"user",
      text,
      timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value="";
  });
}

// =========================
// REVIEWS
// =========================

if(postReviewBtn){
  postReviewBtn.addEventListener("click", async ()=>{
    const text = reviewInput.value.trim();
    if(!text) return alert("Review cannot be empty.");

    await db.collection("reviews").add({
      userId:currentUser.uid,
      username:currentUsername,
      reviewText:text,
      timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      replies:[]
    });

    reviewInput.value="";
  });
}

function loadReviews(){

  if(!reviewsContainer) return;

  db.collection("reviews")
  .orderBy("timestamp","desc")
  .onSnapshot(snapshot=>{

    reviewsContainer.innerHTML="";

    snapshot.forEach(doc=>{
      const data = doc.data();

      const div = document.createElement("div");
      div.classList.add("review-card");

      div.innerHTML = `
        <p>${data.reviewText}</p>
        <strong>${data.username}</strong>
      `;

      reviewsContainer.appendChild(div);
    });

  });

}