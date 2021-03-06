'use strict';

var Guitar = require('../prefabs/guitar.js')
var AmpliParticle = require('../prefabs/ampli_particle.js')

var PARTICLES_AMPLI = 50;
var GUITAR_PER_ROW_MAX = 50;

var GUITAR_LIFESPAN = 0;
var AMPLI_LIFESPAN = 0;

var THROWING_VELOCITY_AMPLI_MIN = -200;
var THROWING_VELOCITY_AMPLI_MAX = -250;

var THROWING_VELOCITY_GUITAR_MIN = -100;
var THROWING_VELOCITY_GUITAR_MAX = -300;

var THROWING_GUITAR_DELAY_MIN = 3 * Phaser.Timer.SECOND;
var THROWING_GUITAR_DELAY_MAX = 10 * Phaser.Timer.SECOND;

var BOSS_HEALTH = 5;

var Negaowl = function(game, x, y, frame) {
	Phaser.Sprite.call(this, game, x, y, 'negaowl', frame);

	// TODO: add boss animation
	game.physics.arcade.enableBody(this);
	this.body.immovable = true;
	// this.body.moves = false;
	this.animations.add('standing', null, 10, true);
//	this.animations.add('dead', null, 10, false);
	this.animations.play('standing');
	this.tweenKill = this.game.add.tween(this).to({
		alpha : 0
	}, 1000, Phaser.Easing.Linear.None);
	
	
	this.tweenHurt = this.game.add.tween(this)

	// HEALTH
	this.health = BOSS_HEALTH;
	this.maxHealth = BOSS_HEALTH;

	// ampli emitter
	this.ampliEmitter = this.game.add.emitter(this.position.x,
			2 * this.height / 3, PARTICLES_AMPLI);
	this.ampliEmitter.height = 100;
	this.ampliEmitter.particleClass = AmpliParticle;
	this.ampliEmitter.makeParticles('ampli', 0, PARTICLES_AMPLI, true);
	this.ampliEmitter.minParticleSpeed.set(THROWING_VELOCITY_AMPLI_MIN, 0);
	this.ampliEmitter.maxParticleSpeed.set(THROWING_VELOCITY_AMPLI_MAX, 0);
	this.ampliEmitter.gravity = 1200;
	this.ampliEmitter.minRotation = 0;
	this.ampliEmitter.maxRotation = 0;

	this.ampliEmitter.forEach(killParticle, this);

	this.guitarUp = new Guitar(THROWING_VELOCITY_GUITAR_MIN,
			THROWING_VELOCITY_GUITAR_MAX, this.game, this.position.x, 100,
			GUITAR_PER_ROW_MAX);
	this.guitarMiddle = new Guitar(THROWING_VELOCITY_GUITAR_MIN,
			THROWING_VELOCITY_GUITAR_MAX, this.game, this.position.x, 250,
			GUITAR_PER_ROW_MAX);
	this.guitarDown = new Guitar(THROWING_VELOCITY_GUITAR_MIN,
			THROWING_VELOCITY_GUITAR_MAX, this.game, this.position.x, 400,
			GUITAR_PER_ROW_MAX);

	this.guitarGroup = this.game.add.group();
	this.guitarGroup.add(this.guitarUp.emitter);
	this.guitarGroup.add(this.guitarMiddle.emitter);
	this.guitarGroup.add(this.guitarDown.emitter);

	this.guitarGroup.forEach(EmitterKillOutOfBound, this);

};

Negaowl.prototype = Object.create(Phaser.Sprite.prototype);
Negaowl.prototype.constructor = Negaowl;

Negaowl.prototype.update = function() {

};

Negaowl.prototype.kill = function(){
	
	// Stop all emitters from launching throwables
	this.ampliEmitter.destroy();
	this.guitarGroup.destroy();
	
	// tween animation when boss is killed
	// TODO: replace with proper animation
	this.tweenKill.onComplete.addOnce(Phaser.Sprite.prototype.kill, this)
	this.tweenKill.start();
}

Negaowl.prototype.stop_hell = function() {
	for (var i = 0; i < this.guitarGroup.children.length; i++) {
		var guitar = this.guitarGroup.children[i];
		guitar.on = false;
	}
	this.ampliEmitter.on = false;
};

Negaowl.prototype.release_hell = function() {
	for (var i = 0; i < this.guitarGroup.children.length; i++) {
		var guitar = this.guitarGroup.children[i];
		guitar.start(false, GUITAR_LIFESPAN, 10000);
	}
	this.ampliEmitter.start(false, AMPLI_LIFESPAN, 2000);
};

Negaowl.prototype.change_emitters_frequencies = function(min_speed, max_speed) {
	for (var i = 0; i < this.guitarGroup.children.length; i++) {
		var guitar = this.guitarGroup.children[i];
		this.game.time.events.loop(1000, randomEmitterFrequency, this,
				this.guitarUp.emitter, min_speed, max_speed);
	}

	this.ampliLoopTimer = this.game.time.events.loop(1000,
			randomEmitterFrequency, this, this.ampliEmitter, min_speed,
			max_speed);
};

function randomEmitterFrequency(emitter, min_speed, max_speed) {
	emitter.frequency = this.game.rnd.integerInRange(min_speed, max_speed);
}

function EmitterKillOutOfBound(emitter) {
	emitter.forEach(killParticle, this);
}

function killParticle(particle) {
	particle.checkWorldBounds = true;
	particle.outOfBoundsKill = true;
}

module.exports = Negaowl;
