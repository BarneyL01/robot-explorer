export class UIManager {
  constructor(scene) {
    this.scene = scene;
  }

  createResourceDisplay() {
    const layout = this.scene.layoutConfig.resourceDisplay;
    const resourceTypes = ['food', 'scrap', 'circuits', 'fuel'];
    const colors = {
      food: '#90EE90',     // Light green
      scrap: '#696969',    // Dim gray
      circuits: '#4169E1', // Royal blue
      fuel: '#FFD700'      // Gold
    };

    resourceTypes.forEach((type, index) => {
      this.scene.resourceTexts[type] = this.scene.add.text(
        layout.x,
        layout.y + index * layout.lineSpacing,
        `${type.charAt(0).toUpperCase() + type.slice(1)}: ${this.scene.resources[type]}`,
        {
          fontSize: `${layout.fontSize}px`,
          fill: colors[type],
          wordWrap: { width: 150, useAdvancedWrap: true }
        }
      );
    });

    // Add deployment and day display
    const deploymentY = layout.y + 4 * layout.lineSpacing;
    this.scene.deploymentText = this.scene.add.text(
      layout.x,
      deploymentY,
      `Deployments: ${this.scene.deploymentsToday}/${this.scene.maxDeploymentsPerDay}`,
      {
        fontSize: `${layout.fontSize}px`,
        fill: '#ffffff',
        wordWrap: { width: 200, useAdvancedWrap: true }
      }
    );

    this.scene.dayText = this.scene.add.text(
      layout.x + 200,
      deploymentY,
      `Day: ${this.scene.currentDay}`,
      {
        fontSize: `${layout.fontSize}px`,
        fill: '#ffff00',
        wordWrap: { width: 100, useAdvancedWrap: true }
      }
    );
  }

  createNextDayButton() {
    const layout = this.scene.layoutConfig.nextDayButton;

    this.scene.nextDayButton = this.scene.add.text(
      layout.x,
      layout.y,
      'Next Day',
      {
        fontSize: `${layout.fontSize}px`,
        fill: '#ffffff',
        backgroundColor: '#444444',
        padding: { x: 10, y: 5 }
      }
    ).setInteractive();

    this.scene.nextDayButton.on('pointerdown', () => {
      this.scene.actionManager.handleNextDay();
    });

    this.scene.nextDayButton.on('pointerover', () => {
      this.scene.nextDayButton.setBackgroundColor('#666666');
    });

    this.scene.nextDayButton.on('pointerout', () => {
      this.scene.nextDayButton.setBackgroundColor('#444444');
    });
  }

  createGrid() {
    const rows = 5;
    const cols = 5;
    const gridLayout = this.scene.layoutConfig.grid;
    const tileSize = gridLayout.tileSize;
    const tileSpacing = gridLayout.tileSpacing;

    this.scene.gridCells = []; // Reset grid cells array

    for (let y = 0; y < rows; y++) {
      this.scene.gridCells[y] = [];
      for (let x = 0; x < cols; x++) {
        if (x === 2 && y === 2) {
          // Create home icon in center - don't store in gridCells array
          const homeIcon = this.createHomeIcon(x * (tileSize + tileSpacing), y * (tileSize + tileSpacing), tileSize);
          this.scene.mapGrid.add(homeIcon);

          // Add fuel cost display (0) for home base (added after home icon so it renders on top)
          const homeCostText = this.scene.add.text(
            x * (tileSize + tileSpacing) + 3,
            y * (tileSize + tileSpacing) + 3,
            '0', {
            fontSize: '12px',
            fill: '#000000',
            fontWeight: 'bold'
          });
          this.scene.mapGrid.add(homeCostText);

          this.scene.gridCells[y][x] = null; // Mark as non-interactive
        } else {
          // Create regular grid cell
          const cell = this.scene.add.rectangle(x * (tileSize + tileSpacing), y * (tileSize + tileSpacing), tileSize, tileSize, 0x666666).setOrigin(0);
          cell.setStrokeStyle(1, 0x999999);
          cell.setInteractive();

          // Store original color for visual feedback
          cell.originalColor = 0x666666;

          cell.on('pointerdown', () => {
            if (this.scene.mapGrid.visible) {
              this.scene.actionManager.collectResources(x, y, cell);
            }
          });

          this.scene.gridCells[y][x] = cell;
          this.scene.mapGrid.add(cell);

          // Calculate and display fuel cost for this cell (added after cell so it renders on top)
          const fuelCost = this.scene.actionManager.calculateFuelCost(x, y);
          const costText = this.scene.add.text(
            x * (tileSize + tileSpacing) + 3,
            y * (tileSize + tileSpacing) + 3,
            fuelCost.toString(), {
            fontSize: '12px',
            fill: '#000000',
            fontWeight: 'bold'
          });
          this.scene.mapGrid.add(costText);
        }
      }
    }
  }

  createHomeIcon(x, y, tileSize) {
    const homeContainer = this.scene.add.container(x, y);

    // Create house base
    const houseBase = this.scene.add.rectangle(tileSize/2, tileSize * 0.7, tileSize * 0.8, tileSize * 0.5, 0x8B4513).setOrigin(0.5);
    homeContainer.add(houseBase);

    // Create roof
    const roof = this.scene.add.triangle(tileSize/2, tileSize * 0.2, tileSize * 0.1, tileSize * 0.7, tileSize/2, tileSize * 0.1, tileSize * 0.9, tileSize * 0.7, 0xDC143C).setOrigin(0.5);
    homeContainer.add(roof);

    // Create door
    const door = this.scene.add.rectangle(tileSize/2, tileSize * 0.8, tileSize * 0.2, tileSize * 0.3, 0x654321).setOrigin(0.5);
    homeContainer.add(door);

    // Add home label
    const homeLabel = this.scene.add.text(tileSize/2, tileSize + 8, 'HOME', {
      fontSize: '10px',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    homeContainer.add(homeLabel);

    // Disable all input interactions on the container
    homeContainer.inputEnabled = false;
    homeContainer.input = null;

    return homeContainer;
  }

  updateResourceDisplay() {
    Object.keys(this.scene.resourceTexts).forEach(type => {
      if (this.scene.resourceTexts[type]) {
        this.scene.resourceTexts[type].setText(
          `${type.charAt(0).toUpperCase() + type.slice(1)}: ${this.scene.resources[type]}`
        );
      }
    });
  }

  updateDeploymentDisplay() {
    if (this.scene.deploymentText) {
      this.scene.deploymentText.setText(`Deployments: ${this.scene.deploymentsToday}/${this.scene.maxDeploymentsPerDay}`);
    }
  }

  updateDayDisplay() {
    if (this.scene.dayText) {
      this.scene.dayText.setText(`Day: ${this.scene.currentDay}`);
    }
  }

  updateActionsText() {
    const deployedCount = this.scene.deployedRobots.filter(Boolean).length;
    const remainingDeployments = this.scene.maxDeploymentsPerDay - this.scene.deploymentsToday;

    if (deployedCount === 0) {
      if (remainingDeployments > 0) {
        this.scene.actionsText.setText(`Actions: Deploy robots (${remainingDeployments} actions left today)`);
      } else {
        this.scene.actionsText.setText('Actions: Daily action limit reached - click "Next Day" to advance');
      }
    } else {
      this.scene.actionsText.setText(`Actions: ${deployedCount} robot(s) deployed - Click grid cells to collect resources (fuel cost varies by distance, ${remainingDeployments} left today)!`);
    }
  }

  updateMapVisibility() {
    const anyDeployed = this.scene.deployedRobots.some(deployed => deployed === true);
    this.scene.mapGrid.setVisible(anyDeployed);
  }

  showCollectionFeedback(cell, success) {
    const originalColor = cell.originalColor;
    const feedbackColor = success ? 0x00ff00 : 0xff0000; // Green for success, red for failure

    // Flash the cell color briefly
    cell.setFillStyle(feedbackColor);

    // Reset to original color after a short delay
    this.scene.time.delayedCall(300, () => {
      if (cell && cell.setFillStyle) {
        cell.setFillStyle(originalColor);
      }
    });
  }
}