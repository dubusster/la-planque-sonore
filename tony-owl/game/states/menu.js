
'use strict';

var music;

function Menu() {}

Menu.prototype = {
  preload: function() {

  },
  create: function() {
	
    // add the background sprite
	this.background_group = this.game.add.group();
	this.sky = this.add.tileSprite(0, 0, this.game.width, this.game.height, 'sky');
    this.buildings = this.add.tileSprite(0, 0,this.game.width, this.game.height, 'background');
    this.sky.autoScroll(-50, 0);
    this.buildings.autoScroll(-100, 0);
    this.background_group.add(this.sky);
    this.background_group.add(this.buildings);
	  
	this.titleGroup = this.game.add.group();
    
	// adding the logo
    this.logo = this.add.image(0, 0,'logo');
    this.logo.scale.setTo(0.5);
    
    
    // adding to global title group, so it is easily manipulable.
    this.titleGroup.add(this.logo);
    
    // adding title image
    this.title = this.add.image(0, 0,'title');
    this.titleGroup.add(this.title);
    
    this.titleGroup.align(1,2,this.logo.height, this.logo.height);
    this.titleGroup.setAll('anchor.x', 0.5);
    this.titleGroup.setAll('anchor.y', 0.5);
    this.titleGroup.x = this.world.width/2;
    this.titleGroup.y = this.world.height/4;
    
    this.game.add.tween(this.titleGroup).to({y:130}, 1000, Phaser.Easing.Linear.NONE, true, 0, 1000, true);
    
    this.startButton = this.game.add.button(this.game.width/2, 3.5*this.game.height/4, 'startButton', this.startClick, this);
    this.startButton.anchor.setTo(0.5,0.5);
    
    this.muteButton = this.game.add.button(this.game.width-125, this.game.height-125, 'muteButton', this.muteClick, this);
    
    music = this.game.add.audio('menu', 0.6, true);
    music.play(); 
//    this.startButton.scale.setTo(0.5);
    
  },
  update: function() {
    
  },
  startClick: function() {
	    // start button click handler
	    // start the 'play' state
	  	music.stop();
	    this.game.state.start('play');
	  },
  
  muteClick: function(){
	  var toggle = + !this.game.sound.mute;
	  this.game.sound.mute = toggle;
	  this.muteButton.frame = toggle;
  }
};

module.exports = Menu;
