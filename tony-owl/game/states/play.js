'use strict';

var Ground = require('../prefabs/ground.js')
var Owl = require('../prefabs/owl.js')
var Negaowl = require('../prefabs/negaowl.js')
var Animation = require('../animations/cut1.js')

var die_music;
var hurt_music;

var GAME_HEIGHT = 600;
var GROUND_HEIGHT = 50;

var THROWING_HEIGHT_MIN = GAME_HEIGHT / 4;
var THROWING_HEIGHT_MAX = GAME_HEIGHT - GROUND_HEIGHT;

var THROWING_DELAY_MIN = 0.5 * Phaser.Timer.SECOND;
var THROWING_DELAY_MAX = 2 * Phaser.Timer.SECOND;

var PARTICLE_LIFESPAN_WHEN_COUNTER_ATTACK = 3 * Phaser.Timer.SECOND;

var START_POSITION_X = 200; // DEBUG : 15000
var START_POSITION_Y = GAME_HEIGHT - 200;

var first_try = true;

function Play() {
}
Play.prototype = {
	create : function() {
		// Generating world and physics
		this.game.physics.startSystem(Phaser.Physics.ARCADE);
		this.game.physics.arcade.gravity.y = 3000;

		this.map = this.game.add.tilemap('level1');
		this.map.addTilesetImage('tiles32', 'tiles');

		// settings collision with certain tiles of tilesets.
		this.map.setCollisionBetween(0, 5);
		// not colliding from the bottom
		this.map.forEach(function(tile) {
			if (tile.index === 1 ) {
				tile.collideDown = false;  }
			})

		this.layer = this.map.createLayer('Calque1');
		this.invisibleLayer = this.map.createLayer('invisible walls');
		this.invisibleLayer.visible = false;
		this.map.setCollision(5, true, this.invisibleLayer);

		this.layer.resizeWorld();

		// adding owl (player) to game
		this.owl = new Owl(this.game, START_POSITION_X, START_POSITION_Y);
		this.game.add.existing(this.owl);
		this.game.camera.follow(this.owl);
		this.owl.events.onKilled.add(onDie, this.owl);

		// keep the spacebar from propagating up to the browser
		this.game.input.keyboard.addKeyCapture([ Phaser.Keyboard.SPACEBAR,
				Phaser.Keyboard.UP ]);

		// add keyboard controls
		var trickKey = this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		trickKey.onDown.add(this.owl.trick, this.owl);
		var protectKey = this.input.keyboard.addKey(Phaser.Keyboard.A);
		protectKey.onDown.add(this.owl.protect, this.owl);
		var blastKey = this.input.keyboard.addKey(Phaser.Keyboard.Z);
		blastKey.onDown.add(this.owl.blast, this.owl);
		var jumpKey = this.input.keyboard.addKey(Phaser.Keyboard.UP);
		jumpKey.onDown.add(this.owl.jump, this.owl);
		this.input.keyboard.addKey(Phaser.Keyboard.P).onDown.add(toggle_pause, this);
		
		
		// RETRY BUTTON
		var retryButton;
		retryButton = this.game.add.text(700, 50, 'retry',{
			font : "25px Arial",
			fill : "#ff0044"
		});
		retryButton.inputEnabled = true;
		retryButton.events.onInputUp.add(function(){
			respawn(this.owl);
		}, this);
		retryButton.fixedToCamera = true;
		
		// PAUSE CONFIGURATION
		var pauseButton;
		pauseButton = this.game.add.text(700, 10, 'Pause', {
			font : "25px Arial",
			fill : "#ff0044"
		});
		pauseButton.inputEnabled = true;
		pauseButton.events.onInputUp.add(pause, this);
		this.game.input.onDown.add(unpause, this);
		pauseButton.fixedToCamera = true;
		
		this.pausedText = this.game.add.text(this.game.width/2, this.game.height/2, 'PAUSE', {
			font : "65px Arial",
			fill : "#ff0044"
		});
		this.pausedText.visible=false;
		this.pausedText.fixedToCamera = true;
		this.pausedText.anchor.x=0.5;
		this.pausedText.anchor.y=0.5;

		// add boss at the end of the map
		this.boss = new Negaowl(this.game, this.game.world.width - 379, 0);
		this.game.add.existing(this.boss);
		this.boss.events.onKilled.add(winning, this);
		// Boss starts to attack.
		this.boss.release_hell();

		// emitters
		this.ampliEmitter = this.boss.ampliEmitter;
		this.guitarGroup = this.boss.guitarGroup;
		
		// level animation
		this.cutscene = true;
		var animation = new Animation(this.game);
		animation.onComplete.add(function(){this.cutscene = false;this.owl.body.immovable = false;}, this);
		if (first_try && this.cutscene) {
			animation.start();
		}

		die_music = this.game.add.audio('die');
		hurt_music = this.game.add.audio('hurt');

	},
	update : function() {
		// collision with environment
		this.game.physics.arcade.collide(this.boss, this.layer);
		this.game.physics.arcade.collide(this.owl, this.layer);
//		this.game.physics.arcade.collide(this.owl.explosionEmitter, this.layer);
		this.game.physics.arcade.collide(this.ampliEmitter,
				this.invisibleLayer, onAmpliCollisionWithGround);
		
		// slowing down particles once player hit throwable to hurt the boss
		this.boss.ampliEmitter.forEachAlive(processThrowablesInGame, this);
		this.guitarGroup.forEach(function(emitter){
			emitter.forEachAlive(processThrowablesInGame, this);
			}, this);

		// collision for boss with throwables
		collideGroup(this.game, this.guitarGroup, this.boss, hurtBoss, this);
		this.game.physics.arcade.collide(this.ampliEmitter, this.boss,
				hurtBoss, checkSentByPlayerCallback, this);
		this.game.physics.arcade.overlap(this.ampliEmitter, this.owl, hurtOwl,
				null, this);
		
		// overlapping guitars for player (owl) with throwables hurts.
		overlapGroup(this.game, this.guitarGroup, this.owl, hurtOwl, this)

		// constraints to keep player in game
		if (this.owl.body.position.x < 0) {
			this.owl.body.position.x = 0;
			// Cheat code !
			if (this.owl.body.position.y < 80) {
				this.owl.body.position.x = 15000;
				this.owl.body.position.y = 100;
			}
		} else if (this.owl.body.position.x > this.game.world.width
				- this.owl.body.width) {
			this.owl.body.position.x = this.game.world.width
					- this.owl.body.width;
		}
		if (this.owl.body.position.y > this.game.height) {
			onDie(this.owl);
		}

		if (!this.cutscene) {
			
			// boss emitters position update
			if ((this.game.camera.x + this.game.width) < this.boss.position.x) {
				this.ampliEmitter.emitX  = this.game.camera.x + 4/3*this.game.width;
				this.guitarGroup.forEach(function(emitter){
					emitter.emitX  = this.game.camera.x + 4/3*this.game.width;
				}, this);
			}
			else{
				this.ampliEmitter.emitX = this.boss.position.x;		
				this.guitarGroup.forEach(function(emitter){
					emitter.emitX  = this.boss.position.x;
				}, this);
			}
			// Player moves
			var cursors = this.game.input.keyboard.createCursorKeys();
			if (cursors.right.isDown) {
				this.owl.move("RIGHT");
			} else if (cursors.left.isDown) {
				this.owl.move("LEFT");
			} else {
				this.owl.move(null);
			}
			
		}
		
		
		// When player attacks he is immuned and throw things to the boss.
		
		if (this.owl.protecting) {
			this.game.physics.arcade.collide(this.owl, this.ampliEmitter,
					onAttackToThrowables);
			collideGroup(this.game, this.guitarGroup, this.owl, onAttackToThrowables, this);
		}
		
		this.game.physics.arcade.collide(this.owl.explosionEmitter, this.ampliEmitter, onAttackToThrowables, checkSentByPlayerCallback, this);
		this.guitarGroup.forEachAlive(function(emitter){
			this.game.physics.arcade.collide(this.owl.explosionEmitter, emitter, onAttackToThrowables, checkSentByPlayerCallback, this);
		}, this)
		
//	    if (this.owl.blasting) {
//			this.game.physics.arcade.collide(this.ampliEmitter,this.owl.explosionEmitter,
//					onAttackToThrowables);
//			this.guitarGroup.forEachAlive(function(emitter){
//				this.game.physics.arcade.collide(emitter, this.owl.explosionEmitter,
//					onAttackToThrowables);
//					}, this)
//			
//		}
		
		
		// pause menu
		if (this.game.paused) {
			this.pausedText.visible = true;
		}
		else {
			this.pausedText.visible = false;
		}
		
		// setting back to normal dead particles
		this.ampliEmitter.forEachDead(function(particle){
			particle.isSentByPlayer = false;
			}, this);
		this.guitarGroup.forEach(function(emitter){emitter.forEachDead(function(particle){
			particle.isSentByPlayer = false;
			}, this)}, this);
	},

	render : function() {
// this.game.debug.text('attacking : ' + this.owl.attacking, 10, 50);
// this.game.debug.text('nextAttack : ' + this.owl.nextAttack, 10, 100);
		this.game.debug.text('tony : ' + this.owl.health, 10, 25);
		this.game.debug.text('negaowl : ' + this.boss.health, 10, 50);
		this.game.debug.text('tricksometer : ' + this.owl.tricks, 10, 75);
		this.game.debug.text('arrows : move', 200, 25);
		this.game.debug.text('SPACEBAR in mid air : trick', 200, 50);
		this.game.debug.text('A : Protect', 200, 75);
		this.game.debug.text('Z : Blast', 200, 100);
//		this.game.debug.text('explosionX : '+this.owl.explosionEmitter.emitX, 10, 100);
//		this.game.debug.text('explosionY : '+this.owl.explosionEmitter.emitY, 10, 125);
		
// var game = this.game;
// this.owl.explosionEmitter.forEachAlive(function(particle) {
// game.debug.body(particle, 'red', false);
// game.debug.text(particle.body.velocity, 10, 150);
// }, this);
// this.owl.explosionEmitter.forEachAlive(this.game.debug.body, this);
//		this.game.debug.bodyInfo(this.owl, 10, 150);


	},
	paused : function(){
		this.pausedText.visible = true
	}
};

function collideGroup(game, group, other, callback, context) {
	for (var i = 0; i < group.children.length; i++) {
		var item = group.children[i];
		game.physics.arcade.collide(other, item, callback, null, context);
	}
};

function overlapGroup(game, group, other, callback, context) {
	// enabling gameover callback for all guitars.
	for (var i = 0; i < group.children.length; i++) {
		var item = group.children[i];
		game.physics.arcade.overlap(other, item, callback, null, context);
	}
};

function winning() {
	this.game.sound.stopAll();
	console.log('WIIIIIN');
	this.game.state.start('win');
};

function pause() {
		this.game.paused = true;
};

function unpause() {
	if (this.game.paused){
		this.game.paused = false;
	}
}
function toggle_pause(){
	this.game.paused = !this.game.paused;
}

function onAmpliCollisionWithGround(ampli, obj) {
//	ampli.animations.stop('emitting-nega');
	if (ampli.isSentByPlayer) {
		ampli.animations.play('roll-and-burn', null, true);		
	}
	else {
		ampli.animations.play('roll-and-burn-nega', null, true);
	}
};

function onDie(player) {
	first_try = false;

	die_music.play();
	respawn(player);
}

function respawn(player) {
	player.tricks = 0;
	player.position.x = START_POSITION_X;
	player.position.y = START_POSITION_Y;
	player.revive();
};

function checkSentByPlayerCallback(first, second) {
	return first.isSentByPlayer || second.isSentByPlayer;
}

function onAttackToThrowables(player, obj) {
	obj.isSentByPlayer = true;
	obj.lifespan = PARTICLE_LIFESPAN_WHEN_COUNTER_ATTACK;
	obj.body.angularVelocity = -obj.body.angularVelocity;
	obj.body.velocity.x = player.STRENGTH;
};

function velocity(vx, vy){
	return Math.sqrt(vx^2+vy^2);
};

function processThrowablesInGame(particle) {
	if (particle.isSentByPlayer) {	
		particle.body.velocity.x -= particle.body.velocity.x * 0.01;
		var anim = particle.animations.currentAnim;
		
		if (anim && anim.name.endsWith("nega")) {
			var nega_anim = particle.animations.getAnimation(anim.name.replace("-nega",""));
			nega_anim.play(20, true);
		}
	}
}

function slowDownThrowable(particle) {
	if (particle.isSentByPlayer) {	
		particle.body.velocity.x -= particle.body.velocity.x * 0.01;
	}
};

function hurtOwl(owl, enemy) {
	if (!owl.immune && !owl.attacking && !enemy.isSentByPlayer) {
		owl.immune = true;
		owl.alpha = 0.5;
		owl.damage(1);
		this.boss.health++;
		hurt_music.play();
		this.game.time.events.add(800, function() {
			owl.immune = false;
			owl.alpha = 1;
		}, this);
	}

}; 

function hurtBoss(boss, throwable) {
	console.log('boss is touched !');
	throwable.destroy();
	boss.damage(1);
	this.owl.health++;
	console.log('health boss : ', boss.health);
};

module.exports = Play;
