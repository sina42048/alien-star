const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);
const randomString = require('randomstring');


let players = {};
let star = {
    id : randomString.generate(7),
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
}

let scores = {
    blue: 0,
    red: 0
};


app.use(express.static(__dirname + "/public"));

app.get('/' , (req, res) => {
    res.sendFile(__dirname + '/index.html');
})

io.on('connection' , (socket) => {
    players[socket.id] = {
        rotation : 0,
        x : Math.floor(Math.random() * 700) + 50,
        y : Math.floor(Math.random() * 500) + 50 ,
        playerId : socket.id,
        team : (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
    }
    socket.emit('currentPlayers' , players);
    socket.emit('starLocation' , star);
    socket.emit('scoreUpdate' , scores);

    socket.broadcast.emit('newPlayer' , players[socket.id]);

    socket.on('playerMovement' , (movmentData) => {
        players[socket.id].x = movmentData.x;
        players[socket.id].y = movmentData.y;
        players[socket.id].rotation = movmentData.rotation;

        socket.broadcast.emit('playerMoved' , players[socket.id]);
    })

    socket.on('starCollected' , (starId) => {
        if (star.id !== starId) {
            return;
        }

        star.id = randomString.generate(7);

        if(players[socket.id].team === 'red') {
            scores.red += 10;
        } else {
            scores.blue += 10;
        }

        star.x = Math.floor(Math.random() * 700) + 50;
        star.y = Math.floor(Math.random() * 500) + 50;
        io.emit('starLocation' , star);
        io.emit('scoreUpdate' , scores);
    })
 

    socket.on('disconnect' , () => {
        delete players[socket.id];
        io.emit('disconnect' , socket.id)
    })
})

server.listen(process.env.PORT || 3000 , () => {})
