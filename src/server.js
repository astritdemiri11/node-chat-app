const pathLib = require('path');
const httpLib = require('http');

const expressLib = require('express');
const socketIOLib = require('socket.io');
const badWordsLib = require('bad-words');

const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = expressLib();
const server = httpLib.createServer(app);
const io = socketIOLib(server);

const publicDir = pathLib.join(__dirname, '../public');

app.use(expressLib.static(publicDir));

io.on('connection', socket => {
    console.log('New WebSocket connection');

    socket.on('join', (options, callback) => {
        const { user, error } = addUser({ id: socket.id, ...options });

        if(error) {
            if(callback) {
                callback(error);
            }

            return;
        }

        socket.join(user.room);

        socket.emit('init', generateMessage('Welcome!'));
        socket.broadcast.to(user.room).emit('userJoin', generateMessage(`${user.username} has joined!`));

        io.to(user.room).emit('userListChange', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        if(callback) {
            callback();
        }
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        if(!user) {
            if(callback) {
                callback('User not allowed!');
            }

            return;
        }

        const badWordsFilter = new badWordsLib();

        if(badWordsFilter.isProfane(message)) {
            if(callback) {
                callback('Profanity is not allowed!');
            }

            return;
        }

        io.to(user.room).emit('sendMessage', generateMessage(message, user.username));
        
        if(callback) {
            callback();
        }
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);

        if(!user) {
            if(callback) {
                callback('User not allowed!');
            }

            return;
        }

        io.to(user.room).emit('sendLocation', generateLocationMessage(`https://google.com/maps?q=${coords.latitude},${coords.longitude}`, user.username));
        
        if(callback) {
            callback();
        }
    });

    socket.on('disconnect', () => {
        const { error, user } = removeUser(socket.id);

        if(error) {
            return;
        }

        if(user) {
            io.to(user.room).emit('userLeave', generateMessage(`${user.username} has left!`));

            io.to(user.room).emit('userListChange', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

module.exports = server;