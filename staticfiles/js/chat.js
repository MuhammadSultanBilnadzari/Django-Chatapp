// Ambil username dari localStorage, jika belum ada buat baru dan simpan
(function () {
  var username = localStorage.getItem('chatUsername');
  if (!username) {
    username = 'User_' + Math.floor(Math.random() * 1000);
    localStorage.setItem('chatUsername', username);
  }
})();

let chatSocket;

// DOM references
const chatLog = document.querySelector('#chat-log');
const messageInput = document.querySelector('#chat-message-input');
const messageButton = document.querySelector('#chat-message-submit');
const newMessageIndicator = document.querySelector('#new-message-indicator');
const notificationSound = document.querySelector('#notification-sound');

let isUserNearBottom = true;

function connectWebSocket() {
  chatSocket = new WebSocket(
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    window.location.host +
    '/ws/chat/' + roomName + '/'
  );

  // Saat WebSocket terbuka, load histori pesan via HTTP
  chatSocket.onopen = () => {
    fetch(`/messages/${roomName}/`)
  .then(res => res.json())
  .then(data => {
    const chatLog = document.getElementById('chat-log');
    chatLog.innerHTML = ''; // reset dulu

    if (data.length === 0) {
      chatLog.innerHTML = '<div class="centered-empty">Belum ada pesan. Jadilah yang pertama mengirim pesan!</div>';
    } else {
      data.forEach(msg => {
        const msgDiv = document.createElement('div');
        // contoh sederhana:
        if (msg.username === username) {
          msgDiv.className = 'message-container items-end fade-in';
          msgDiv.innerHTML = `<div class="message-self">${msg.message}<span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span></div>`;
        } else {
          msgDiv.className = 'message-container items-start fade-in';
          msgDiv.innerHTML = `<div class="message-other"><span class="text-xs font-semibold block mb-1 text-indigo-500">${msg.username}</span>${msg.message}<span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span></div>`;
        }
        chatLog.appendChild(msgDiv);
      });
    }
  });
  }

  chatSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (data.typing !== undefined && data.username !== username) {
      document.querySelector("#typing-indicator").textContent =
        data.typing ? `${data.username} sedang mengetik...` : "";
      return;
    }

    if (data.command === "delete_all_messages") {
      chatLog.innerHTML = '<div class="centered-empty">Pesan dihapus oleh pengguna.</div>';
      return;
    }

    createMessageBubble(data);

    requestAnimationFrame(() => {
      if (isUserNearBottom) {
        scrollToBottom(true);
        newMessageIndicator.style.display = 'none';
      } else {
        newMessageIndicator.style.display = 'block';
      }
    });

    if (data.username !== username && data.message) {
      playSound();
      showNotification(data.username, data.message);
    }
  };

  chatSocket.onclose = () => {
    console.warn('Disconnected. Reconnecting...');
    setTimeout(connectWebSocket, 3000);
  };
}

// Auto-scroll fungsi
function scrollToBottom(smooth = true) {
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function checkNearBottom() {
  return chatLog.scrollTop + chatLog.clientHeight >= chatLog.scrollHeight - 50;
}

function playSound() {
  if (notificationSound) notificationSound.play().catch(() => {});
}

function showNotification(title, message) {
  if (document.hidden && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
}

function renderEmojis(text) {
  return text.replace(/:\)/g, '😊')
    .replace(/:\(/g, '😢')
    .replace(/:D/g, '😄')
    .replace(/<3/g, '❤️');
}

function highlightMention(text, name) {
  const regex = new RegExp(`@${name}\\b`, 'gi');
  return text.replace(regex, `<span class="bg-yellow-300 px-1 rounded">@${name}</span>`);
}

function createMessageBubble(data) {
  if (!data.message) return;
  const self = data.username === username;
  const div = document.createElement('div');
  div.className = `flex mt-2 ${self ? 'justify-end' : 'justify-start'}`;

  const bubble = document.createElement('div');
  bubble.className = self
    ? 'bg-blue-500 text-white px-4 py-2 rounded-2xl shadow max-w-xs'
    : 'bg-white border px-4 py-2 rounded-2xl shadow max-w-xs relative';

  if (!self) {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'text-xs font-semibold text-gray-600 absolute -top-5 left-2';
    nameDiv.textContent = data.username;
    bubble.appendChild(nameDiv);
  }

  const content = document.createElement('div');
  content.className = 'whitespace-pre-wrap break-words text-sm';
  let msg = data.message;

  if (!msg.includes('<img')) {
    msg = renderEmojis(msg);
    if (!self) msg = highlightMention(msg, username);
  }
  content.innerHTML = msg;

  const imgs = content.querySelectorAll('img');
  imgs.forEach(img => {
    img.addEventListener('load', () => {
      if (isUserNearBottom) scrollToBottom(true);
    });
  });

  bubble.appendChild(content);

  const time = document.createElement('div');
  time.className = 'text-xs text-right mt-1';
  const now = new Date();
  time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.appendChild(time);

  div.addEventListener('dblclick', () => {
    navigator.clipboard.writeText(data.message).then(() => alert("Pesan disalin!"));
  });

  div.appendChild(bubble);
  chatLog.appendChild(div);
}

// Event scroll chat log
chatLog.addEventListener('scroll', () => {
  isUserNearBottom = checkNearBottom();
  if (isUserNearBottom) newMessageIndicator.style.display = 'none';
});

// Klik new message indicator untuk scroll ke bawah
newMessageIndicator.addEventListener('click', () => {
  scrollToBottom(true);
  newMessageIndicator.style.display = 'none';
  isUserNearBottom = true;
});

// Hapus pesan lokal
const deleteBtn = document.getElementById('delete-messages-btn');
if (deleteBtn) {
  deleteBtn.addEventListener('click', () => {
    if (confirm('Yakin ingin menghapus semua pesan?')) {
      localStorage.setItem(`deletedMessages-${username}`, 'true');
      chatLog.innerHTML = `
        <div class="centered-empty">
          Pesan sudah dihapus.
          <button id="restore-messages" class="underline text-blue-500">Tampilkan lagi</button>
        </div>
      `;
      document.getElementById('restore-messages').onclick = () => {
        localStorage.removeItem(`deletedMessages-${username}`);
        location.reload();
      };
    }
  });
}

// Typing indicator
messageInput.addEventListener('input', () => {
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.send(JSON.stringify({ 'typing': true, 'username': username }));
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      chatSocket.send(JSON.stringify({ 'typing': false, 'username': username }));
    }, 1500);
  }
});

// Kirim pesan
messageButton.onclick = () => {
  const message = messageInput.value.trim();
  if (message && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.send(JSON.stringify({ message, username }));
    messageInput.value = '';
  }
};

// Kirim pesan dengan Enter
messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') messageButton.click();
});

// Load halaman
window.addEventListener('load', () => {
  scrollToBottom(false);
  if (Notification.permission !== 'granted') Notification.requestPermission();
  connectWebSocket();
});

// Emoji quick insert
document.getElementById('emoji-toggle').onclick = () => {
  messageInput.value += '😊';
  messageInput.focus();
};

// Upload file (gambar saja)
document.getElementById('file-upload').addEventListener('change', function () {
  const file = this.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
          'message': `<img src="${e.target.result}" class="rounded-xl max-w-xs h-auto block" alt="image" />`,
          'username': username
        }));
      }
    };
    reader.readAsDataURL(file);
  } else {
    alert("Hanya gambar yang diperbolehkan!");
  }
});
