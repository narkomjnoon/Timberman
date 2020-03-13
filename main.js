// Variables qui nous permettront de savoir quand le jeu démarre ou quand il y a un GAME OVER
var GAME_START = false;
var GAME_OVER = false;

// Taille du jeu (mode portrait)
const width = 1080;
const height = 1775;

// Phaser
var game = new Phaser.Game(width, height, Phaser.AUTO, 'timberman');
game.transparent = true;

// On déclare un objet qui contiendra les états "load" et "main"
var gameState = {};
gameState.load = function() { };
gameState.main = function() { };

// Va contenir le code qui chargera les ressources
gameState.load.prototype = {
	preload: function() {
		// Chargement de l'image du background
		game.load.image('background', 'img/background.png');
		// Chargement du personnage - PNG et JSON
		game.load.atlas('man', 'img/man.png', 'data/man.json');
		// Arbre
		game.load.image('trunk1', 'img/trunk1.png');
		game.load.image('trunk2', 'img/trunk2.png');
		game.load.image('branchLeft', 'img/branch1.png');
		game.load.image('branchRight', 'img/branch2.png');
		game.load.image('stump', 'img/stump.png');
		// Chiffres pour le score
		game.load.atlas('numbers', 'img/numbers.png', 'data/numbers.json');
		// Temps
		game.load.image('timeContainer', 'img/time-container.png');
		game.load.image('timeBar', 'img/time-bar.png');
		// Niveaux
		game.load.atlas('levelNumbers', 'img/levelNumbers.png', 'data/numbers.json');
		game.load.image('level', 'img/level.png');
		// tombe rip
		game.load.image('rip', 'img/rip.png');

		/**** SONS *****/
		// Coup de hache
		game.load.audio('soundCut', ['sons/cut.ogg']);
		// Musique de fond
		game.load.audio('soundTheme', ['sons/theme.ogg']);
		// Mort du personnage
		game.load.audio('soundDeath', ['sons/death.ogg']);
	},

	create: function() {
		game.state.start('main');
	}
};

// va contenir le coeur du jeu
gameState.main.prototype = {
	create: function() {
		// Physique du jeu
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// On fait en sorte que le jeu se redimensionne selon la taille de l'écran (Pour les PC)
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.setShowAll();
		window.addEventListener('resize', function () {
			game.scale.refresh();
		});
		game.scale.refresh();

		// Création de l'arrière-plan dans le Canvas
		this.background = game.add.sprite(0, 0, 'background');
		this.background.width = game.width;
		this.background.height = game.height;

		// ---- ARBRE
		// souche
		this.stump = game.add.sprite(0, 0, 'stump');
		this.stump.x = 352;
		this.stump.y = 1394;
		// construction de l'arbre
		this.HEIGHT_TRUNK = 243;
		this.constructTree();
		this.canCut = true;

		// ---- BÛCHERON
		// Création du bûcheron
		this.man = game.add.sprite(0, 1070, 'man');
		// On ajoute l'animation de la respiration (fait appel au JSON)
		this.man.animations.add('breath', [0,1]);
		// On ajoute l'animation de la coupe (fait appel au JSON)
		this.man.animations.add('cut', [1,2,3,4]);
		// On fait démarrer l'animation, avec 3 images par seconde et répétée en boucle
		this.man.animations.play('breath', 3, true);
		// Position du bûcheron
		this.manPosition = 'left';

		// Au click, on appelle la fonction "listener()"
		game.input.onDown.add(this.listener, this);

		// ---- SCORE
		this.currentScore = 0;
		// On crée le sprite du score
		var spriteScoreNumber = game.add.sprite(game.width / 2, 440, 'numbers');
		// On affiche le score à 0 en ajoutant le JSON "number" aux animations de "spriteScoreNumber"
		spriteScoreNumber.animations.add('number');
		spriteScoreNumber.animations.frame = this.currentScore;
		// On centre le score
		spriteScoreNumber.x -= spriteScoreNumber.width / 2;
		// "this.spritesScoreNumbers" va contenir les sprites des chiffres qui composent le score
		this.spritesScoreNumbers = new Array();
		this.spritesScoreNumbers.push(spriteScoreNumber);

		// ---- BARRE DE TEMPS
		// Container
		this.timeContainer = game.add.sprite(0, 100, 'timeContainer');
		// On le centre
		this.timeContainer.x = game.width / 2 - this.timeContainer.width / 2;
		// Barre
		this.timeBar = game.add.sprite(0, 130, 'timeBar');
		// On la centre
		this.timeBar.x = game.width / 2 - this.timeBar.width / 2;
		this.timeBarWidth = this.timeBar.width / 2;
		// On crop la barre pour la diminuer de moitié
		var cropRect = new Phaser.Rectangle(0, 0, this.timeBarWidth, this.timeBar.height);
		this.timeBar.crop(cropRect);
		this.timeBar.updateCrop();

		// ---- NIVEAU
		// Level
		this.currentLevel = 1;
		var levelPosY = 290;
		// Sprite "Level"
		this.intituleLevel = game.add.sprite(0, levelPosY, 'level');
		this.intituleLevel.alpha = 0;
		// Sprite "Numéro du level"
		var spriteLevelNumber = game.add.sprite(0, levelPosY, 'levelNumbers');
		spriteLevelNumber.alpha = 0;
		// On change l'animation du sprite pour chosir le sprite du niveau actuel (ici, niveau 1)
		spriteLevelNumber.animations.add('number');
		spriteLevelNumber.animations.frame = this.currentLevel;
		this.spritesLevelNumbers = new Array();
		this.spritesLevelNumbers.push(spriteLevelNumber);

		// ---- SONS
		this.soundCut = game.add.audio('soundCut', 1);
		this.soundTheme = game.add.audio('soundTheme', 0.5, true);
		this.soundDeath = game.add.audio('soundDeath', 1);
	},

	update: function() {
		// Si le partie a débuté (première action du joueur)
		if(GAME_START) {
			// S'il reste du temps, mise à jour de la barre de temps
			if(this.timeBarWidth > 0) {
				// On diminue la barre de temps en fonction du niveau
				this.timeBarWidth -= (0.6 + 0.1 * this.currentLevel);
				var cropRect = new Phaser.Rectangle(0, 0, this.timeBarWidth, this.timeBar.height);
				this.timeBar.crop(cropRect);
				this.timeBar.updateCrop();
			// Sinon, le personnage meurt
			} else {
				this.death();
			}
		}
		// Si la partie n'est pas terminée
		if(!GAME_OVER) {
			// Détection des touches left et right du clavier
			if (game.input.keyboard.justPressed(Phaser.Keyboard.LEFT))
		        this.listener('left');
		    else if (game.input.keyboard.justPressed(Phaser.Keyboard.RIGHT)) {
		        this.listener('right');
		    }
		}
	},

	listener: function(action) {

		if(this.canCut) {

			// La première action de l'utilisateur déclenche le début de partie
			if(!GAME_START) {
				GAME_START = true;
				// On active la musique de fond
				this.soundTheme.play();
			}
			
			// On vérifie si l'action du joueur est un clic
			var isClick = action instanceof Phaser.Pointer;

			// Si la touche directionnelle gauche est pressée ou s'il y a un clic dans la moitié gauche du jeu
			if(action == 'left' || (isClick && game.input.activePointer.x <= game.width / 2)) {
				// On remet le personnage à gauche de l'arbre et dans le sens de départ
				this.man.anchor.setTo(0, 0);
				this.man.scale.x = 1;
				this.man.x = 0;
				this.manPosition = 'left';
			// Si la touche directionnelle droite est pressée ou s'il y a un clic dans la moitié droite du jeu
			} else {
				// On inverse le sens du personnage pour le mettre à droite de l'arbre
				this.man.anchor.setTo(1, 0);
				this.man.scale.x = -1;
				this.man.x = game.width - Math.abs(this.man.width);
				this.manPosition = 'right';
			}

			// On stop l'animation de respiration
			this.man.animations.stop('breath', true);
			// Pour démarrer l'animation de la coupe, une seule fois et avec 3 images par seconde
			var animationCut = this.man.animations.play('cut', 15);
			// Une fois que l'animation de la coupe est finie, on reprend l'animation de la respiration
			animationCut.onComplete.add(function() {
				this.man.animations.play('breath', 3, true);
			}, this);

			// Nom du tronc à couper
			var nameTrunkToCut = this.tree.getAt(0).key;
			// Nom du tronc qui se trouve juste au-dessus du tronc "nameTrunkToCut"
			var nameTrunkJustAfter = this.tree.getAt(1).key;

			// Si le personnage heurte une branche alors qu'il vient de changer de côté
			if(nameTrunkToCut == 'branchLeft' && this.manPosition == 'left' || nameTrunkToCut == 'branchRight' && this.manPosition == 'right') {
				// Game Over
				this.death();
			// Si tout va bien, le personnage coupe le tronc
			} else {
				this.man.animations.stop('breath', true);
				// On fait démarrer l'animation, avec 3 images par seconde
				var animationCut = this.man.animations.play('cut', 15);
				animationCut.onComplete.add(function() {
					this.man.animations.play('breath', 3, true);
				}, this);

				this.cutTrunk();

				// Une fois le tronc coupé, on vérifie si le tronc qui retombe n'est pas une branche qui pourrait heurter le personnage
				if(nameTrunkJustAfter == 'branchLeft' && this.manPosition == 'left' || nameTrunkJustAfter == 'branchRight' && this.manPosition == 'right') {
					// Game Over
					this.death();
				}
			}
		}
	},

	cutTrunk: function() {
		
		// On active le son de hache contre le bois
		this.soundCut.play();

		// On incrémente le score
		this.increaseScore();

		// On ajoute un tronc ou une branche		
		this.addTrunk();

		// On crée une copie du morceau de l'arbre qui doit être coupé
		var trunkCut = game.add.sprite(37, 1151, this.tree.getAt(0).key);
		// Et on supprime le morceau appartenant à l'arbre 
		this.tree.remove(this.tree.getAt(0));
		// On active le système de physique sur ce sprite
		game.physics.enable(trunkCut, Phaser.Physics.ARCADE);
		// On déplace le centre de gravité du sprite en son milieu, ce qui nous permettra de lui faire faire une rotation sur lui même
		trunkCut.anchor.setTo(0.5, 0.5);
		trunkCut.x += trunkCut.width / 2;
		trunkCut.y += trunkCut.height / 2;

		var angle = 0;
		// Si le personnage se trouve à gauche, on envoie le morceau de bois vers la droite
		if(this.manPosition == 'left') {
			trunkCut.body.velocity.x = 1300;
			angle = -400;
		// Sinon, on l'envoie vers la gauche
		} else {
			trunkCut.body.velocity.x = -1300;
			angle = 400;
		}
		// Permet de créer un effet de gravité
		// Dans un premier temps, le morceau de bois est propulsé en l'air
		trunkCut.body.velocity.y = -800;
		// Et dans un second temps, il retombe
		trunkCut.body.gravity.y = 2000;

		// On ajoute une animation de rotation sur le morceau de bois coupé
		game.add.tween(trunkCut).to({angle: trunkCut.angle + angle}, 1000, Phaser.Easing.Linear.None,true);

		// On empêche une nouvelle coupe
		this.canCut = false;

		var self = this;
		// Pour chaque morceau (troncs et branches) de l'arbre, on lui ajoute une animation de chute.
		// Donne l'impression que tout l'arbre tombe pour boucher le trou laissé par le morceau coupé.
		this.tree.forEach(function(trunk) {
			var tween = game.add.tween(trunk).to({y: trunk.y + self.HEIGHT_TRUNK}, 100, Phaser.Easing.Linear.None,true);
			tween.onComplete.add(function() {
				// Une fois que l'arbre à fini son animation, on redonne la possibilité de couper
				self.canCut = true;
			}, self);
		});
	},

	constructTree: function() {
		// On construit le groupe this.tree qui va contenir toutes les parties de l'arbre (troncs simple et branches)
		this.tree = game.add.group();
		// Les 2 premiers troncs sont des troncs simples
		this.tree.create(37, 1151, 'trunk1');
		this.tree.create(37, 1151 - this.HEIGHT_TRUNK, 'trunk2');

		// On construit le reste de l'arbre
		for(var i = 0; i < 4; i++) {
			this.addTrunk();
		}
	},

	addTrunk: function() {
		var trunks = ['trunk1', 'trunk2'];
		var branchs = ['branchLeft', 'branchRight'];
		// Si le dernier tronc du groupe this.tree n'est pas une branche
		if(branchs.indexOf(this.tree.getAt(this.tree.length - 1).key) == -1) {
			// 1 chance sur 4 de placer un tronc sans branche
			if(Math.random() * 4 <= 1)
				this.tree.create(37, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), trunks[Math.floor(Math.random() * 2)]);
			// 3 chances sur 4 de placer une branche
			else	
				this.tree.create(37, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), branchs[Math.floor(Math.random() * 2)]);
		}
		// Si le tronc précédent est une branche, on place un tronc simple
		else
			this.tree.create(37, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), trunks[Math.floor(Math.random() * 2)]);
	},

	increaseScore: function() {
		this.currentScore++;

		// Tous les 20 points, on augmente le niveau
		if(this.currentScore % 20 == 0)
			this.increaseLevel();

		// On ajoute un peu de temps supplémentaire
		this.timeBarWidth += 12;

		// On "kill" chaque sprite (chaque chiffre) qui compose le score
		for(var j = 0; j < this.spritesScoreNumbers.length; j++)
			this.spritesScoreNumbers[j].kill();
		this.spritesScoreNumbers = new Array();
		
		// On recrée les sprites qui vont composer le score
		this.spritesScoreNumbers = this.createSpritesNumbers(this.currentScore, 'numbers', 440, 1);
	},

	createSpritesNumbers: function(number /* Nombre à créer en sprite */, imgRef /* Image à utiliser pour créer le score */, posY, alpha) {
		// on découpe le nombre en des chiffres individuels
		var digits = number.toString().split('');
		var widthNumbers = 0;

		var arraySpritesNumbers = new Array();
		
		// on met en forme le nombre avec les sprites
		for(var i = 0; i < digits.length; i++) {
			var spaceBetweenNumbers = 0;
			if(i > 0)
				spaceBetweenNumbers = 5;
			var spriteNumber = game.add.sprite(widthNumbers + spaceBetweenNumbers, posY, imgRef);
			spriteNumber.alpha = alpha;
			// On ajoute le JSON des nombres dans l'animation de "spriteNumber"
			spriteNumber.animations.add('number');
			// On sélection la frame n° "digits[i]" dans le JSON
			spriteNumber.animations.frame = +digits[i];
			arraySpritesNumbers.push(spriteNumber);
			// On calcule la width totale du sprite du score
			widthNumbers += spriteNumber.width + spaceBetweenNumbers;
		}

		// On ajoute les sprites du score dans le groupe "numbersGroup" afin de centrer le tout
		var numbersGroup = game.add.group();
		for(var i = 0; i < arraySpritesNumbers.length; i++)
			numbersGroup.add(arraySpritesNumbers[i]);
		// On centre horizontalement
		numbersGroup.x = game.width / 2 - numbersGroup.width / 2;

		return arraySpritesNumbers;
	},

	increaseLevel: function() {
		// On incrémente le niveau actuel
		this.currentLevel++;

		// On "kill" chaque sprite (chaque chiffre) du numéro du précédent niveau
		for(var j = 0; j < this.spritesLevelNumbers.length; j++)
			this.spritesLevelNumbers[j].kill();
		this.spritesLevelNumbers = new Array();

		// On crée les sprites (sprites des chiffres) du niveau actuel
		this.spritesLevelNumbers = this.createSpritesNumbers(this.currentLevel, 'levelNumbers', this.intituleLevel.y, 0);

		// On positionne le numéro du niveau (composé de différents sprites) derrière le sprite "level"
		this.intituleLevel.x = 0;
		for(var i = 0; i < this.spritesLevelNumbers.length; i++) {
			if(i == 0)
				this.spritesLevelNumbers[i].x = this.intituleLevel.width + 20;
			else
				this.spritesLevelNumbers[i].x = this.intituleLevel.width + 20 + this.spritesLevelNumbers[i - 1].width;
		}
		// On ajoute le tout à un groupe afin de tout centrer
		var levelGroup = game.add.group();
		levelGroup.add(this.intituleLevel);
		for(var i = 0; i < this.spritesLevelNumbers.length; i++)
			levelGroup.add(this.spritesLevelNumbers[i]);
		levelGroup.x = game.width / 2 - levelGroup.width / 2;

		// On fait apparaître le sprite "level" et le numéro du niveau en même temps
		for(var i = 0; i < this.spritesLevelNumbers.length; i++) {
			game.add.tween(this.spritesLevelNumbers[i]).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
		}
		game.add.tween(this.intituleLevel).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);

		// On fait disparaître le tout au bout de 1.5 secondes
		var self = this;
		setTimeout(function() {
			for(var i = 0; i < self.spritesLevelNumbers.length; i++) {
				game.add.tween(self.spritesLevelNumbers[i]).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
			}
			game.add.tween(self.intituleLevel).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
		}, 1500);
	},

	death: function() {
		// On joue le son de la mort du personnage
		this.soundDeath.play();
		// Et on stop la musique de fond
		this.soundTheme.stop();

		// On empêche toute action du joueur
		GAME_START = false;
		GAME_OVER = true;
		this.canCut = false;
		game.input.onDown.removeAll();

		var self = this;
		// On fait disparaître le personnage
		var ripTween = game.add.tween(this.man).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
		// Une fois la disparition complète
		ripTween.onComplete.add(function() {
			// On fait apparaître la tombe à la place du personnage
			self.rip = game.add.sprite(0, 0, 'rip');
			self.rip.alpha = 0;
			game.add.tween(self.rip).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
			self.rip.x = (this.manPosition == 'left') ? (this.man.x + 50) : (this.man.x + 200);
			self.rip.y = this.man.y + this.man.height - self.rip.height;
			// Après 1 seconde, on fait appel à la fonction "gameFinish()"
			setTimeout(function() {self.gameFinish()}, 1000);
		}, this);
	},

	gameFinish: function() {
		// On redémarre la partie
		GAME_START = false;
		GAME_OVER = false;
		game.state.start('main');
	}
};


// On ajoute les 2 fonctions "gameState.load" et "gameState.main" à notre objet Phaser
game.state.add('load', gameState.load);
game.state.add('main', gameState.main);
// Il ne reste plus qu'à lancer l'état "load"
game.state.start('load');