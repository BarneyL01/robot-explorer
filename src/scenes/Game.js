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

    // Resource tracking for 3 types
    this.resources = {
      food: 0,
      metal: 0,
      fuel: 0
    };

    this.resourceTexts = {};
    this.actionsText;

    // Grid resource configuration
    this.gridResourcesConfig;

    this.mapGrid;
    this.mapVisible = false;
    this.gridCells = []; // Store references to grid cells for visual feedback
  }

 create() {
   // Load grid resources configuration
   this.loadGridResourcesConfig();

   // Track robot deployment status
   this.deployedRobots = [false, false];

   // Initialize starting resources
   this.resources = {
     food: 10,
     metal: 5,
     fuel: 3
   };

   // Create resource display texts
   this.createResourceDisplay();

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

    this.gridCells = []; // Reset grid cells array

    for (let y = 0; y < rows; y++) {
      this.gridCells[y] = [];
      for (let x = 0; x < cols; x++) {
        const cell = this.add.rectangle(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2, 0x666666).setOrigin(0);
        cell.setStrokeStyle(1, 0x999999);
        cell.setInteractive();

        // Store original color for visual feedback
        cell.originalColor = 0x666666;

        cell.on('pointerdown', () => {
          if (this.mapGrid.visible) {
            this.collectResources(x, y, cell);
          }
        });

        this.gridCells[y][x] = cell;
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
      this.actionsText.setText(`Actions: ${deployedCount} robot(s) deployed - Click grid cells to collect resources!`);
    }
  }

  loadGridResourcesConfig() {
    // Load the JSON configuration file
    fetch('grid-resources.json')
      .then(response => response.json())
      .then(data => {
        this.gridResourcesConfig = data;
      })
      .catch(error => {
        console.error('Error loading grid resources config:', error);
        // Fallback configuration if JSON fails to load
        this.gridResourcesConfig = {
          gridResources: {},
          collectionAmount: { food: 5, metal: 3, fuel: 2 },
          collectionChance: 75
        };
      });
  }

  createResourceDisplay() {
    const resourceTypes = ['food', 'metal', 'fuel'];
    const colors = {
      food: '#90EE90',   // Light green
      metal: '#C0C0C0',  // Silver
      fuel: '#FFD700'    // Gold
    };

    resourceTypes.forEach((type, index) => {
      this.resourceTexts[type] = this.add.text(10, 10 + index * 20,
        `${type.charAt(0).toUpperCase() + type.slice(1)}: ${this.resources[type]}`,
        {
          fontSize: '14px',
          fill: colors[type],
          wordWrap: { width: 150, useAdvancedWrap: true }
        }
      );
    });
  }

  updateResourceDisplay() {
    Object.keys(this.resourceTexts).forEach(type => {
      if (this.resourceTexts[type]) {
        this.resourceTexts[type].setText(
          `${type.charAt(0).toUpperCase() + type.slice(1)}: ${this.resources[type]}`
        );
      }
    });
  }

  collectResources(x, y, cell) {
    if (!this.gridResourcesConfig || !this.gridResourcesConfig.gridResources) {
      console.warn('Grid resources config not loaded yet');
      return;
    }

    const cellKey = `${x},${y}`;
    const cellConfig = this.gridResourcesConfig.gridResources[cellKey];

    if (!cellConfig) {
      console.warn(`No configuration found for cell ${cellKey}`);
      return;
    }

    // Check if collection succeeds based on global chance
    const collectionRoll = Math.random() * 100;
    if (collectionRoll > this.gridResourcesConfig.collectionChance) {
      // Visual feedback for failed collection
      this.showCollectionFeedback(cell, false);
      this.actionsText.setText('Actions: Collection failed - try another location');
      return;
    }

    // Determine which resource to collect based on cell probabilities
    const resourceRoll = Math.random() * 100;
    let collectedResource = null;
    let cumulative = 0;

    for (const [resource, chance] of Object.entries(cellConfig)) {
      cumulative += chance;
      if (resourceRoll <= cumulative) {
        collectedResource = resource;
        break;
      }
    }

    if (collectedResource) {
      const amount = this.gridResourcesConfig.collectionAmount[collectedResource] || 1;
      this.resources[collectedResource] += amount;
      this.updateResourceDisplay();

      // Visual feedback for successful collection
      this.showCollectionFeedback(cell, true);

      this.actionsText.setText(`Actions: Collected ${amount} ${collectedResource}!`);
    }
  }

  showCollectionFeedback(cell, success) {
    const originalColor = cell.originalColor;
    const feedbackColor = success ? 0x00ff00 : 0xff0000; // Green for success, red for failure

    // Flash the cell color briefly
    cell.setFillStyle(feedbackColor);

    // Reset to original color after a short delay
    this.time.delayedCall(300, () => {
      if (cell && cell.setFillStyle) {
        cell.setFillStyle(originalColor);
      }
    });
  }
}

