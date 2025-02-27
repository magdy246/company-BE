const socket = io('http://localhost:3000');

const statusDiv = document.getElementById('status');
const notificationsDiv = document.getElementById('notifications');
const companyIdInput = document.getElementById('companyId');

// Socket connection events
socket.on('connect', () => {
    statusDiv.textContent = 'Connected to server';
    statusDiv.style.color = '#4CAF50';
});

socket.on('disconnect', () => {
    statusDiv.textContent = 'Disconnected from server';
    statusDiv.style.color = '#F44336';
});

// Join company room
function joinCompany() {
    const companyId = companyIdInput.value.trim();
    if (!companyId) {
        alert('Please enter a valid Company ID');
        return;
    }
    socket.emit('joinCompany', companyId);
    console.log(`Joined company room: company-${companyId}`);
}

// Handle new application notifications
socket.on('newApplication', (data) => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <p><strong>New Application:</strong> ${data.message}</p>
        <p><strong>Application ID:</strong> ${data.applicationId}</p>
        <p><strong>User ID:</strong> ${data.userId}</p>
        <p class="timestamp"><strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
    `;
    notificationsDiv.prepend(notification);
    console.log('Received notification:', data);
});