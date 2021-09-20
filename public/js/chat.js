const socket = io();

const $messageForm = document.getElementById('message-form');
const $messageInput = document.getElementById('message-input');
const $messageBtn = document.getElementById('message-btn');

const $sendLocationBtn = document.getElementById('send-location-btn');

const $messagesContainer = document.getElementById('messages');

const sidebarTemplate = document.getElementById('sidebar-template').innerHTML;
const initTemplate = document.getElementById('init-template').innerHTML;
const userJoinTemplate = document.getElementById('user-join-template').innerHTML;
const userLeaveTemplate = document.getElementById('user-leave-template').innerHTML;
const messageTemplate = document.getElementById('message-template').innerHTML;
const locationTemplate = document.getElementById('location-template').innerHTML;
const messageErrorTemplate = document.getElementById('message-error-template').innerHTML;

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    const $newMessage = $messagesContainer.lastElementChild;

    if($newMessage) {
        const newMessageStyles = getComputedStyle($newMessage);
        const newMessageMargin = parseInt(newMessageStyles.marginBottom);
        const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

        const visibleHeight = $messagesContainer.offsetHeight;
        const containerHeight = $messagesContainer.scrollHeight;

        const scrollOffset = $messagesContainer.scrollTop + visibleHeight;

        if(containerHeight - newMessageHeight <= scrollOffset) {
            $messagesContainer.scrollTop = containerHeight;
        }
    }
};

socket.on('init', ({ message, createdAt }) => {
    const template = Mustache.render(initTemplate, { message });
    $messagesContainer.insertAdjacentHTML('beforeend', template);
});

socket.on('userJoin', ({ message, createdAt }) => {
    const template = Mustache.render(userJoinTemplate, { message });
    $messagesContainer.insertAdjacentHTML('beforeend', template);

    autoscroll();
});

socket.on('userLeave', ({ message, createdAt }) => {
    const template = Mustache.render(userLeaveTemplate, { message });
    $messagesContainer.insertAdjacentHTML('beforeend', template);

    autoscroll();
});

socket.on('userListChange', ({ room, users }) => {
    const template = Mustache.render(sidebarTemplate, { room, users });
    const $sidebarContainer = document.getElementById('sidebar');

    $sidebarContainer.innerHTML = template;
});

socket.on('sendMessage', ({ message, username, createdAt }) => {
    const template = Mustache.render(messageTemplate, { 
        message,
        username,
        createdAt: moment(createdAt).format('h:mm a')
    });
    
    $messagesContainer.insertAdjacentHTML('beforeend', template);
    autoscroll();
});

socket.on('sendLocation', ({ url, username, createdAt }) => {
    const template = Mustache.render(locationTemplate, { 
        url,
        username,
        createdAt: moment(createdAt).format('h:mm a')
     });

    $messagesContainer.insertAdjacentHTML('beforeend', template);
    autoscroll();
});

if($messageForm && $messageInput && $messageBtn) {
    $messageForm.addEventListener('submit', event => {
        event.preventDefault();
        $messageBtn.setAttribute('disabled', 'disabled');

        socket.emit('sendMessage', $messageInput.value, error => {
            $messageBtn.removeAttribute('disabled');
            $messageInput.value = '';
            $messageInput.focus();

            if(error) {
                const html = Mustache.render(messageErrorTemplate, {
                    message: error
                });
            
                return $messagesContainer.insertAdjacentHTML('beforeend', html);
            }

            console.log('Checksum: Message delivered');
        });
    });
}

if($sendLocationBtn) {
    $sendLocationBtn.addEventListener('click', () => {
        if(!navigator.geolocation) {
            return alert('Geolocation is not supported by your browser.');
        }

        $sendLocationBtn.setAttribute('disabled', 'disabled');

        navigator.geolocation.getCurrentPosition(position => {
            socket.emit('sendLocation', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }, error => {
                $sendLocationBtn.removeAttribute('disabled');
                
                if(error) {
                    const html = Mustache.render(messageErrorTemplate, {
                        message: error
                    });
                
                    return $messagesContainer.insertAdjacentHTML('beforeend', html);
                }

                console.log(`Checksum: Location shared!`);
            });
        });
    });
}

socket.emit('join', { username, room }, error => {
    if(error) {
        alert(error);

        location.href = '/';
    }
});