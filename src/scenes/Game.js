export class Game extends Phaser.Scene {
  constructor() {
    super({ key: "Game" });

    // this.boardSize = 4;
    // this.tileSize = 100;
    // this.tileSpacing = 10;
    // this.tweenSpeed = 100;
    // this.score = 0;
    // this.canMove = false;
    // this.movingTiles = 0;
    this.robotSlots;
    this.deployedRobots = [false, false];

    this.resourceText;
    this.actionsText;

    this.mapGrid;
    this.mapVisible = false;
  }

 create() {
    // Track robot deployment status
    this.deployedRobots = [false, false];

    // Resource tracker text - adjusted for smaller screen
    this.resourceText = this.add.text(10, 10, 'Resources: 100', { fontSize: '18px', fill: '#fff' });

    // Create robot deployment slots - optimized for 360px screen
    this.robotSlots = [];
    const startX = 10;
    const startY = 40;
    const slotSpacing = 55;

    for (let i = 0; i < 2; i++) {
      let slotBg = this.add.rectangle(startX + i * slotSpacing, startY, 45, 45, 0x444444).setOrigin(0);
      slotBg.setStrokeStyle(2, 0xffffff);

      let robotIcon = this.add.image(startX + 22.5 + i * slotSpacing, startY + 22.5, 'robot').setDisplaySize(35, 35);
      robotIcon.setVisible(false);

      slotBg.setInteractive().on('pointerdown', () => {
        this.deployedRobots[i] = !this.deployedRobots[i];
        robotIcon.setVisible(this.deployedRobots[i]);
        this.updateMapVisibility();
        this.updateActionsText();
      });

      this.robotSlots.push({ slotBg, robotIcon });
    }

    // Player actions text - adjusted for 360px screen with text wrapping
    this.actionsText = this.add.text(10, 100, 'Actions: Deploy robots by clicking slots', {
      fontSize: '16px',
      fill: '#eee',
      wordWrap: { width: 340, useAdvancedWrap: true }
    });

    // Create grid map container (hidden initially) - positioned for 360px screen
    this.mapGrid = this.add.container(30, 150);
    this.createGrid();
    this.mapGrid.setVisible(false);
  }

  update() {
    // Game update logic (if any)
  }

  createGrid() {
    const rows = 5;
    const cols = 5;
    const tileSize = 60; // Optimized for 360px screen width

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = this.add.rectangle(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2, 0x666666).setOrigin(0);
        cell.setStrokeStyle(1, 0x999999);
        cell.setInteractive();
        cell.on('pointerdown', () => {
          if (this.mapGrid.visible) {
            this.actionsText.setText(`Actions: Pointing robot to (${x},${y})`);
            // Additional robot movement logic can go here
          }
        });
        this.mapGrid.add(cell);
      }
    }
  }

  updateMapVisibility() {
    const anyDeployed = this.deployedRobots.some(deployed => deployed === true);
    this.mapGrid.setVisible(anyDeployed);
  }

  updateActionsText() {
    const deployedCount = this.deployedRobots.filter(Boolean).length;
    if (deployedCount === 0) {
      this.actionsText.setText('Actions: Deploy robots by clicking slots');
    } else {
      this.actionsText.setText(`Actions: ${deployedCount} robot(s) deployed - Use grid to command`);
    }
  }
}

