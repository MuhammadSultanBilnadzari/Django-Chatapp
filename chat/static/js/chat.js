let chatSocket;

function connectWebSocket() {
  chatSocket = new WebSocket(
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    window.location.host +
    '/ws/chat/' + roomName + '/'
  );

  // Pesan masuk
  chatSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (data.typing !== undefined && data.username !== username) {
      document.querySelector("#typing-indicator").textContent =
        data.typing ? `${data.username} sedang mengetik...` : "";
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

    if (data.username !== username) {
      playSound();
      showNotification(data.username, data.message);
    }
  };

  // Jika socket putus, coba reconnect
  chatSocket.onclose = () => {
    console.warn('Disconnected. Reconnecting...');
    setTimeout(connectWebSocket, 3000);
  };
}

connectWebSocket();


// DOM
const chatLog = document.querySelector('#chat-log');
const messageInput = document.querySelector('#chat-message-input');
const messageButton = document.querySelector('#chat-message-submit');
const newMessageIndicator = document.querySelector('#new-message-indicator');
const notificationSound = document.querySelector('#notification-sound');

let isUserNearBottom = true;

// Auto-scroll
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

  // Gambar auto-scroll
  const imgs = content.querySelectorAll('img');
  imgs.forEach(img => {
    img.addEventListener('load', () => {
      if (isUserNearBottom) scrollToBottom(true);
    });
  });

  bubble.appendChild(content);

  // Waktu sesuai data dari server (pakai data.time jika dikirim) atau waktu lokal
  const time = document.createElement('div');
  time.className = 'text-xs text-right mt-1';
  const now = new Date();
  time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.appendChild(time);

  bubble.addEventListener('dblclick', () => {
    navigator.clipboard.writeText(data.message).then(() => alert("Pesan disalin!"));
  });

  div.appendChild(bubble);
  chatLog.appendChild(div);
}

// Scroll event
chatLog.addEventListener('scroll', () => {
  isUserNearBottom = checkNearBottom();
  if (isUserNearBottom) newMessageIndicator.style.display = 'none';
});

// Klik new message indicator
newMessageIndicator.addEventListener('click', () => {
  scrollToBottom(true);
  newMessageIndicator.style.display = 'none';
  isUserNearBottom = true;
});

// Typing indicator (hanya kirim jika socket OPEN)
messageInput.addEventListener('input', () => {
  if (chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.send(JSON.stringify({ 'typing': true, 'username': username }));
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      chatSocket.send(JSON.stringify({ 'typing': false, 'username': username }));
    }, 1500);
  }
});

// Kirim pesan (hanya kirim jika socket OPEN)
messageButton.onclick = () => {
  const message = messageInput.value.trim();
  if (message && chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.send(JSON.stringify({ message, username }));
    messageInput.value = '';
  }
};

// Enter untuk kirim
messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') messageButton.click();
});

// Load
window.addEventListener('load', () => {
  scrollToBottom(false);
  if (Notification.permission !== 'granted') Notification.requestPermission();
});

// Emoji quick insert
document.getElementById('emoji-toggle').onclick = () => {
  messageInput.value += '😊';
  messageInput.focus();
};

// Upload file (hanya kirim jika socket OPEN)
document.getElementById('file-upload').addEventListener('change', function () {
  const file = this.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (chatSocket.readyState === WebSocket.OPEN) {
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
