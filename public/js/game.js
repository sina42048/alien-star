let config = {
    type : Phaser.AUTO,
    parent : 'pharser',
    width : 800,
    height : 600,
    audio: {
        disableWebAudio: true
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
          debug: false,
          gravity: { y: 0 }
        }
      },
    scene : {
        preload : preload,
        create : create,
        update : update
    }
};

let game = new Phaser.Game(config);

function preload() {
    this.load.image('ship1' , 'assets/playerShip1_blue.png');
    this.load.image('ship2' , 'assets/playerShip1_red.png');
    this.load.image('otherPlayer1' , 'assets/enemyBlue1.png');
    this.load.image('otherPlayer2' , 'assets/enemyRed1.png');
    this.load.image('star' , 'assets/star.png');
    this.load.audio('collect' , 'assets/collect.mp3' , { instances : 2 })
}

function create() {
    this.cameras.main.backgroundColor = Phaser.Display.Color.HexStringToColor("#efe");
    this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
    this.redScoreText = this.add.text(600, 16, '', { fontSize: '32px', fill: '#FF0000' });

    this.sound.add('collect');

    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.cursors = this.input.keyboard.createCursorKeys();


    this.socket.on('currentPlayers' , (players) => {
        Object.keys(players).forEach((id) => {
            if(players[id].playerId === this.socket.id) {
                addPlayer(this, players[id]);
            } else {
                addOtherPlayers(this, players[id]);
            }
        })
    })

    this.socket.on('newPlayer' , (playerInfo) => {
        addOtherPlayers(this, playerInfo);
    })

    this.socket.on('playerMoved' , (playerInfo) => {
        this.otherPlayers.getChildren().forEach((otherPlayer => {
            if(playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x , playerInfo.y);
                otherPlayer.setRotation(playerInfo.rotation);
            }
        }))
    });

    this.socket.on('starLocation' , (starLocation) => {
        if(this.star) {
            this.star.destroy();
        }

        this.star = this.physics.add.image(starLocation.x , starLocation.y , 'star');
        this.star.id = starLocation.id;

        this.physics.add.overlap(this.ship, this.star, () => {
            //this.star.destroy();
            this.sound.play('collect');
            this.socket.emit('starCollected' , this.star.id);
        } , null, this);
    });

    this.socket.on('scoreUpdate' , (scores) => {
        this.blueScoreText.setText('Blue : ' + scores.blue);
        this.redScoreText.setText('Red : ' + scores.red);
    });

    this.socket.on('disconnect' , (playerId) => {
        this.otherPlayers.getChildren().forEach((otherPlayer) => {
            if(playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });
}

function update() {

    if (this.ship) {
        let x = this.ship.x;
        let y = this.ship.y;
        let r = this.ship.rotation;


    
        if(this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', {x : this.ship.x, y : this.ship.y , rotation : this.ship.rotation})
        }
    
        this.ship.oldPosition = {
            x : this.ship.x,
            y : this.ship.y,
            rotation : this.ship.rotation
        }

        if (this.cursors.left.isDown) {
          this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
          this.ship.setAngularVelocity(150);
        } else {
          this.ship.setAngularVelocity(0);
        }
      
        if (this.cursors.up.isDown) {
          this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else {
          this.ship.setAcceleration(0);
        }
      
        this.physics.world.wrap(this.ship, 15);
      }
}

function addPlayer(self, playerInfo) {
    self.ship = self.physics.add.image(playerInfo.x , playerInfo.y , playerInfo.team === 'blue' ? 'ship1' : 'ship2', ).setOrigin(0.5, 0.5).setDisplaySize(50,50);

    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x , playerInfo.y, playerInfo.team === 'blue' ? 'otherPlayer1' : 'otherPlayer2').setOrigin(0.5, 0.5).setDisplaySize(50, 50);

    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}