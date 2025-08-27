import { UIManager } from '../managers/UIManager.js';
import { ActionManager } from '../managers/ActionManager.js';

export class Game extends Phaser.Scene {
  constructor() {
    super({ key: "Game" });

    this.robotSlots;
    this.deployedRobots = [false];

    // Resource tracking for 5 types
    this.resources = {
      food: 0,
      scrap: 0,
      circuits: 0,
      fuel: 0,
      steel: 0
    };

    // Building tracking
    this.buildings = {
      refiner: 0
    };

    this.resourceTexts = {};
    this.deploymentText;
    this.dayText;
    this.actionsText;
    this.nextDayButton;
    this.nextDayConfirmationPending = false;
    this.buildButton;
    this.buildMenuVisible = false;

    // Configuration files
    this.gridResourcesConfig;
    this.layoutConfig;

    // Deployment and day tracking
    this.deploymentsToday = 0;
    this.maxDeploymentsPerDay = 1;
    this.currentDay = 1;
    this.deploymentCost = 1; // fuel per deployment
    this.dailyFoodConsumption = 1;

    this.mapGrid;
    this.mapVisible = false;
    this.gridCells = []; // Store references to grid cells for visual feedback

    // Initialize managers
    this.uiManager = null;
    this.actionManager = null;
  }

 async create() {
  // Load configuration files
  await this.loadConfigs();

   // Initialize managers
   this.uiManager = new UIManager(this);
   this.actionManager = new ActionManager(this);

   // Track robot deployment status
   this.deployedRobots = [false];

   // Initialize starting resources
   this.resources = {
     food: 10,
     scrap: 5,
     circuits: 0,
     fuel: 3,
     steel: 0
   };

   // Create resource display texts
   this.uiManager.createResourceDisplay();

   // Create Next Day button
   this.uiManager.createNextDayButton();

   // Create Build button
   this.uiManager.createBuildButton();

    // Create robot deployment slots - using layout config
    this.robotSlots = [];
    const layout = this.layoutConfig.robotSlots;
    const startX = layout.x;
    const startY = layout.y;
    const slotSpacing = layout.slotSpacing;
    const slotSize = layout.slotSize;
    const robotIconSize = layout.robotIconSize;

    for (let i = 0; i < 1; i++) {
      let slotBg = this.add.rectangle(startX + i * slotSpacing, startY, slotSize, slotSize, 0x444444).setOrigin(0);
      slotBg.setStrokeStyle(2, 0xffffff);

      let robotIcon = this.add.image(startX + slotSize/2 + i * slotSpacing, startY + slotSize/2, 'robot').setDisplaySize(robotIconSize, robotIconSize);
      robotIcon.setVisible(false);

      slotBg.setInteractive().on('pointerdown', () => {
        this.actionManager.handleRobotDeployment(i, robotIcon);
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
    this.uiManager.createGrid();
    this.mapGrid.setVisible(false);
 }

  update() {
    // Game update logic (if any)
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
          "0,0": { "weights": { "food": 0, "scrap": 0, "circuits": 10, "fuel": 0 }, "amounts": { "food": 6, "scrap": 6, "circuits": 2, "fuel": 6 } },
          "0,1": { "weights": { "food": 3, "scrap": 3, "circuits": 0, "fuel": 4 }, "amounts": { "food": 8, "scrap": 8, "circuits": 1, "fuel": 9 } },
          "0,2": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 8, "scrap": 8, "circuits": 1, "fuel": 9 } },
          "0,3": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 8, "scrap": 9, "circuits": 1, "fuel": 9 } },
          "0,4": { "weights": { "food": 2, "scrap": 5, "circuits": 0, "fuel": 3 }, "amounts": { "food": 9, "scrap": 9, "circuits": 1, "fuel": 9 } },
          "1,0": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 6, "circuits": 1, "fuel": 7 } },
          "1,1": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 6, "circuits": 1, "fuel": 7 } },
          "1,2": { "weights": { "food": 0, "scrap": 10, "circuits": 0, "fuel": 0 }, "amounts": { "food": 2, "scrap": 2, "circuits": 2, "fuel": 2 } },
          "1,3": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 7, "circuits": 1, "fuel": 7 } },
          "1,4": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 7, "scrap": 7, "circuits": 1, "fuel": 7 } },
          "2,0": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 4, "scrap": 4, "circuits": 1, "fuel": 5 } },
          "2,1": { "weights": { "food": 10, "scrap": 0, "circuits": 0, "fuel": 0 }, "amounts": { "food": 2, "scrap": 2, "circuits": 2, "fuel": 2 } },
          "2,2": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 4, "scrap": 4, "circuits": 1, "fuel": 5 } },
          "2,3": { "weights": { "food": 0, "scrap": 0, "circuits": 0, "fuel": 10 }, "amounts": { "food": 2, "scrap": 2, "circuits": 2, "fuel": 2 } },
          "2,4": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 5, "scrap": 5, "circuits": 1, "fuel": 6 } },
          "3,0": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 6, "circuits": 1, "fuel": 7 } },
          "3,1": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 7, "circuits": 1, "fuel": 7 } },
          "3,2": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 7, "circuits": 1, "fuel": 7 } },
          "3,3": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 6, "scrap": 7, "circuits": 1, "fuel": 7 } },
          "3,4": { "weights": { "food": 2, "scrap": 5, "circuits": 0, "fuel": 3 }, "amounts": { "food": 7, "scrap": 7, "circuits": 1, "fuel": 7 } },
          "4,0": { "weights": { "food": 3, "scrap": 3, "circuits": 0, "fuel": 4 }, "amounts": { "food": 8, "scrap": 8, "circuits": 1, "fuel": 9 } },
          "4,1": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 8, "scrap": 9, "circuits": 1, "fuel": 9 } },
          "4,2": { "weights": { "food": 4, "scrap": 3, "circuits": 0, "fuel": 3 }, "amounts": { "food": 8, "scrap": 8, "circuits": 1, "fuel": 9 } },
          "4,3": { "weights": { "food": 3, "scrap": 4, "circuits": 0, "fuel": 3 }, "amounts": { "food": 8, "scrap": 9, "circuits": 1, "fuel": 9 } },
          "4,4": { "weights": { "food": 2, "scrap": 5, "circuits": 0, "fuel": 3 }, "amounts": { "food": 9, "scrap": 9, "circuits": 1, "fuel": 9 } }
        },
        collectionChance: 100
      };

      this.layoutConfig = {
        resourceDisplay: { x: 10, y: 10, lineSpacing: 20, fontSize: 14 },
        nextDayButton: { x: 10, y: 120, fontSize: 14 },
        robotSlots: { x: 10, y: 150, slotSize: 45, slotSpacing: 55, robotIconSize: 35 },
        actionsText: { x: 10, y: 190, fontSize: 16, wordWrapWidth: 340 },
        grid: { x: 30, y: 240, tileSize: 60, tileSpacing: 2 }
      };

      console.log('Using fallback configurations');
    }
  }


}

