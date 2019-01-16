const divEscapedContentElement = (msg) => $('<div></div>').text(message);
const divSystemContentElement = (msg) => $('<div></div>').html(`<i>${message}</i>`);

function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    if(message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    }
    else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeigth'));
    }

    $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(() => {
    var chatApp = new Chat(socket);

    socket.on('nameResult', (res) => {
        var msg;

        if (res.success) {
            msg = `U R now known as ${res.name}.`;
        }
        else {
            msg = res.message;
        }
        $('#messages').append(divSystemContentElement(msg));
    });

    socket.on('joinResult', (res) => {
        $('#room').text(res.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    });

    socket.on('message', (msg) => {
        var newElement = $('<div></div>').text(msg.text);
        $('#messages').append(newElement);
    });

    socket.on('rooms', (rooms) => {
        $('#room-list').empty();

        rooms.map(x => x.substring(1, x.length))
            .filter(x => x != '')
            .forEach(x => $('#room-list').append(divEscapedContentElement(x)));
        
        $('#room-list div').click(() => {
            chatApp.processCommand(`/join ${$(this).text()}`);
            $('#send-message').focus();
        });
    });

    setInterval(() => {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    $('#send-form').submit(() => {
        processUserInput(chatApp, socket);
        return false;
    });
});