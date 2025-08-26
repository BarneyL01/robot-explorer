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
    this.deploymentText;
    this.dayText;
    this.actionsText;

    // Configuration files
    this.gridResourcesConfig;
    this.layoutConfig;

    // Deployment and day tracking
    this.deploymentsToday = 0;
    this.maxDeploymentsPerDay = 2;
    this.currentDay = 1;
    this.deploymentCost = 1; // fuel per deployment
    this.dailyFoodConsumption = 1;

    this.mapGrid;
    this.mapVisible = false;
    this.gridCells = []; // Store references to grid cells for visual feedback
  }

 async create() {
  // Load configuration files
  await this.loadConfigs();

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

    // Create robot deployment slots - using layout config
    this.robotSlots = [];
    const layout = this.layoutConfig.robotSlots;
    const startX = layout.x;
    const startY = layout.y;
    const slotSpacing = layout.slotSpacing;
    const slotSize = layout.slotSize;
    const robotIconSize = layout.robotIconSize;

    for (let i = 0; i < 2; i++) {
      let slotBg = this.add.rectangle(startX + i * slotSpacing, startY, slotSize, slotSize, 0x444444).setOrigin(0);
      slotBg.setStrokeStyle(2, 0xffffff);

      let robotIcon = this.add.image(startX + slotSize/2 + i * slotSpacing, startY + slotSize/2, 'robot').setDisplaySize(robotIconSize, robotIconSize);
      robotIcon.setVisible(false);

      slotBg.setInteractive().on('pointerdown', () => {
        this.handleRobotDeployment(i, robotIcon);
      });

      this.robotSlots.push({ slotBg, robotIcon });
    }

    // Player actions text - using layout config
    const actionsLayout = this.layoutConfig.actionsText;
    this.actionsText = this.add.text(actionsLayout.x, actionsLayout.y, 'Actions: Deploy robots by clicking slots', {
      fontSize: `${actionsLayout.fontSize}px`,
      fill: '#eee',
      wordWrap: { width: actionsLayout.wordWrapWidth, useAdvancedWrap: true }
    });

    // Create grid map container (hidden initially) - using layout config
    const gridLayout = this.layoutConfig.grid;
    this.mapGrid = this.add.container(gridLayout.x, gridLayout.y);
    this.createGrid();
    this.mapGrid.setVisible(false);
  }

  update() {
    // Game update logic (if any)
  }

  createGrid() {
    const rows = 5;
    const cols = 5;
    const gridLayout = this.layoutConfig.grid;
    const tileSize = gridLayout.tileSize;
    const tileSpacing = gridLayout.tileSpacing;

    this.gridCells = []; // Reset grid cells array

    for (let y = 0; y < rows; y++) {
      this.gridCells[y] = [];
      for (let x = 0; x < cols; x++) {
        const cell = this.add.rectangle(x * (tileSize + tileSpacing), y * (tileSize + tileSpacing), tileSize, tileSize, 0x666666).setOrigin(0);
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
    const remainingDeployments = this.maxDeploymentsPerDay - this.deploymentsToday;

    if (deployedCount === 0) {
      if (remainingDeployments > 0) {
        this.actionsText.setText(`Actions: Deploy robots (${remainingDeployments} left today, costs ${this.deploymentCost} fuel each)`);
      } else {
        this.actionsText.setText('Actions: Daily deployment limit reached - wait for next day');
      }
    } else {
      this.actionsText.setText(`Actions: ${deployedCount} robot(s) deployed - Click grid cells to collect resources!`);
    }
  }

  async loadConfigs() {
    try {
      // Load grid resources config
      const gridResponse = await fetch('./grid-resources.json');
      if (!gridResponse.ok) {
        throw new Error(`Grid resources HTTP error! status: ${gridResponse.status}`);
      }
      const gridData = await gridResponse.json();
      console.log('Grid resources config loaded successfully:', gridData);
      this.gridResourcesConfig = gridData;

      // Load layout config
      const layoutResponse = await fetch('./layout.json');
      if (!layoutResponse.ok) {
        throw new Error(`Layout HTTP error! status: ${layoutResponse.status}`);
      }
      const layoutData = await layoutResponse.json();
      console.log('Layout config loaded successfully:', layoutData);
      this.layoutConfig = layoutData;

    } catch (error) {
      console.error('Error loading configurations:', error);

      // Fallback configurations
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

      this.layoutConfig = {
        resourceDisplay: { x: 10, y: 10, lineSpacing: 20, fontSize: 14 },
        robotSlots: { x: 10, y: 90, slotSize: 45, slotSpacing: 55, robotIconSize: 35 },
        actionsText: { x: 10, y: 150, fontSize: 16, wordWrapWidth: 340 },
        grid: { x: 30, y: 200, tileSize: 60, tileSpacing: 2 }
      };

      console.log('Using fallback configurations');
    }
  }

  createResourceDisplay() {
    const layout = this.layoutConfig.resourceDisplay;
    const resourceTypes = ['food', 'metal', 'fuel'];
    const colors = {
      food: '#90EE90',   // Light green
      metal: '#C0C0C0',  // Silver
      fuel: '#FFD700'    // Gold
    };

    resourceTypes.forEach((type, index) => {
      this.resourceTexts[type] = this.add.text(
        layout.x,
        layout.y + index * layout.lineSpacing,
        `${type.charAt(0).toUpperCase() + type.slice(1)}: ${this.resources[type]}`,
        {
          fontSize: `${layout.fontSize}px`,
          fill: colors[type],
          wordWrap: { width: 150, useAdvancedWrap: true }
        }
      );
    });

    // Add deployment and day display
    const deploymentY = layout.y + 4 * layout.lineSpacing;
    this.deploymentText = this.add.text(
      layout.x,
      deploymentY,
      `Deployments: ${this.deploymentsToday}/${this.maxDeploymentsPerDay}`,
      {
        fontSize: `${layout.fontSize}px`,
        fill: '#ffffff',
        wordWrap: { width: 200, useAdvancedWrap: true }
      }
    );

    this.dayText = this.add.text(
      layout.x + 200,
      deploymentY,
      `Day: ${this.currentDay}`,
      {
        fontSize: `${layout.fontSize}px`,
        fill: '#ffff00',
        wordWrap: { width: 100, useAdvancedWrap: true }
      }
    );
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

  updateDeploymentDisplay() {
    if (this.deploymentText) {
      this.deploymentText.setText(`Deployments: ${this.deploymentsToday}/${this.maxDeploymentsPerDay}`);
    }
  }

  updateDayDisplay() {
    if (this.dayText) {
      this.dayText.setText(`Day: ${this.currentDay}`);
    }
  }

  handleRobotDeployment(slotIndex, robotIcon) {
    const isCurrentlyDeployed = this.deployedRobots[slotIndex];

    if (isCurrentlyDeployed) {
      // Undeploying robot - no cost
      this.deployedRobots[slotIndex] = false;
      robotIcon.setVisible(false);
      this.updateMapVisibility();
      this.updateActionsText();
      return;
    }

    // Check deployment limits
    if (this.deploymentsToday >= this.maxDeploymentsPerDay) {
      this.actionsText.setText(`Actions: Daily deployment limit reached (${this.maxDeploymentsPerDay})`);
      return;
    }

    // Check fuel cost
    if (this.resources.fuel < this.deploymentCost) {
      this.actionsText.setText(`Actions: Not enough fuel (need ${this.deploymentCost})`);
      return;
    }

    // Deploy robot - costs fuel
    this.resources.fuel -= this.deploymentCost;
    this.deployedRobots[slotIndex] = true;
    this.deploymentsToday++;
    robotIcon.setVisible(true);

    this.updateResourceDisplay();
    this.updateDeploymentDisplay();
    this.updateMapVisibility();
    this.updateActionsText();

    // Check if this is the 2nd deployment - consume daily food
    if (this.deploymentsToday >= this.maxDeploymentsPerDay) {
      this.consumeDailyFood();
    }
  }

  consumeDailyFood() {
    if (this.resources.food >= this.dailyFoodConsumption) {
      this.resources.food -= this.dailyFoodConsumption;
      this.updateResourceDisplay();

      // Visual feedback for food consumption
      this.actionsText.setText(`Day ${this.currentDay} ended - ${this.dailyFoodConsumption} food consumed`);

      // Advance to next day and reset deployments
      this.time.delayedCall(2000, () => {
        this.advanceToNextDay();
      });
    } else {
      this.actionsText.setText('Game Over: Not enough food to survive!');
    }
  }

  advanceToNextDay() {
    this.currentDay++;
    this.deploymentsToday = 0;
    this.updateDayDisplay();
    this.updateDeploymentDisplay();
    this.updateActionsText();

    // Reset robot deployments for new day
    this.deployedRobots = [false, false];
    this.robotSlots.forEach(slot => {
      slot.robotIcon.setVisible(false);
    });
    this.mapGrid.setVisible(false);
  }

  collectResources(x, y, cell) {
    if (!this.gridResourcesConfig || !this.gridResourcesConfig.gridResources || !this.layoutConfig) {
      console.warn('Configuration not loaded yet');
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

