var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', (socket) => {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket, 'Lobby');

        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', () => socket.emit('rooms', io.sockets.manager.rooms));

        handleClientDisconnection(socket, nickNames, namesUsed);
    })
}

function assignGuestName(socket, guestNumber, nicknames, namesUsed) {
    var name = 'Guest' + guestNumber;
    nicknames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {
        room: room
    });
    socket.broadcast.to(room).emit('message', {
        text: `${nickNames[socket.id]} has joined ${room}.`
    });

    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = `Users currently in ${room} : ${usersInRoom.map(x => nickNames[x.id]).join(", ")}.`;

        socket.emit('message', {
            text: usersInRoomSummary
        });
    }
}

function handleNameChangeAttempts(socket, nicknames, namesUsed) {
    socket.on('nameAttempt', (name) => {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin w/ "Guest".'
            });
            return;
        }

        if (namesUsed.indexOf(name) != -1) {
            socket.emit('nameResult', {
                success: false,
                message: 'That name is already in use.'
            });
            return;
        }

        var prevName = nickNames[socket.id];
        var prevNameIndex = namesUsed.indexOf(prevName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[prevNameIndex];
        
        socket.emit('nameResult', {
            success: true,
            name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
            text: `${prevName} is now known as ${name}.`
        });
    })
}

function handleMessageBroadcasting(socket) {
    socket.on('message', (msg) => {
        socket.broadcast.to(message.room).emit('message', {
            text: `${nickNames[socket.id]} : ${message.text}`
        })
    });
}

function handleRoomJoining(socket) {
    socket.on('join', (room) => {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', () => {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}