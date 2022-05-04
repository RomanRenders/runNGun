const canvas = document.getElementById("canvas1");
const cxt = canvas.getContext("2d");
const CANVAS_WIDTH = (canvas.width = 800);
const CANVAS_HEIGHT = (canvas.height = 700);

let enemySpeed = 5;
let sheepFrame = 15; // also used for gordum
let enemiesInterval = 600; // character rate of spawn, decreases gradually, SEE LINE 443
let minInterval = 120;
let rateOfSpawn = 50;

let winningScore = 50;

let currentLevel = 1;

let frame = 0;

let gameOver = false;
let paused = false;
let score = 0;

let gameSpeed = 2;

const characterArray = [];
const projectiles = [];

// NEW BACKGROUND SHIT
const backgroundLayer1 = new Image();
backgroundLayer1.src = "src/images/background.png";
const foregroundLayer1 = new Image();
foregroundLayer1.src = "src/images/foreground2.png";

class Layer {
  constructor(image, speedModifier, yStart, stretch) {
    this.x = 0;
    this.y = yStart;
    this.width = 910 + stretch;
    this.height = 700;
    this.image = image;
    this.speedModifier = speedModifier;
    this.speed = gameSpeed * this.speedModifier;
  }
  update() {
    this.speed = gameSpeed * this.speedModifier;
    if (this.x <= -this.width) {
      this.x = 0;
    }
    this.x = this.x - this.speed;
  }
  draw() {
    cxt.drawImage(this.image, this.x, this.y, this.width, this.height);
    cxt.drawImage(
      this.image,
      this.x + this.width,
      this.y,
      this.width,
      this.height
    );
  }
}

const layer1 = new Layer(backgroundLayer1, 1, -300, 300);
const layer2 = new Layer(foregroundLayer1, 1.5, -100, 100);

const gameObjects = [layer1, layer2];

function newPhase() {
  minInterval -= 10;
  rateOfSpawn -= 5;
  currentLevel++;
  winningScore *= 1.5;
  enemySpeed += 1;
  sheepFrame -= 1; // increases running animation speed
}

// keyboard keys
class InputHandler {
  constructor(sheep, bullet) {
    document.addEventListener("keydown", (event) => {
      switch (event.keyCode) {
        case 65:
          sheep.shooting = true;
      }
    });

    document.addEventListener("keyup", (event) => {
      switch (event.keyCode) {
        case 65:
          sheep.shooting = false;
          break;

        case 27:
          togglePause();
          break;
      }
    });
  }
}

// FLOOR; FIX THIS SHIT
class Floor {
  constructor() {
    this.y = canvas.height - 150;
    this.x = 0;
    this.width = canvas.width;
    this.height = canvas.height / 2;
  }
  draw() {
    cxt.fillStyle = "yellow";
    cxt.fillRect(this.x, this.y, this.width, this.height);
  }
}

let floor = new Floor();
function handleFloor() {
  floor.draw();
}

// NEW GUN SHIT
const gun = new Image();
gun.src = "/src/images/gunFrames3.png";

class Gun {
  constructor(x) {
    this.width = 190;
    this.height = 130;
    this.x = x;
    this.y = floor.y - 105;

    this.frameX = 0;
    this.frameY = 0;
    this.spriteWidth = 202;
    this.spriteHeight = 200;
    this.minFrame = 0;
    this.maxFrame = 5; // new shit for the gun animation
  }

  draw() {
    cxt.drawImage(
      gun,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }

  update() {
    if (sheep1.shooting) {
      if (this.frameX < this.maxFrame) this.frameX++;
      else this.frameX = this.minFrame;
    } else {
      this.frameX = this.minFrame;
    }
  }
}

let gun1 = new Gun(202);

function handleGun() {
  gun1.update();
  gun1.draw();
}

// BULLETS
class Projectile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 5;
    this.speed = 5;

    this.sound = new Audio(); // VERY SIMPLE TO ADD SOUND EFFECTS, JUST LIKE IMAGES
    this.sound.src = "/src/sounds/Futuristic Shotgun Single Shot.wav";
  }
  update() {
    this.x += this.speed;
  }

  draw() {
    cxt.fillStyle = "black";
    cxt.beginPath();
    cxt.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    cxt.fill();
  }
}

function handleProjectile() {
  for (let i = 0; i < projectiles.length; i++) {
    projectiles[i].update();
    projectiles[i].draw();
    projectiles[i].sound.play(); // Sound is played here

    for (let j = 0; j < characterArray.length; j++) {
      if (
        characterArray[j] &&
        projectiles[i] &&
        collision(projectiles[i], characterArray[j])
      ) {
        score += characterArray[j].scoreAtDeath; // SCORE CHANGES BASED ON CHARACTER KILLED

        projectiles.splice(i, 1);
        i--;
        characterArray.splice(j, 1);
        j--;
      }
    }

    if (projectiles[i] && projectiles[i].x > canvas.width - 100) {
      projectiles.splice(i, 1);
      i--;
    }
  }
}

// DEFENDER
const warren = new Image();
warren.src = "/src/images/warrenSheet6.png";

class Defender {
  constructor(x) {
    this.width = 200;
    this.height = 200;
    this.x = x;
    this.y = floor.y - 140;
    this.shooting = false;
    this.projectiles = [];
    this.timer = 0;

    this.frameX = 0;
    this.frameY = 0;
    this.spriteWidth = 302;
    this.spriteHeight = 300;
    this.minFrame = 0;
    this.maxFrame = 3; // new shit for the sheep animation

    this.deathSound = new Audio();
    this.deathSound.src = "/src/sounds/Scream 3.wav"; // new death sound
  }

  draw() {
    cxt.drawImage(
      warren,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height
    ); // ^^ ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }

  update() {
    if (frame % sheepFrame === 0) {
      if (this.frameX < this.maxFrame) this.frameX++;
      else this.frameX = this.minFrame;
    } // run animation

    if (this.shooting) {
      this.timer++;
      if (this.timer % 10 === 0 && score < winningScore) {
        projectiles.push(new Projectile(this.x + this.width - 20, this.y + 55));
      }
    } else {
      this.timer = 0;
    }
  }
}

let sheep1 = new Defender(200);
new InputHandler(sheep1);

function handleDefenders() {
  sheep1.update();
  sheep1.draw();
}

// gordum

// NEW FATBITCH SHIT, REMOVE WHITE BACKGROUND FROM LAST IMAGE
const gordum = new Image();
gordum.src = "/src/images/gordumSheet4.png";

class Gordum {
  constructor(x) {
    this.width = 400;
    this.height = 400;
    this.x = x;
    this.y = floor.y - 290;
    this.timer = 0;

    this.frameX = 0;
    this.frameY = 0;
    this.spriteWidth = 241;
    this.spriteHeight = 320;
    this.minFrame = 0;
    this.maxFrame = 3; // new shit for the sheep animation

    this.speed = 240;
  }

  draw() {
    cxt.drawImage(
      gordum,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }

  update() {
    if (frame % sheepFrame === 0) {
      if (this.frameX < this.maxFrame) this.frameX++;
      else this.frameX = this.minFrame;
    } // run animation
  }

  move() {
    this.x += this.speed; // NEW MOVE FUNCTION USED AT GAMEOVER
  }
}

let gordum1 = new Gordum(-150);

function handleGordum() {
  gordum1.update();
  gordum1.draw();
}

// characters

const fatBoySse = new Image();
fatBoySse.src = "/src/images/character1.png";
const jcole = new Image();
jcole.src = "/src/images/character2.png";
const tonyMontana = new Image();
tonyMontana.src = "/src/images/character3.png";
const granny = new Image();
granny.src = "/src/images/character4.png";
const lingling = new Image();
lingling.src = "/src/images/character5.png";
const nasX = new Image();
nasX.src = "/src/images/character6.png";
const nasX2 = new Image();
nasX2.src = "/src/images/character6P2.png";
const oprah = new Image();
oprah.src = "/src/images/character7.png";
const hawking = new Image();
hawking.src = "/src/images/character8.png";

const characterTypes = [];

const char1 = [fatBoySse, true, enemySpeed, 10]; // image, friendliness, speed, points
const char2 = [jcole, true, enemySpeed, 10];
const char3 = [tonyMontana, true, enemySpeed, 10];
const char4 = [granny, false, enemySpeed, 10];
const char5 = [lingling, false, enemySpeed, 10];
const char6 = [nasX, false, enemySpeed, 10];
const char7 = [nasX2, false, enemySpeed, 10];
const char8 = [oprah, false, enemySpeed, 10];
const char9 = [hawking, false, enemySpeed, 10];

characterTypes.push(
  char1,
  char2,
  char3,
  char4,
  char5,
  char6,
  char7,
  char8,
  char9
);

class Character {
  constructor() {
    this.character =
      characterTypes[Math.floor(Math.random() * characterTypes.length)];

    this.width = 200;
    this.height = 110;

    this.image = this.character[0];
    this.friendly = this.character[1];
    this.speed = this.character[2];
    this.scoreAtDeath = this.character[3];

    this.distanceX = Math.floor(Math.random() * 2);

    this.x = canvas.width + this.distanceX;
    this.y = floor.y - this.height;

    this.markedForDeletion = false;

    this.moving = true;
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    cxt.drawImage(this.image, this.x, this.y, this.width, this.height);
  }
}

function handleCharacter() {
  for (let i = 0; i < characterArray.length; i++) {
    let current = characterArray[i];
    if (current.moving) current.update();
    current.draw();

    if (current.markedForDeletion) {
      characterArray.splice(i, 1);
      i--;
    }

    if (!current.friendly && current.x < sheep1.x + sheep1.width - 50) {
      // HERE'S THE COLLISION DETECTION
      gordum1.frameX = 4;
      gordum1.move(); // move gordum; her's is always frame 4 at gameOver
      gameOver = true;
    }

    if (paused) {
      current.moving = false;
    } else {
      current.moving = true;
    }
  }

  if (frame % enemiesInterval === 0 && score < winningScore) {
    characterArray.push(new Character()); // HERE'S WHERE CHARACTERS ARE ADDDED, ALSO WHERE SPAWN RATE GETS DECREASED
    if (enemiesInterval > minInterval) enemiesInterval -= rateOfSpawn;
  }
}

// utilities
function handleGameStatus() {
  cxt.fillStyle = "black";
  cxt.font = "30px Orbitron";
  cxt.fillText("Score: " + score, 20, 40);

  cxt.fillStyle = "black";
  cxt.font = "30px Orbitron";
  cxt.fillText("Level: " + currentLevel, 250, 40);

  cxt.fillStyle = "black";
  cxt.font = "30px Orbitron";
  cxt.fillText("Speed: " + enemySpeed, 450, 40);

  if (gameOver) {
    cxt.fillStyle = "black";
    cxt.font = "90px Orbitron";
    cxt.fillText("GAME OVER", 135, 300);
    sheep1.deathSound.play(); // play death sound at game over
  }

  if (paused) {
    cxt.fillStyle = "black";
    cxt.font = "90px Orbitron";
    cxt.fillText("PAUSED", 135, 330);
  } // NEW PAUSED SCREEN

  if (score >= winningScore) {
    newPhase();
  }
}

function togglePause() {
  if (!paused) {
    paused = true;
  } else {
    paused = false;
  }
}

function animate() {
  cxt.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  //aNIMATE BACKGROUND
  gameObjects.forEach((object) => {
    object.update();
    object.draw();
  });
  handleDefenders();
  handleProjectile();
  handleGun();
  handleCharacter();
  handleGordum();

  handleGameStatus();

  if (!gameOver) {
    requestAnimationFrame(animate);
  }
  if (!paused) {
    frame++;
  }
}

animate();

function collision(bullet, character) {
  if (
    bullet.x + bullet.size > character.x &&
    character.x > sheep1.x + sheep1.width
  ) {
    return true;
  }
}
