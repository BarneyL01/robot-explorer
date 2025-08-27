export class ActionManager {
  constructor(scene) {
    this.scene = scene;
  }

  calculateFuelCost(x, y) {
    // Calculate Manhattan distance from home base (2,2)
    const distance = Math.abs(x - 2) + Math.abs(y - 2);
    // Fuel cost equals distance (home = 0, adjacent = 1, corners = 4)
    return distance;
  }

  handleRobotDeployment(slotIndex, robotIcon) {
    const isCurrentlyDeployed = this.scene.deployedRobots[slotIndex];

    if (isCurrentlyDeployed) {
      // Undeploying robot - no cost
      this.scene.deployedRobots[slotIndex] = false;
      robotIcon.setVisible(false);
      this.scene.uiManager.updateMapVisibility();
      this.scene.uiManager.updateActionsText();
      return;
    }

    // Deploy robot - just selection, no fuel cost
    this.scene.deployedRobots[slotIndex] = true;
    robotIcon.setVisible(true);

    this.scene.uiManager.updateMapVisibility();
    this.scene.uiManager.updateActionsText();
  }

  handleNextDay() {
    const remainingDeployments = this.scene.maxDeploymentsPerDay - this.scene.deploymentsToday;

    if (remainingDeployments > 0 && !this.scene.nextDayConfirmationPending) {
      // First click with remaining deployments - ask for confirmation
      this.scene.nextDayConfirmationPending = true;
      this.scene.nextDayButton.setText('CONFIRM?');
      this.scene.nextDayButton.setBackgroundColor('#ff4444');
      this.scene.actionsText.setText(`Warning: You have ${remainingDeployments} deployment(s) remaining. Click CONFIRM to advance anyway.`);
      return;
    }

    if (this.scene.nextDayConfirmationPending) {
      // Second click - confirmed, advance to next day
      this.scene.nextDayConfirmationPending = false;
      this.scene.nextDayButton.setText('Next Day');
      this.scene.nextDayButton.setBackgroundColor('#444444');
      this.consumeDailyFood();
      return;
    }

    // No remaining deployments, advance immediately
    this.consumeDailyFood();
  }

  collectResources(x, y, cell) {
    if (!this.scene.gridResourcesConfig || !this.scene.gridResourcesConfig.gridResources || !this.scene.layoutConfig) {
      console.warn('Configuration not loaded yet');
      this.scene.actionsText.setText('Actions: Configuration loading... Please wait and try again');
      return;
    }

    // Check if this is the home position (non-interactive)
    if (x === 2 && y === 2) {
      this.scene.actionsText.setText('Actions: Cannot deploy to home base!');
      return;
    }

    // Calculate fuel cost for this specific cell
    const fuelCost = this.calculateFuelCost(x, y);

    // Check fuel cost before deployment action
    if (this.scene.resources.fuel < fuelCost) {
      this.scene.actionsText.setText(`Actions: Not enough fuel (need ${fuelCost} fuel for this location)`);
      return;
    }

    // Check deployment limits before collecting
    if (this.scene.deploymentsToday >= this.scene.maxDeploymentsPerDay) {
      this.scene.actionsText.setText(`Actions: Daily deployment limit reached (${this.scene.maxDeploymentsPerDay})`);
      return;
    }

    // Consume fuel for this deployment action
    this.scene.resources.fuel -= fuelCost;
    this.scene.uiManager.updateResourceDisplay();

    // Count this as a deployment (happens regardless of success/failure)
    this.scene.deploymentsToday++;
    this.scene.uiManager.updateDeploymentDisplay();

    const cellKey = `${x},${y}`;
    console.log(`Attempting to collect from cell ${cellKey}`);

    const cellConfig = this.scene.gridResourcesConfig.gridResources[cellKey];

    if (!cellConfig || !cellConfig.weights || !cellConfig.amounts) {
      console.warn(`No configuration found for cell ${cellKey}`);
      console.log('Available cells:', Object.keys(this.scene.gridResourcesConfig.gridResources));
      this.scene.actionsText.setText(`Actions: No configuration for cell ${cellKey}`);
      return;
    }

    console.log(`Cell ${cellKey} config:`, cellConfig);

    // Check if collection succeeds based on global chance
    const collectionRoll = Math.random() * 100;
    if (collectionRoll > this.scene.gridResourcesConfig.collectionChance) {
      // Visual feedback for failed collection
      this.scene.uiManager.showCollectionFeedback(cell, false);
      this.scene.actionsText.setText('Actions: Collection failed - try another location');
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
      this.scene.resources[collectedResource] += amount;
      this.scene.uiManager.updateResourceDisplay();

      // Visual feedback for successful collection
      this.scene.uiManager.showCollectionFeedback(cell, true);

      this.scene.actionsText.setText(`Actions: Collected ${amount} ${collectedResource}!`);
    }
  }

  consumeDailyFood() {
    if (this.scene.resources.food >= this.scene.dailyFoodConsumption) {
      this.scene.resources.food -= this.scene.dailyFoodConsumption;
      this.scene.uiManager.updateResourceDisplay();

      // Visual feedback for food consumption
      this.scene.actionsText.setText(`Day ${this.scene.currentDay} ended - ${this.scene.dailyFoodConsumption} food consumed`);

      // Advance to next day and reset deployments
      this.scene.time.delayedCall(2000, () => {
        this.advanceToNextDay();
      });
    } else {
      this.scene.actionsText.setText('Game Over: Not enough food to survive!');
    }
  }

  advanceToNextDay() {
    this.scene.currentDay++;
    this.scene.deploymentsToday = 0;
    this.scene.nextDayConfirmationPending = false; // Reset confirmation state
    this.scene.nextDayButton.setText('Next Day'); // Reset button text
    this.scene.nextDayButton.setBackgroundColor('#444444'); // Reset button color
    this.scene.uiManager.updateDayDisplay();
    this.scene.uiManager.updateDeploymentDisplay();
    this.scene.uiManager.updateActionsText();

    // Reset robot deployments for new day
    this.scene.deployedRobots = [false];
    this.scene.robotSlots.forEach(slot => {
      slot.robotIcon.setVisible(false);
    });
    this.scene.mapGrid.setVisible(false);
  }

  handleBuildMenu() {
    if (this.scene.buildMenuVisible) {
      // Hide build menu
      this.scene.buildMenuVisible = false;
      this.scene.actionsText.setText('Actions: Build menu closed');
      // Remove build menu items if they exist
      if (this.scene.refinerBuildButton) {
        this.scene.refinerBuildButton.destroy();
        this.scene.refinerBuildButton = null;
      }
      if (this.scene.tbcBuildButton) {
        this.scene.tbcBuildButton.destroy();
        this.scene.tbcBuildButton = null;
      }
    } else {
      // Show build menu
      this.scene.buildMenuVisible = true;
      this.scene.actionsText.setText('Actions: Build Menu - Select an item to build');

      // Create refiner build button only if no refiners built yet
      if (this.scene.buildings.refiner === 0) {
        const layout = this.scene.layoutConfig.actionsText;
        this.scene.refinerBuildButton = this.scene.add.text(
          layout.x,
          layout.y + 30,
          'Build Refiner (20 scrap, 5 fuel, 2 circuits)',
          {
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#228B22',
            padding: { x: 10, y: 5 }
          }
        ).setInteractive();

        this.scene.refinerBuildButton.on('pointerdown', () => {
          this.buildRefiner();
        });

        this.scene.refinerBuildButton.on('pointerover', () => {
          this.scene.refinerBuildButton.setBackgroundColor('#32CD32');
        });

        this.scene.refinerBuildButton.on('pointerout', () => {
          this.scene.refinerBuildButton.setBackgroundColor('#228B22');
        });
      }

      // Create TBC build option
      const layout = this.scene.layoutConfig.actionsText;
      const tbcButtonY = this.scene.buildings.refiner === 0 ? layout.y + 60 : layout.y + 30;
      this.scene.tbcBuildButton = this.scene.add.text(
        layout.x,
        tbcButtonY,
        'Build Other (TBC)',
        {
          fontSize: '14px',
          fill: '#ffffff',
          backgroundColor: '#666666',
          padding: { x: 10, y: 5 }
        }
      ).setInteractive();

      this.scene.tbcBuildButton.on('pointerdown', () => {
        this.scene.actionsText.setText('Actions: This feature is coming soon!');
      });

      this.scene.tbcBuildButton.on('pointerover', () => {
        this.scene.tbcBuildButton.setBackgroundColor('#999999');
      });

      this.scene.tbcBuildButton.on('pointerout', () => {
        this.scene.tbcBuildButton.setBackgroundColor('#666666');
      });
    }
  }

  buildRefiner() {
    const costs = { scrap: 20, fuel: 5, circuits: 2 };

    // Check if player has enough resources
    for (const [resource, cost] of Object.entries(costs)) {
      if (this.scene.resources[resource] < cost) {
        this.scene.actionsText.setText(`Actions: Not enough ${resource} (need ${cost})`);
        return;
      }
    }

    // Deduct resources
    for (const [resource, cost] of Object.entries(costs)) {
      this.scene.resources[resource] -= cost;
    }

    // Build the refiner
    this.scene.buildings.refiner++;
    this.scene.uiManager.updateResourceDisplay();

    this.scene.actionsText.setText(`Actions: Refiner built! (${this.scene.buildings.refiner} total)`);

    // Show the refine button
    this.scene.uiManager.showRefineButton();

    // If build menu is open, refresh it to remove the build refiner option
    if (this.scene.buildMenuVisible) {
      this.handleBuildMenu();
      this.scene.buildMenuVisible = true;
      this.scene.actionsText.setText('Actions: Build Menu - Select an item to build');
    }
  }

  refineSteel() {
    if (this.scene.buildings.refiner <= 0) {
      this.scene.actionsText.setText('Actions: No refiners available');
      return;
    }

    const scrapNeeded = 3;
    if (this.scene.resources.scrap < scrapNeeded) {
      this.scene.actionsText.setText(`Actions: Not enough scrap (need ${scrapNeeded})`);
      return;
    }

    // Consume scrap and produce steel
    this.scene.resources.scrap -= scrapNeeded;
    this.scene.resources.steel += 1;

    this.scene.uiManager.updateResourceDisplay();
    this.scene.actionsText.setText(`Actions: Refined 1 steel using ${scrapNeeded} scrap!`);
  }
}