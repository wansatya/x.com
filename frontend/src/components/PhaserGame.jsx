// src/components/PhaserGame.jsx
import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, signInWithGooglePopup } from "../utils/firebase"

import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query, where,
  doc,
} from "firebase/firestore";

class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
  }

  preload() {
    // Load any assets if needed
  }

  create() {
    const loginButton = this.add.text(100, 100, 'Login with Google', { fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.loginWithGoogle());

    const logoutButton = this.add.text(100, 150, 'Logout', { fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.logout());
  }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(result => {
        console.log('User signed in:', result.user);
        this.scene.start('MainScene');
      })
      .catch(error => {
        console.error('Error signing in:', error);
      });
  }

  logout() {
    signOut(auth)
      .then(() => {
        console.log('User signed out');
      })
      .catch(error => {
        console.error('Error signing out:', error);
      });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Load assets
  }

  create() {
    auth.onAuthStateChanged(user => {
      if (user) {
        this.add.text(100, 100, `Hello, ${user.displayName}`, { fill: '#0f0' });
      } else {
        this.scene.start('LoginScene');
      }
    });
  }
}

const PhaserGame = () => {
  const gameContainer = useRef(null);
  let [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  let [user, setUser] = useState(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'))
    return savedUser || null
  })

  let [uid, setUid] = useState(() => {
    const savedUser = localStorage.getItem('uid')
    return savedUser || null
  })

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  useEffect(() => {
    let player;
    let cursors;
    let scoreText;
    let energyText;
    let wasteItems;
    let energy = 5; // Initial energy
    let game;
    let energyTimer;
    let scoreTimer;
    let wasteTimer;
    let jumpCount = 0; // Counter for jumps
    let clouds; // Clouds group
    let sdg7, sdg11, sdg12, sdg13, sdg15;
    let gameOverText; // Declare the game over text object
    let pauseText;
    let restartButton;
    let loginButton;
    let highScoreText;
    let leftButton;
    let upButton;
    let rightButton;
    let collectSound; // Sound for collecting waste
    let countSound;
    let scoreSound;
    let overSound;
    let jumpSound;
    let runSound;
    let hitGround;
    let moveLeft = false;
    let moveRight = false;
    let jump = false;
    let pause = false;
    let targetX;
    let targetY;
    let isJumping = false;
    let lastDirection = "right";

    const config = {
      type: Phaser.AUTO,
      width: 600,
      height: 900,
      scale: {
        mode: Phaser.Scale.FIT,
        // autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // "render.transparent": true,
      backgroundColor: '#0F172A',
      /* scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      }, */
      parent: gameContainer.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 500 },
          debug: false
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    function preload() {
      // Load assets here
      this.load.image('background', '/assets/background.png');
      this.load.image('ground', '/assets/ground.png');
      this.load.image('waste1', '/assets/soda_can.png');
      this.load.image('waste2', '/assets/plastic_bottle.png');
      this.load.image('waste3', '/assets/waste_food.png');
      this.load.spritesheet('player', '/assets/dude.png', { frameWidth: 37, frameHeight: 47 });
      this.load.image('cloud', '/assets/drone.png'); // Cloud image
      this.load.image('sdg-7', '/assets/sdg-7.png');
      this.load.image('sdg-11', '/assets/sdg-11.png');
      this.load.image('sdg-12', '/assets/sdg-12.png');
      this.load.image('sdg-13', '/assets/sdg-13.png');
      this.load.image('sdg-15', '/assets/sdg-15.png');
      this.load.audio('collect', '/assets/sounds/kick.mp3'); // Collect sound
      this.load.audio('count', '/assets/sounds/fireball.mp3');
      this.load.audio('score', '/assets/sounds/coin.mp3');
      this.load.audio('gameover', '/assets/sounds/pause.wav');
      this.load.audio('jump', '/assets/sounds/jump.mp3');
      this.load.audio('run', '/assets/sounds/block-bump.wav');
      this.load.audio('hit', '/assets/sounds/goomba-stomp.wav');
      this.load.image('leftButton', '/assets/left.png');
      this.load.image('upButton', '/assets/up.png');
      this.load.image('rightButton', '/assets/right.png');
      this.load.image('pauseButton', '/assets/pause.png');

      /* this.load.spritesheet('bird', 'path/to/bird_sprite_sheet.png', {
        frameWidth: 32,   // Width of each frame
        frameHeight: 32   // Height of each frame
      }); */

      // Preload the custom font
      document.fonts.load('10pt "Press Start 2P"').then(() => {
        // console.log('Font loaded');
      });
    }

    function create() {
      // Initialize game object
      game = this;

      // Background
      sdg7 = this.add.image(this.game.config.width / 2 - 120, this.game.config.height - 70, 'sdg-7').setVisible(false);
      sdg11 = this.add.image(this.game.config.width / 2 - 60, this.game.config.height - 70, 'sdg-11').setVisible(false);
      sdg12 = this.add.image(this.game.config.width / 2, this.game.config.height - 70, 'sdg-12').setVisible(false);
      sdg13 = this.add.image(this.game.config.width / 2 + 60, this.game.config.height - 70, 'sdg-13').setVisible(false);
      sdg15 = this.add.image(this.game.config.width / 2 + 120, this.game.config.height - 70, 'sdg-15').setVisible(false);

      // Clouds
      const cloud = this.add.image(Phaser.Math.Between(0, 12), Phaser.Math.Between(0, 80), 'cloud', 0).setScale(0.45);
      this.tweens.add({
        targets: cloud,
        props: {
          x: { value: 700, duration: 4000, flipX: true },
          y: { value: 500, duration: 8000, },
        },
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });

      // Ground
      const ground = this.physics.add.staticGroup();
      // ground.create(Phaser.Math.Between(100, 600), 568, 'ground').setScale(2).refreshBody();
      ground.create(this.game.config.width / 2, this.game.config.height - 130, 'ground').setScale(0.95).refreshBody();

      // Create buttons
      // const pauseButton = this.add.image((window.innerWidth) - 30, 40, 'pauseButton').setInteractive();

      /* upButton = this.add.image(45, this.game.config.height - 70, 'upButton').setScale(1.5).setInteractive();
      leftButton = this.add.image((this.game.config.width / 2) + 25, this.game.config.height - 70, 'leftButton').setScale(1.2).setInteractive();
      rightButton = this.add.image((this.game.config.width / 2) + 125, this.game.config.height - 70, 'rightButton').setScale(1.2).setInteractive(); */

      // Button events
      /* pauseButton.on('pointerdown', () => {
        this.physics.pause();
        pauseText.setVisible(true);
      }); */

      /* leftButton.on('pointerdown', () => moveLeft = true);
      leftButton.on('pointerup', () => moveLeft = false);
      leftButton.on('pointerout', () => moveLeft = false);

      upButton.on('pointerdown', () => jump = true);
      upButton.on('pointerup', () => jump = false);

      rightButton.on('pointerdown', () => moveRight = true);
      rightButton.on('pointerup', () => moveRight = false);
      rightButton.on('pointerout', () => moveRight = false); */

      // Player (positioned in the middle of the ground)
      player = this.physics.add.sprite(this.game.config.width / 2, this.game.config.height - 320, 'player');
      player.setBounce(0.25);
      player.setCollideWorldBounds(true);
      player.setScale(1.2); // Adjust scale as needed
      player.body.setGravityY(150); // Additional gravity for the player

      // Waste (collectible items)
      wasteItems = this.physics.add.group();

      // Add initial waste items and handle collisions
      addInitialWasteItems();
      // this.physics.add.collider(wasteItems, ground);
      this.physics.add.collider(wasteItems, ground, handleWasteGroundCollision, null, this);

      // Colliders
      this.physics.add.collider(player, ground, () => {
        jumpCount = 0; // Reset jump count when player touches the ground
      });

      // Overlaps
      this.physics.add.overlap(player, wasteItems, collectWaste, null, this);

      // Player animations
      this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1
      });

      this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
        frameRate: 12,
        repeat: -1
      });

      this.anims.create({
        key: 'turn',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 9 }),
        frameRate: 4,
        repeat: -1
      });

      this.anims.create({
        key: 'dead',
        frames: [{ key: 'player', frame: 10 }],
        frameRate: 20
      });

      // Input events
      cursors = this.input.keyboard.createCursorKeys();

      // Add input event listener for pointer clicks
      this.input.on('pointerdown', function (pointer) {
        targetX = pointer.worldX;
        targetY = pointer.worldY;
        moveTo(targetX, targetY);
      }, this);

      // Score and Energy Text
      scoreText = this.add.text(16, 60, 'score : ' + score, { fontFamily: '"Press Start 2P"', fontSize: '24px', fill: '#DFFF00' });
      energyText = this.add.text(16, 26, 'energy: ' + energy, { fontFamily: '"Press Start 2P"', fontSize: '24px', fill: '#DFFF00' });

      pauseText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 80,
        `how to play:
        \n\n1. get energy by collecting dropped item.
        \n\n2. 5 energy earned per 1 collected item.
        \n\n3. items only last for 3 secs, so hurry!
        \n\n4. score added every 30 secs. good luck!`,
        {
          fontSize: '12px',
          fontFamily: '"Press Start 2P"',
          fill: '#D7DBDD',
          align: 'center'
        });
      pauseText.setOrigin(0.5);
      pauseText.setVisible(true);

      // Game Over Text (hidden initially)
      gameOverText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 100, 'game over', {
        fontSize: '32px',
        fontFamily: '"Press Start 2P"',
        fill: '#F4D03F',
        align: 'center'
      });
      gameOverText.setOrigin(0.5);
      gameOverText.setVisible(false); // Hide the game over text initially

      // Restart Button (hidden initially)
      restartButton = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 50, 'try again?', {
        fontSize: '18px',
        fill: '#34495E',
        fontFamily: '"Press Start 2P"',
        backgroundColor: '#ffffff',
        padding: { x: 20, y: 10 }
      });
      restartButton.setOrigin(0.5);
      restartButton.setVisible(false);
      restartButton.setInteractive({ useHandCursor: true });
      restartButton.on('pointerdown', () => {
        this.scene.restart();
        resetGame();
      });

      loginButton = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 5, user ? 'save high score?' : 'login with google', {
        fontSize: '13px',
        fill: '#fff',
        fontFamily: '"Press Start 2P"',
        backgroundColor: '#EA4335',
        padding: { x: 20, y: 10 }
      });
      loginButton.setOrigin(0.5);
      loginButton.setVisible(false);
      loginButton.setInteractive({ useHandCursor: true });
      loginButton.on('pointerdown', () => {
        user ? saveScore() : googleLogin();
      });

      highScoreText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, 'high score updated!',
        {
          fontSize: '12px',
          fontFamily: '"Press Start 2P"',
          fill: '#D7DBDD',
          align: 'center'
        });
      highScoreText.setOrigin(0.5);
      highScoreText.setVisible(false);

      this.add.text(10, this.game.config.height - 22, 'wansatya production @ ' + new Date().getFullYear() + ".",
        { fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#fff' })
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          window.open('https://linkedin.com/in/wawanbsetyawan', '_blank');
        });

      this.add.text(16, 10, user ? 'hi, ' + user.displayName.toLowerCase() : 'login to save your high score..',
        { fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#F4D03F' })

      // Decrease energy over time
      energyTimer = this.time.addEvent({
        delay: 1000, // Every second
        callback: decreaseEnergy,
        callbackScope: this,
        loop: true
      });

      // Increase score every 30 seconds
      scoreTimer = this.time.addEvent({
        delay: 30000, // Every 30 seconds
        callback: increaseScore,
        callbackScope: this,
        loop: true
      });

      // Timer for waste items respawn
      wasteTimer = this.time.addEvent({
        delay: Phaser.Math.Between(18000, 35000),
        callback: addInitialWasteItems,
        loop: true,
      });

      // Sound effect
      collectSound = this.sound.add('collect', { volume: 1.25 });
      countSound = this.sound.add('count', { volume: 1.25 });
      scoreSound = this.sound.add('score', { volume: 0.25 });
      overSound = this.sound.add('gameover');
      jumpSound = this.sound.add('jump', { volume: 0.35 });
      runSound = this.sound.add('run');
      hitGround = this.sound.add('hit', { volume: 1.8 });

    }

    function update() {
      const savedUser = JSON.parse(localStorage.getItem('user'))
      setUser(savedUser)

      const savedUid = localStorage.getItem('uid')
      setUid(savedUid)

      if (gameOver) {
        player.anims.play('dead');
        return;
      } else {

        /* if (cursors.left.isDown) {
          player.setVelocityX(-100);
          player.anims.play('left', true);
        } else if (cursors.right.isDown) {
          player.setVelocityX(100);
          player.anims.play('right', true);
        } else {
          player.setVelocityX(0);
          player.anims.play('turn', true);
        }

        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
          jumpSound.play();

          if (player.body.touching.down || jumpCount < 2) {
            player.setVelocityY(-350); // Adjusted jump velocity for more realistic jumps
            jumpCount++;
          }
        } */

        // Check if player is touching the ground
        if (player.body.touching.down) {
          if (isJumping) {
            // Stop the player if they were jumping
            player.setVelocity(0);
            player.anims.play('turn', true);
            isJumping = false;
            lastDirection = player.flipX ? 'left' : 'right'; // Update last direction
          } else {
            // Play walking animations if moving horizontally
            if (player.body.velocity.x > 0) {
              player.anims.play('right', true);
              lastDirection = 'right'; // Update last direction
            } else if (player.body.velocity.x < 0) {
              player.anims.play('left', true);
              lastDirection = 'left'; // Update last direction
            } else {
              // If not moving horizontally, stop animation
              player.anims.play('turn', true);
            }
          }
        } else {
          player.anims.play('turn', true);
          isJumping = true; // Set jumping state
          // Play jump animation if in the air
          // jumpSound.play();
        }

      }
    }

    function moveTo(targetX, targetY) {
      const walkSpeed = 120; // Speed for walking
      const jumpSpeed = 250; // Speed for jumping

      // Calculate the direction vector from the player to the target
      const directionX = targetX - player.x;
      const directionY = targetY - player.y;

      // Check if the target position requires a jump
      const isJumping = directionY < -10; // Threshold to determine if jumping

      // Calculate the distance to the target
      const distance = Math.sqrt(directionX * directionX + directionY * directionY);

      // Normalize the direction vector and multiply by the appropriate speed
      const speed = isJumping ? jumpSpeed : walkSpeed;
      const velocityX = (directionX / distance) * speed;
      const velocityY = (directionY / distance) * speed;

      // Set the player's velocity
      player.setVelocity(velocityX, velocityY);
    }

    function collectWaste(player, waste) {
      // Play collect sound
      collectSound.play();

      waste.disableBody(true, true);
      energy += 5; // Increase energy
      energyText.setText('energy: ' + energy);
    }

    function decreaseEnergy() {
      if (gameOver) {
        energyTimer.remove(false); // Stop the energy timer
        scoreTimer.remove(false); // Stop the score timer
        return;
      }

      energy -= 1;
      energyText.setText('energy: ' + energy);

      countSound.play();

      if (energy == 0) {
        this.physics.pause();
        player.anims.stop(); // Stop all animations
        gameOverLogic();
      }
    }

    function increaseScore() {
      if (gameOver) {
        energyTimer.remove(false); // Stop the energy timer
        scoreTimer.remove(false); // Stop the score timer
        return;
      }

      score += 1;
      scoreText.setText('score : ' + score);
      setScore(score)

      scoreSound.play();
    }

    function gameOverLogic() {
      setGameOver(true);
      player.setTint(0xff0000);
      player.anims.play('dead');
      energyTimer.remove(false); // Stop the energy timer
      scoreTimer.remove(false); // Stop the score timer
      wasteTimer.remove(false); // Stop the waste timer
      cursors.left.reset();
      cursors.right.reset();
      cursors.up.reset();
      jumpSound.stop();

      /* leftButton.setVisible(false);
      upButton.setVisible(false);
      rightButton.setVisible(false); */

      sdg7.setVisible(true)
      sdg11.setVisible(true)
      sdg12.setVisible(true)
      sdg13.setVisible(true)
      sdg15.setVisible(true)

      // Display game over text
      gameOverText.setVisible(true); // Show the game over text
      restartButton.setVisible(true); // Show the restart button
      loginButton.setVisible(true)
      pauseText.setVisible(false);

      overSound.play();

      // Save score to leaderboard logic
    }

    function addInitialWasteItems() {
      const wasteTypes = ['waste1', 'waste2', 'waste3'];
      for (let i = 0; i < Phaser.Math.Between(5, 12); i++) {
        const x = Phaser.Math.Between(0, 360);
        const wasteType = Phaser.Utils.Array.GetRandom(wasteTypes);
        const waste = wasteItems.create(x, 0, wasteType);
        waste.setBounceY(Phaser.Math.FloatBetween(0.4, 0.9));
        waste.setScale(1); // Adjust scale as needed
      }
    }

    function handleWasteGroundCollision(wasteItem) {
      hitGround.play();
      // Start timer to remove the waste item after 5 seconds
      startWasteTimer(wasteItem);
    }

    function startWasteTimer(wasteItem) {
      // Timer to remove waste item after 3 seconds
      game.time.delayedCall(3000, () => {
        wasteItem.destroy();
      }, [], this);
    }

    function resetGame() {
      setScore(0);
      setGameOver(false);
      energy = 5;
      jumpCount = 0;
      scoreText.setText('score : 0');
      energyText.setText('energy: 5');
      gameOverText.setVisible(false);
      restartButton.setVisible(false);
      loginButton.setVisible(false)

      // Add initial waste items again
      addInitialWasteItems();

      // Restart energy and score timers
      energyTimer = game.time.addEvent({
        delay: 1000,
        callback: decreaseEnergy,
        callbackScope: game,
        loop: true
      });

      scoreTimer = game.time.addEvent({
        delay: 30000,
        callback: increaseScore,
        callbackScope: game,
        loop: true
      });
    }

    async function googleLogin() {
      const response = await signInWithGooglePopup();
      // console.log(response.user);
      const user = response.user;
      // console.log(user)
      if (user.metadata.createdAt === user.metadata.lastLoginAt) {
        setDoc(doc(db, "users", response.user.uid), user.providerData[0]);
      } else {
        updateDoc(doc(db, "users", response.user.uid), { lastLogin: new Date().getTime(), ...user.providerData[0] });
      }

      setUser(user.providerData[0]);
      setUid(response.user.uid)
      localStorage.setItem('uid', response.user.uid)
      localStorage.setItem('user', JSON.stringify(user.providerData[0]))
    }

    async function saveScore() {
      await updateDoc(doc(db, "users", uid), {
        highScore: +score
      });
      loginButton.setVisible(false)
      highScoreText.setVisible(true)
      game.time.delayedCall(3000, () => {
        highScoreText.setVisible(false)
        loginButton.setVisible(true)
      }, [], this);
    };

    // Initialize Phaser game instance
    const gameInstance = new Phaser.Game(config);

    // Clean up on component unmount
    return () => {
      gameInstance.destroy(true);
    };
  }, []);

  return (
    <div ref={gameContainer} className="w-full h-full" />
  );
};

export default PhaserGame;
