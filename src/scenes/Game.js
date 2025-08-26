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

 async create() {
  // Load grid resources configuration
  await this.loadGridResourcesConfig();

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

  async loadGridResourcesConfig() {
    try {
      const response = await fetch('./grid-resources.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Grid resources config loaded successfully:', data);
      this.gridResourcesConfig = data;
    } catch (error) {
      console.error('Error loading grid resources config:', error);
      // Comprehensive fallback configuration with all cells
      this.gridResourcesConfig = {
        gridResources: {
          "0,0": { "weights": { "food": 8, "metal": 1, "fuel": 1 }, "amounts": { "food": 5, "metal": 3, "fuel": 2 } },
          "0,1": { "weights": { "food": 7, "metal": 2, "fuel": 1 }, "amounts": { "food": 4, "metal": 4, "fuel": 2 } },
          "0,2": { "weights": { "food": 6, "metal": 3, "fuel": 1 }, "amounts": { "food": 4, "metal": 5, "fuel": 2 } },
          "0,3": { "weights": { "food": 5, "metal": 4, "fuel": 1 }, "amounts": { "food": 3, "metal": 6, "fuel": 2 } },
          "0,4": { "weights": { "food": 4, "metal": 5, "fuel": 1 }, "amounts": { "food": 3, "metal": 7, "fuel": 2 } },
          "1,0": { "weights": { "food": 7, "metal": 2, "fuel": 1 }, "amounts": { "food": 5, "metal": 3, "fuel": 1 } },
          "1,1": { "weights": { "food": 6, "metal": 3, "fuel": 1 }, "amounts": { "food": 4, "metal": 4, "fuel": 1 } },
          "1,2": { "weights": { "food": 5, "metal": 4, "fuel": 1 }, "amounts": { "food": 4, "metal": 5, "fuel": 1 } },
          "1,3": { "weights": { "food": 4, "metal": 5, "fuel": 1 }, "amounts": { "food": 3, "metal": 6, "fuel": 1 } },
          "1,4": { "weights": { "food": 3, "metal": 6, "fuel": 1 }, "amounts": { "food": 3, "metal": 7, "fuel": 1 } },
          "2,0": { "weights": { "food": 7, "metal": 1, "fuel": 2 }, "amounts": { "food": 5, "metal": 2, "fuel": 3 } },
          "2,1": { "weights": { "food": 6, "metal": 2, "fuel": 2 }, "amounts": { "food": 4, "metal": 3, "fuel": 4 } },
          "2,2": { "weights": { "food": 5, "metal": 3, "fuel": 2 }, "amounts": { "food": 4, "metal": 4, "fuel": 5 } },
          "2,3": { "weights": { "food": 4, "metal": 4, "fuel": 2 }, "amounts": { "food": 3, "metal": 5, "fuel": 6 } },
          "2,4": { "weights": { "food": 3, "metal": 5, "fuel": 2 }, "amounts": { "food": 3, "metal": 6, "fuel": 7 } },
          "3,0": { "weights": { "food": 6, "metal": 2, "fuel": 2 }, "amounts": { "food": 5, "metal": 2, "fuel": 3 } },
          "3,1": { "weights": { "food": 5, "metal": 3, "fuel": 2 }, "amounts": { "food": 4, "metal": 3, "fuel": 4 } },
          "3,2": { "weights": { "food": 4, "metal": 4, "fuel": 2 }, "amounts": { "food": 4, "metal": 4, "fuel": 5 } },
          "3,3": { "weights": { "food": 3, "metal": 5, "fuel": 2 }, "amounts": { "food": 3, "metal": 5, "fuel": 6 } },
          "3,4": { "weights": { "food": 2, "metal": 6, "fuel": 2 }, "amounts": { "food": 3, "metal": 6, "fuel": 7 } },
          "4,0": { "weights": { "food": 6, "metal": 1, "fuel": 3 }, "amounts": { "food": 5, "metal": 1, "fuel": 4 } },
          "4,1": { "weights": { "food": 5, "metal": 2, "fuel": 3 }, "amounts": { "food": 4, "metal": 2, "fuel": 5 } },
          "4,2": { "weights": { "food": 4, "metal": 3, "fuel": 3 }, "amounts": { "food": 4, "metal": 3, "fuel": 6 } },
          "4,3": { "weights": { "food": 3, "metal": 4, "fuel": 3 }, "amounts": { "food": 3, "metal": 4, "fuel": 7 } },
          "4,4": { "weights": { "food": 2, "metal": 5, "fuel": 3 }, "amounts": { "food": 3, "metal": 5, "fuel": 8 } }
        },
        collectionChance: 75
      };
      console.log('Using fallback configuration');
    }
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
      this.actionsText.setText('Actions: Configuration loading... Please wait and try again');
      return;
    }

    const cellKey = `${x},${y}`;
    console.log(`Attempting to collect from cell ${cellKey}`);

    const cellConfig = this.gridResourcesConfig.gridResources[cellKey];

    if (!cellConfig || !cellConfig.weights || !cellConfig.amounts) {
      console.warn(`No configuration found for cell ${cellKey}`);
      console.log('Available cells:', Object.keys(this.gridResourcesConfig.gridResources));
      this.actionsText.setText(`Actions: No configuration for cell ${cellKey}`);
      return;
    }

    console.log(`Cell ${cellKey} config:`, cellConfig);

    // Check if collection succeeds based on global chance
    const collectionRoll = Math.random() * 100;
    if (collectionRoll > this.gridResourcesConfig.collectionChance) {
      // Visual feedback for failed collection
      this.showCollectionFeedback(cell, false);
      this.actionsText.setText('Actions: Collection failed - try another location');
      return;
    }

    // Calculate total weight and determine which resource to collect
    const weights = cellConfig.weights;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    const resourceRoll = Math.random() * totalWeight;
    let collectedResource = null;
    let cumulative = 0;

    for (const [resource, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (resourceRoll <= cumulative) {
        collectedResource = resource;
        break;
      }
    }

    if (collectedResource) {
      const amount = cellConfig.amounts[collectedResource] || 1;
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

