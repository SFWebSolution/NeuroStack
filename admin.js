// =========================
// UTILITY FUNCTION: LINKIFY
// =========================
function linkify(text) {
  if(!text) return "";

  // Match URLs starting with http(s) or www
  const urlRegex = /(\b(https?:\/\/|www\.)[^\s]+)/gi;

  return text.replace(urlRegex, function(url) {
    let href = url;

    // Add http if missing (for www links)
    if(!url.match(/^https?:\/\//i)) {
      href = "http://" + url;
    }

    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

// =========================
// Admin Dashboard JS
// =========================

const auth = firebase.auth();
const db = firebase.firestore();

const ADMIN_EMAIL = "neuro_stack@outlook.com";

// Cloudinary
const CLOUD_NAME = "doasf3d1u";
const UPLOAD_PRESET = "NeuroStack";

// DOM Elements
const usersContainer = document.getElementById('users-container');
const reviewsContainer = document.getElementById('reviews-container');
const updatesContainer = document.getElementById('updates-container');

const usersList = document.getElementById('users-list');
const messagesContainer = document.getElementById('messages-container');
const replyInput = document.getElementById('reply-input');
const sendReplyBtn = document.getElementById('send-reply');

const toggleThemeBtn = document.getElementById('toggle-theme');
const logoutBtn = document.getElementById('logout-btn');

const postUpdateBtn = document.getElementById("post-update");
const updateTitle = document.getElementById("update-title");
const updateDesc = document.getElementById("update-description");
const updateImage = document.getElementById("update-image");
const updateVideo = document.getElementById("update-video");

let currentUser = null;
let selectedUserId = null;
let selectedUsername = "";

// =========================
// AUTH
// =========================
auth.onAuthStateChanged(user => {
  if(!user) return window.location.href="login.html";

  if(user.email !== ADMIN_EMAIL){
    alert("Access denied");
    return window.location.href="home.html";
  }

  currentUser = user;

  loadUsers();
  loadReviews();
  loadUpdates();
  loadChatUsers();
  applyTheme();
});

// =========================
// CLOUDINARY UPLOAD
// =========================
async function uploadFile(file,type){
  const formData = new FormData();
  formData.append("file",file);
  formData.append("upload_preset",UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`;

  const res = await fetch(url,{
    method:"POST",
    body:formData
  });

  const data = await res.json();
  return data.secure_url;
}

// =========================
// CHAT USERS LIST
// =========================
function loadChatUsers(){
  if(!usersList) return;

  db.collection("users")
    .orderBy("username")
    .onSnapshot(snapshot=>{
      usersList.innerHTML="";

      if(snapshot.empty){
        usersList.innerHTML="<p>No users</p>";
        return;
      }

      snapshot.forEach(doc=>{
        const data = doc.data();
        const username = data.username || "Anonymous";
        const status = data.status || "offline";

        const div = document.createElement("div");
        div.classList.add("user-item");

        const dot = status==="online" ? "🟢":"🔴";
        div.textContent = `${dot} ${username}`;

        div.addEventListener("click",()=>{
          selectUser(doc.id,username);
        });

        usersList.appendChild(div);
      });
    });
}

// =========================
// SELECT USER CHAT
// =========================
function selectUser(userId,username){
  selectedUserId = userId;
  selectedUsername = username;

  replyInput.disabled = false;
  sendReplyBtn.disabled = false;

  messagesContainer.innerHTML="Loading...";

  db.collection("chats")
    .where("userId","==",userId)
    .orderBy("timestamp")
    .onSnapshot(snapshot=>{
      messagesContainer.innerHTML="";

      if(snapshot.empty){
        messagesContainer.innerHTML="<p>No messages yet</p>";
        return;
      }

      snapshot.forEach(doc=>{
        const msg = doc.data();
        const div = document.createElement("div");
        div.classList.add("message",msg.sender==="admin"?"admin":"user");

        div.innerHTML = msg.sender==="admin" 
          ? `You: ${linkify(msg.text)}`
          : `${username}: ${linkify(msg.text)}`;

        messagesContainer.appendChild(div);
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// =========================
// SEND MESSAGE
// =========================
if(sendReplyBtn){
  sendReplyBtn.addEventListener("click",()=>{
    if(!selectedUserId){
      alert("Select user");
      return;
    }

    const text = replyInput.value.trim();
    if(!text) return;

    db.collection("chats").add({
      userId:selectedUserId,
      sender:"admin",
      text:text,
      timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });

    replyInput.value="";
  });
}

// =========================
// LOAD USERS
// =========================
function loadUsers(){
  if(!usersContainer) return;

  db.collection("users")
    .onSnapshot(snapshot=>{
      usersContainer.innerHTML="";

      snapshot.forEach(doc=>{
        const data = doc.data();
        const username = data.username || "Anonymous";
        const status = data.status || "offline";

        const dot = status==="online"?"🟢":"🔴";

        const div = document.createElement("div");
        div.classList.add("user-card");
        div.innerHTML = `
          <p><strong>${dot} ${username}</strong></p>
          <button class="delete-user">Delete User</button>
        `;

        div.querySelector(".delete-user").addEventListener("click",()=>{
          if(confirm("Delete user?")){
            db.collection("users").doc(doc.id).delete();
          }
        });

        usersContainer.appendChild(div);
      });
    });
}

// =========================
// LOAD REVIEWS
// =========================
function loadReviews(){
  if(!reviewsContainer) return;

  db.collection("reviews")
    .orderBy("timestamp","desc")
    .onSnapshot(snapshot=>{
      reviewsContainer.innerHTML="";

      snapshot.forEach(doc=>{
        const data = doc.data();
        const username = data.username || "Anonymous";

        const div = document.createElement("div");
        div.classList.add("review-card");

        const repliesHTML = (data.replies||[]).map(r=>`
          <div class="reply-card">
            <strong>${r.username}</strong>: ${linkify(r.text)}
          </div>
        `).join("");

        div.innerHTML = `
          <p>${linkify(data.reviewText)}</p>
          <p><strong>${username}</strong></p>
          <div>${repliesHTML}</div>
          <input type="text" class="reply-input" placeholder="Reply">
          <button class="reply-btn">Reply</button>
          <button class="delete-review">Delete</button>
        `;

        const replyBtn = div.querySelector(".reply-btn");
        const replyInput = div.querySelector(".reply-input");

        replyBtn.addEventListener("click",()=>{
          const text = replyInput.value.trim();
          if(!text) return;

          const replies = data.replies || [];
          replies.push({
            username:"NeuroStack",
            text:text,
            timestamp:firebase.firestore.FieldValue.serverTimestamp()
          });

          db.collection("reviews").doc(doc.id).update({replies});
          replyInput.value="";
        });

        div.querySelector(".delete-review").addEventListener("click",()=>{
          if(confirm("Delete review?")){
            db.collection("reviews").doc(doc.id).delete();
          }
        });

        reviewsContainer.appendChild(div);
      });
    });
}

// =========================
// POST UPDATE
// =========================
if(postUpdateBtn){
  postUpdateBtn.addEventListener("click", async ()=>{
    const title = updateTitle.value.trim();
    const description = updateDesc.value.trim();

    if(!title) return alert("Title is required");

    let imageURL="";
    let videoURL="";

    if(updateImage && updateImage.files.length>0){
      imageURL = await uploadFile(updateImage.files[0],"image");
    }
    if(updateVideo && updateVideo.files.length>0){
      videoURL = await uploadFile(updateVideo.files[0],"video");
    }

    db.collection("updates").add({
      title,
      description,
      image:imageURL,
      video:videoURL,
      likes:[],
      comments:[],
      timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });

    updateTitle.value="";
    updateDesc.value="";
    if(updateImage) updateImage.value="";
    if(updateVideo) updateVideo.value="";
  });
}

// =========================
// LOAD UPDATES (EDIT/DELETE)
// =========================
function loadUpdates(){
  if(!updatesContainer) return;

  db.collection("updates")
    .orderBy("timestamp","desc")
    .onSnapshot(snapshot=>{
      updatesContainer.innerHTML="";

      snapshot.forEach(doc=>{
        const data = doc.data();
        const likesCount = data.likes ? data.likes.length : 0;
        const comments = data.comments || [];

        const commentsHTML = comments.map(c=>`
          <div class="comment">
            <strong>${c.username || "Anonymous"}:</strong> ${linkify(c.text)}
          </div>
        `).join("");

        const div = document.createElement("div");
        div.classList.add("update-card");

        div.innerHTML = `
          <h3>${data.title}</h3>
          <p>${linkify(data.description)}</p>
          ${data.image ? `<img src="${data.image}" class="post-media">` : ""}
          ${data.video ? `<video src="${data.video}" controls class="post-media"></video>` : ""}
          <p>❤️ Likes: ${likesCount}</p>
          <p>💬 Comments: ${comments.length}</p>
          <div class="comments">${commentsHTML}</div>
          <button class="edit-post">Edit</button>
          <button class="delete-post">Delete</button>
        `;

        const deleteBtn = div.querySelector(".delete-post");
        deleteBtn.addEventListener("click", ()=>{
          if(confirm("Delete this post?")){
            db.collection("updates").doc(doc.id).delete();
          }
        });

        const editBtn = div.querySelector(".edit-post");
        editBtn.addEventListener("click", async ()=>{
          const newTitle = prompt("Edit title", data.title);
          const newDesc = prompt("Edit description", data.description);

          let newImage = data.image;
          let newVideo = data.video;

          if(updateImage && updateImage.files.length>0){
            newImage = await uploadFile(updateImage.files[0],"image");
          }
          if(updateVideo && updateVideo.files.length>0){
            newVideo = await uploadFile(updateVideo.files[0],"video");
          }

          db.collection("updates").doc(doc.id).update({
            title:newTitle,
            description:newDesc,
            image:newImage,
            video:newVideo
          });
        });

        updatesContainer.appendChild(div);
      });
    });
}

// =========================
// THEME
// =========================
function applyTheme(){
  const savedTheme = localStorage.getItem("admin-theme") || "dark";
  if(savedTheme==="light") document.body.classList.add("light-theme");

  if(toggleThemeBtn){
    toggleThemeBtn.addEventListener("click",()=>{
      document.body.classList.toggle("light-theme");
      const theme = document.body.classList.contains("light-theme")?"light":"dark";
      localStorage.setItem("admin-theme",theme);
    });
  }
}

// =========================
// LOGOUT
// =========================
if(logoutBtn){
  logoutBtn.addEventListener("click",()=>{
    auth.signOut().then(()=>{
      window.location.href="login.html";
    });
  });
}