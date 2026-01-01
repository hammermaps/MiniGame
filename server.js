const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SAVE_FILE = path.join(__dirname, 'gamestate.json');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Game configuration
const BUILDINGS = {
  townhall: { name: 'Rathaus', baseCost: { wood: 100, stone: 100 }, baseTime: 60, produces: {}, consumes: {} },
  barracks: { name: 'Kaserne', baseCost: { wood: 80, stone: 120 }, baseTime: 45, produces: {}, consumes: {} },
  farm: { name: 'Bauernhof', baseCost: { wood: 60, stone: 40 }, baseTime: 30, produces: { food: 10 }, consumes: {} },
  mine: { name: 'Mine', baseCost: { wood: 100, stone: 50 }, baseTime: 40, produces: { stone: 5 }, consumes: {} },
  lumbermill: { name: 'Sägewerk', baseCost: { wood: 50, stone: 80 }, baseTime: 35, produces: { wood: 8 }, consumes: {} },
  goldmine: { name: 'Goldmine', baseCost: { wood: 120, stone: 100 }, baseTime: 50, produces: { goldOre: 3 }, consumes: {} },
  ironmine: { name: 'Eisenmine', baseCost: { wood: 100, stone: 120 }, baseTime: 50, produces: { ironOre: 4 }, consumes: {} },
  lumberjack: { name: 'Baumfäller', baseCost: { wood: 60, stone: 40 }, baseTime: 30, produces: { trees: 6 }, consumes: {} },
  coalburner: { name: 'Köhlerei', baseCost: { wood: 80, stone: 60 }, baseTime: 40, produces: { coal: 2 }, consumes: { trees: 3 } },
  ironsmelter: { name: 'Eisenerzschmelze', baseCost: { wood: 150, stone: 120 }, baseTime: 60, produces: { ironBars: 2 }, consumes: { ironOre: 4, coal: 2 } },
  goldsmelter: { name: 'Goldschmelze', baseCost: { wood: 150, stone: 120 }, baseTime: 60, produces: { goldCoins: 1 }, consumes: { goldOre: 3, coal: 2 } },
  smithy: { name: 'Schmiede', baseCost: { wood: 120, stone: 140 }, baseTime: 55, produces: { swords: 1, spears: 1 }, consumes: { ironBars: 2, coal: 1 } },
  bowmaker: { name: 'Bogenmacherei', baseCost: { wood: 100, stone: 80 }, baseTime: 45, produces: { bows: 2 }, consumes: { wood: 3, trees: 2 } }
};

const TROOPS = {
  warrior: { name: 'Krieger', cost: { food: 20, ironBars: 2, swords: 1 }, trainTime: 30 },
  archer: { name: 'Bogenschütze', cost: { food: 15, wood: 10, ironBars: 1, bows: 1 }, trainTime: 45 },
  cavalry: { name: 'Kavallerie', cost: { food: 40, ironBars: 3, goldCoins: 1, spears: 1 }, trainTime: 60 }
};

const HEROES = {
  builder: { name: 'Baumeister', bonus: 'buildSpeed', value: 0.5, duration: 300 },
  recruiter: { name: 'Rekrutierer', bonus: 'trainSpeed', value: 0.5, duration: 300 },
  economist: { name: 'Ökonom', bonus: 'resourceBoost', value: 1.5, duration: 300 }
};

// Initialize default game state
function getDefaultGameState() {
  return {
    resources: { wood: 500, stone: 500, food: 500, goldOre: 100, ironOre: 100, coal: 50, trees: 200, goldCoins: 10, ironBars: 20, swords: 5, spears: 5, bows: 5 },
    buildings: [],
    troops: { warrior: 0, archer: 0, cavalry: 0 },
    buildQueue: [],
    trainQueue: [],
    activeHero: null,
    heroActivatedAt: null,
    lastUpdate: Date.now()
  };
}

// Load game state
function loadGameState() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      const data = fs.readFileSync(SAVE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading game state:', error);
  }
  return getDefaultGameState();
}

// Save game state
function saveGameState(state) {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving game state:', error);
    return false;
  }
}

// Process time-based updates
function processTimeUpdates(state) {
  const now = Date.now();
  let deltaTime = (now - state.lastUpdate) / 1000; // seconds
  
  // Validate deltaTime to prevent issues with clock adjustments
  if (deltaTime < 0 || deltaTime > 3600) {
    // Reset if time goes backward or too far forward (> 1 hour)
    deltaTime = 0;
  }
  
  // Apply hero bonus multipliers
  let buildSpeedMultiplier = 1;
  let trainSpeedMultiplier = 1;
  let resourceMultiplier = 1;
  
  if (state.activeHero && state.heroActivatedAt) {
    const heroDuration = HEROES[state.activeHero].duration * 1000; // ms
    const elapsed = now - state.heroActivatedAt;
    
    if (elapsed < heroDuration) {
      const bonus = HEROES[state.activeHero];
      if (bonus.bonus === 'buildSpeed') {
        buildSpeedMultiplier = 1 + bonus.value;
      } else if (bonus.bonus === 'trainSpeed') {
        trainSpeedMultiplier = 1 + bonus.value;
      } else if (bonus.bonus === 'resourceBoost') {
        resourceMultiplier = bonus.value;
      }
    } else {
      // Hero bonus expired
      state.activeHero = null;
      state.heroActivatedAt = null;
    }
  }
  
  // Process build queue
  state.buildQueue = state.buildQueue.filter(build => {
    build.remainingTime -= deltaTime * buildSpeedMultiplier;
    if (build.remainingTime <= 0) {
      // Building complete
      const existingBuilding = state.buildings.find(b => b.type === build.type);
      if (existingBuilding) {
        existingBuilding.level++;
      } else {
        state.buildings.push({ type: build.type, level: 1 });
      }
      return false;
    }
    return true;
  });
  
  // Process train queue
  state.trainQueue = state.trainQueue.filter(train => {
    train.remainingTime -= deltaTime * trainSpeedMultiplier;
    if (train.remainingTime <= 0) {
      // Training complete
      state.troops[train.type] = (state.troops[train.type] || 0) + train.amount;
      return false;
    }
    return true;
  });
  
  // Generate resources from buildings
  state.buildings.forEach(building => {
    const buildingConfig = BUILDINGS[building.type];
    if (buildingConfig.produces || buildingConfig.consumes) {
      // Check if we have enough resources to consume
      let canProduce = true;
      if (buildingConfig.consumes) {
        Object.keys(buildingConfig.consumes).forEach(resource => {
          const amountNeeded = buildingConfig.consumes[resource] * building.level * deltaTime;
          if (!state.resources[resource] || state.resources[resource] < amountNeeded) {
            canProduce = false;
          }
        });
      }
      
      // If we can produce, consume resources and produce output
      if (canProduce) {
        // Consume resources (not affected by resource multiplier)
        if (buildingConfig.consumes) {
          Object.keys(buildingConfig.consumes).forEach(resource => {
            const amount = buildingConfig.consumes[resource] * building.level * deltaTime;
            state.resources[resource] = Math.max(0, (state.resources[resource] || 0) - amount);
          });
        }
        
        // Produce resources (affected by resource multiplier from hero bonus)
        if (buildingConfig.produces) {
          Object.keys(buildingConfig.produces).forEach(resource => {
            const amount = buildingConfig.produces[resource] * building.level * deltaTime * resourceMultiplier;
            state.resources[resource] = (state.resources[resource] || 0) + amount;
          });
        }
      }
    }
  });
  
  state.lastUpdate = now;
  return state;
}

// Validate building request
function validateBuild(state, buildingType) {
  if (!BUILDINGS[buildingType]) {
    return { valid: false, error: 'Ungültiges Gebäude' };
  }
  
  const building = BUILDINGS[buildingType];
  const existingBuilding = state.buildings.find(b => b.type === buildingType);
  const level = existingBuilding ? existingBuilding.level : 0;
  
  // Calculate cost (increases with level)
  const cost = {};
  Object.keys(building.baseCost).forEach(resource => {
    cost[resource] = Math.floor(building.baseCost[resource] * Math.pow(1.5, level));
  });
  
  // Check if player has enough resources
  for (const resource in cost) {
    if (state.resources[resource] < cost[resource]) {
      return { valid: false, error: 'Nicht genug Ressourcen' };
    }
  }
  
  return { valid: true, cost };
}

// Validate troop training
function validateTrain(state, troopType, amount) {
  if (!TROOPS[troopType]) {
    return { valid: false, error: 'Ungültiger Truppentyp' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Ungültige Anzahl' };
  }
  
  // Check for barracks
  const barracks = state.buildings.find(b => b.type === 'barracks');
  if (!barracks) {
    return { valid: false, error: 'Kaserne erforderlich' };
  }
  
  const troop = TROOPS[troopType];
  const totalCost = {};
  Object.keys(troop.cost).forEach(resource => {
    totalCost[resource] = troop.cost[resource] * amount;
  });
  
  // Check if player has enough resources
  for (const resource in totalCost) {
    if (state.resources[resource] < totalCost[resource]) {
      return { valid: false, error: 'Nicht genug Ressourcen' };
    }
  }
  
  return { valid: true, cost: totalCost };
}

// API Endpoints

// Get game state
app.get('/api/gamestate', (req, res) => {
  let state = loadGameState();
  state = processTimeUpdates(state);
  saveGameState(state);
  
  // Add configuration for client
  res.json({
    state,
    config: {
      buildings: BUILDINGS,
      troops: TROOPS,
      heroes: HEROES
    }
  });
});

// Build or upgrade building
app.post('/api/build', (req, res) => {
  const { buildingType } = req.body;
  
  let state = loadGameState();
  state = processTimeUpdates(state);
  
  const validation = validateBuild(state, buildingType);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  // Deduct resources
  Object.keys(validation.cost).forEach(resource => {
    state.resources[resource] -= validation.cost[resource];
  });
  
  // Add to build queue
  const building = BUILDINGS[buildingType];
  const existingBuilding = state.buildings.find(b => b.type === buildingType);
  const level = existingBuilding ? existingBuilding.level : 0;
  
  state.buildQueue.push({
    type: buildingType,
    level: level + 1,
    remainingTime: building.baseTime
  });
  
  saveGameState(state);
  res.json({ success: true, state });
});

// Train troops
app.post('/api/train', (req, res) => {
  const { troopType, amount } = req.body;
  
  let state = loadGameState();
  state = processTimeUpdates(state);
  
  const validation = validateTrain(state, troopType, amount);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  // Deduct resources
  Object.keys(validation.cost).forEach(resource => {
    state.resources[resource] -= validation.cost[resource];
  });
  
  // Add to train queue
  const troop = TROOPS[troopType];
  state.trainQueue.push({
    type: troopType,
    amount: amount,
    remainingTime: troop.trainTime * amount
  });
  
  saveGameState(state);
  res.json({ success: true, state });
});

// Activate hero bonus
app.post('/api/hero', (req, res) => {
  const { heroType } = req.body;
  
  if (!HEROES[heroType]) {
    return res.status(400).json({ error: 'Ungültiger Held' });
  }
  
  let state = loadGameState();
  state = processTimeUpdates(state);
  
  if (state.activeHero) {
    return res.status(400).json({ error: 'Ein Held ist bereits aktiv' });
  }
  
  state.activeHero = heroType;
  state.heroActivatedAt = Date.now();
  
  saveGameState(state);
  res.json({ success: true, state });
});

// Save game state manually
app.post('/api/save', (req, res) => {
  let state = loadGameState();
  state = processTimeUpdates(state);
  saveGameState(state);
  res.json({ success: true, message: 'Spielstand gespeichert' });
});

// Reset game (for testing)
app.post('/api/reset', (req, res) => {
  const state = getDefaultGameState();
  saveGameState(state);
  res.json({ success: true, state });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log('Drücke Ctrl+C zum Beenden');
});
