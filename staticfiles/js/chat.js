const chatSocket = new WebSocket(
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    window.location.host +
    '/ws/chat/' +
    roomName +
    '/'
);

// DOM elements
const chatLog = document.querySelector('#chat-log');
const messageInputDom = document.querySelector('#chat-message-input');
const messageSubmitBtn = document.querySelector('#chat-message-submit');
const newMessageIndicator = document.querySelector('#new-message-indicator');
let isUserNearBottom = true;

// Scroll helper
function scrollToBottom(smooth = true) {
    if (smooth) {
        chatLog.scrollTo({
            top: chatLog.scrollHeight,
            behavior: 'smooth',
        });
    } else {
        chatLog.scrollTop = chatLog.scrollHeight;
    }
}

// Check if user is near the bottom
function checkUserNearBottom() {
    const threshold = 50;
    const position = chatLog.scrollTop + chatLog.clientHeight;
    const height = chatLog.scrollHeight;
    return (height - position) < threshold;
}

// Time formatter
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio("/static/sounds/notification.mp3");
    audio.play().catch(err => console.warn("Audio play failed:", err));
}

// Show desktop notification (optional)
function showDesktopNotification(title, message) {
    if (document.hidden && Notification.permission === 'granted') {
        new Notification(title, { body: message });
    }
}

// Handle incoming messages
chatSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    const isSelf = (data.username === username);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', 'mt-2', 'fade-in', isSelf ? 'justify-end' : 'justify-start');

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isSelf
        ? 'bg-gradient-to-tr from-blue-600 to-blue-400 text-white px-5 py-3 rounded-3xl max-w-xs shadow-lg relative'
        : 'bg-white border border-gray-300 px-5 py-3 rounded-3xl max-w-xs shadow-md relative';

    const usernameDiv = document.createElement('div');
    usernameDiv.className = `absolute -top-5 ${isSelf ? 'right-3 text-blue-900' : 'left-3 text-gray-700'} text-xs font-semibold select-none`;
    usernameDiv.textContent = data.username;

    const contentDiv = document.createElement('p');
    contentDiv.className = 'whitespace-pre-wrap break-words';
    contentDiv.textContent = data.message;

    const timeDiv = document.createElement('div');
    timeDiv.className = `text-xs mt-1 ${isSelf ? 'text-indigo-100 text-right' : 'text-gray-400 text-left'}`;
    timeDiv.textContent = getCurrentTime();

    bubbleDiv.appendChild(usernameDiv);
    bubbleDiv.appendChild(contentDiv);
    bubbleDiv.appendChild(timeDiv);
    messageDiv.appendChild(bubbleDiv);
    chatLog.appendChild(messageDiv);

    if (isUserNearBottom) {
        scrollToBottom(true);
        newMessageIndicator?.style && (newMessageIndicator.style.display = 'none');
    } else {
        newMessageIndicator?.style && (newMessageIndicator.style.display = 'block');
    }

    if (!isSelf) {
        playNotificationSound();
        showDesktopNotification(data.username, data.message);
    }
};

// Auto reconnect WebSocket
chatSocket.onclose = function () {
    console.warn('Socket closed. Attempting reconnect...');
    setTimeout(() => location.reload(), 3000);
};

// Detect scroll position
chatLog.addEventListener('scroll', () => {
    isUserNearBottom = checkUserNearBottom();
    if (isUserNearBottom && newMessageIndicator) {
        newMessageIndicator.style.display = 'none';
    }
});

// Button: scroll to new message
newMessageIndicator?.addEventListener('click', () => {
    scrollToBottom(true);
    newMessageIndicator.style.display = 'none';
    isUserNearBottom = true;
});

// Accessibility
newMessageIndicator?.addEventListener('keydown', (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        newMessageIndicator.click();
    }
});

// Input submission
messageInputDom.focus();

messageInputDom.onkeyup = function (e) {
    if (e.key === 'Enter') {
        messageSubmitBtn.click();
    }
};

messageSubmitBtn.onclick = function () {
    const message = messageInputDom.value.trim();
    if (message !== '') {
        chatSocket.send(JSON.stringify({
            'message': message,
            'username': username
        }));
        messageInputDom.value = '';
    }
};

// Scroll to bottom on load
window.addEventListener('load', () => {
    scrollToBottom(false);
    // Ask for notification permission
    if ("Notification" in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
});
