// Game state
let gameData = null;
let config = null;
let updateInterval = null;

// Initialize game
async function initGame() {
    await loadGameState();
    startAutoUpdate();
    setupEventListeners();
}

// Load game state from server
async function loadGameState() {
    try {
        const response = await fetch('/api/gamestate');
        const data = await response.json();
        
        gameData = data.state;
        config = data.config;
        
        updateUI();
    } catch (error) {
        console.error('Fehler beim Laden des Spielstands:', error);
        showNotification('Fehler beim Laden des Spielstands', true);
    }
}

// Update UI with current game state
function updateUI() {
    if (!gameData || !config) return;
    
    // Update resources
    document.getElementById('wood').textContent = Math.floor(gameData.resources.wood);
    document.getElementById('stone').textContent = Math.floor(gameData.resources.stone);
    document.getElementById('food').textContent = Math.floor(gameData.resources.food);
    document.getElementById('goldOre').textContent = Math.floor(gameData.resources.goldOre || 0);
    document.getElementById('ironOre').textContent = Math.floor(gameData.resources.ironOre || 0);
    document.getElementById('coal').textContent = Math.floor(gameData.resources.coal || 0);
    document.getElementById('trees').textContent = Math.floor(gameData.resources.trees || 0);
    
    // Update buildings list
    updateBuildingsList();
    
    // Update build buttons
    updateBuildButtons();
    
    // Update build queue
    updateBuildQueue();
    
    // Update troops list
    updateTroopsList();
    
    // Update train buttons
    updateTrainButtons();
    
    // Update train queue
    updateTrainQueue();
    
    // Update hero status
    updateHeroStatus();
    
    // Update hero buttons
    updateHeroButtons();
    
    // Update last update time
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString('de-DE');
}

// Update buildings list
function updateBuildingsList() {
    const container = document.getElementById('buildings-list');
    
    if (gameData.buildings.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 10px;">Noch keine Gebäude gebaut</p>';
        return;
    }
    
    container.innerHTML = gameData.buildings.map(building => {
        const buildingConfig = config.buildings[building.type];
        return `
            <div class="building-item">
                <strong>${buildingConfig.name}</strong> - Stufe ${building.level}
                ${buildingConfig.produces && Object.keys(buildingConfig.produces).length > 0 
                    ? `<br><small>Produziert: ${Object.entries(buildingConfig.produces)
                        .map(([res, amount]) => `${amount * building.level} ${getResourceName(res)}/s`)
                        .join(', ')}</small>`
                    : ''}
            </div>
        `;
    }).join('');
}

// Update build buttons
function updateBuildButtons() {
    const container = document.getElementById('build-buttons');
    
    container.innerHTML = Object.entries(config.buildings).map(([type, building]) => {
        const existingBuilding = gameData.buildings.find(b => b.type === type);
        const level = existingBuilding ? existingBuilding.level : 0;
        
        // Calculate cost
        const cost = {};
        Object.keys(building.baseCost).forEach(resource => {
            cost[resource] = Math.floor(building.baseCost[resource] * Math.pow(1.5, level));
        });
        
        // Check if can afford
        const canAfford = Object.entries(cost).every(([resource, amount]) => 
            gameData.resources[resource] >= amount
        );
        
        return `
            <button class="build-btn" 
                    data-building="${type}" 
                    ${!canAfford ? 'disabled' : ''}>
                <span class="btn-name">${building.name} ${level > 0 ? `(Stufe ${level} → ${level + 1})` : '(Neu bauen)'}</span>
                <span class="btn-cost">Kosten: ${Object.entries(cost)
                    .map(([res, amount]) => `${amount} ${getResourceName(res)}`)
                    .join(', ')}</span>
                <span class="btn-cost">Dauer: ${building.baseTime}s</span>
            </button>
        `;
    }).join('');
    
    // Add event listeners
    container.querySelectorAll('.build-btn').forEach(btn => {
        btn.addEventListener('click', () => buildBuilding(btn.dataset.building));
    });
}

// Update build queue
function updateBuildQueue() {
    const container = document.getElementById('build-queue');
    
    if (gameData.buildQueue.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <h3>🚧 Bauarbeiten (${gameData.buildQueue.length})</h3>
        ${gameData.buildQueue.map(build => {
            const buildingConfig = config.buildings[build.type];
            return `
                <div class="queue-item">
                    <strong>${buildingConfig.name}</strong> (Stufe ${build.level})
                    <div class="progress">Verbleibende Zeit: ${Math.ceil(build.remainingTime)}s</div>
                </div>
            `;
        }).join('')}
    `;
}

// Update troops list
function updateTroopsList() {
    const container = document.getElementById('troops-list');
    
    const hasTroops = Object.values(gameData.troops).some(count => count > 0);
    
    if (!hasTroops) {
        container.innerHTML = '<p style="color: #999; padding: 10px;">Noch keine Truppen ausgebildet</p>';
        return;
    }
    
    container.innerHTML = Object.entries(gameData.troops)
        .filter(([type, count]) => count > 0)
        .map(([type, count]) => {
            const troopConfig = config.troops[type];
            return `
                <div class="troop-item">
                    <strong>${troopConfig.name}</strong>: ${count}
                </div>
            `;
        }).join('');
}

// Update train buttons
function updateTrainButtons() {
    const container = document.getElementById('train-buttons');
    
    // Check if barracks exists
    const hasBarracks = gameData.buildings.some(b => b.type === 'barracks');
    
    if (!hasBarracks) {
        container.innerHTML = '<p style="color: #999; padding: 10px;">Baue zuerst eine Kaserne!</p>';
        return;
    }
    
    container.innerHTML = Object.entries(config.troops).map(([type, troop]) => {
        // Check if can afford one unit
        const canAfford = Object.entries(troop.cost).every(([resource, amount]) => 
            gameData.resources[resource] >= amount
        );
        
        return `
            <div>
                <button class="train-btn" data-troop="${type}">
                    <span class="btn-name">${troop.name}</span>
                    <span class="btn-cost">Kosten pro Einheit: ${Object.entries(troop.cost)
                        .map(([res, amount]) => `${amount} ${getResourceName(res)}`)
                        .join(', ')}</span>
                    <span class="btn-cost">Trainingszeit: ${troop.trainTime}s pro Einheit</span>
                </button>
                <div class="train-controls">
                    <input type="number" 
                           id="train-amount-${type}" 
                           min="1" 
                           value="1" 
                           placeholder="Anzahl">
                    <button onclick="trainTroops('${type}')" ${!canAfford ? 'disabled' : ''}>
                        Ausbilden
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update train queue
function updateTrainQueue() {
    const container = document.getElementById('train-queue');
    
    if (gameData.trainQueue.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <h3>🎓 Training (${gameData.trainQueue.length})</h3>
        ${gameData.trainQueue.map(train => {
            const troopConfig = config.troops[train.type];
            return `
                <div class="queue-item">
                    <strong>${train.amount}x ${troopConfig.name}</strong>
                    <div class="progress">Verbleibende Zeit: ${Math.ceil(train.remainingTime)}s</div>
                </div>
            `;
        }).join('')}
    `;
}

// Update hero status
function updateHeroStatus() {
    const container = document.getElementById('active-hero');
    
    if (!gameData.activeHero) {
        container.innerHTML = '<p style="color: #999; padding: 10px;">Kein Held aktiv</p>';
        return;
    }
    
    const hero = config.heroes[gameData.activeHero];
    const elapsed = Date.now() - gameData.heroActivatedAt;
    const remaining = Math.max(0, hero.duration - elapsed / 1000);
    
    container.innerHTML = `
        <div class="hero-active">
            <strong>Aktiver Held: ${hero.name}</strong><br>
            <small>Bonus: ${getHeroBonusDescription(hero)}</small><br>
            <small>Verbleibende Zeit: ${Math.ceil(remaining)}s</small>
        </div>
    `;
}

// Update hero buttons
function updateHeroButtons() {
    const container = document.getElementById('hero-buttons');
    
    const hasActiveHero = gameData.activeHero !== null;
    
    container.innerHTML = Object.entries(config.heroes).map(([type, hero]) => {
        return `
            <button class="hero-btn" 
                    data-hero="${type}" 
                    ${hasActiveHero ? 'disabled' : ''}>
                <span class="btn-name">${hero.name}</span>
                <span class="btn-cost">${getHeroBonusDescription(hero)}</span>
                <span class="btn-cost">Dauer: ${hero.duration}s</span>
            </button>
        `;
    }).join('');
    
    // Add event listeners
    container.querySelectorAll('.hero-btn').forEach(btn => {
        btn.addEventListener('click', () => activateHero(btn.dataset.hero));
    });
}

// Build a building
async function buildBuilding(buildingType) {
    try {
        const response = await fetch('/api/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buildingType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameData = data.state;
            updateUI();
            showNotification(`${config.buildings[buildingType].name} in Bau!`);
        } else {
            showNotification(data.error, true);
        }
    } catch (error) {
        console.error('Fehler beim Bauen:', error);
        showNotification('Fehler beim Bauen', true);
    }
}

// Train troops
async function trainTroops(troopType) {
    const amountInput = document.getElementById(`train-amount-${troopType}`);
    const amount = parseInt(amountInput.value) || 1;
    
    if (amount <= 0) {
        showNotification('Ungültige Anzahl', true);
        return;
    }
    
    try {
        const response = await fetch('/api/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ troopType, amount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameData = data.state;
            updateUI();
            showNotification(`${amount}x ${config.troops[troopType].name} in Ausbildung!`);
        } else {
            showNotification(data.error, true);
        }
    } catch (error) {
        console.error('Fehler beim Trainieren:', error);
        showNotification('Fehler beim Trainieren', true);
    }
}

// Activate hero
async function activateHero(heroType) {
    try {
        const response = await fetch('/api/hero', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ heroType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameData = data.state;
            updateUI();
            showNotification(`${config.heroes[heroType].name} aktiviert!`);
        } else {
            showNotification(data.error, true);
        }
    } catch (error) {
        console.error('Fehler beim Aktivieren des Helden:', error);
        showNotification('Fehler beim Aktivieren des Helden', true);
    }
}

// Save game
async function saveGame() {
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message);
        } else {
            showNotification('Fehler beim Speichern', true);
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showNotification('Fehler beim Speichern', true);
    }
}

// Reset game
async function resetGame() {
    if (!confirm('Möchten Sie das Spiel wirklich zurücksetzen? Alle Fortschritte gehen verloren!')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameData = data.state;
            updateUI();
            showNotification('Spiel zurückgesetzt');
        } else {
            showNotification('Fehler beim Zurücksetzen', true);
        }
    } catch (error) {
        console.error('Fehler beim Zurücksetzen:', error);
        showNotification('Fehler beim Zurücksetzen', true);
    }
}

// Show notification
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show' + (isError ? ' error' : '');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Start auto-update
function startAutoUpdate() {
    updateInterval = setInterval(() => {
        loadGameState();
    }, 2000); // Update every 2 seconds
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('save-btn').addEventListener('click', saveGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
}

// Helper functions
function getResourceName(resource) {
    const names = {
        wood: 'Holz',
        stone: 'Stein',
        food: 'Nahrung',
        goldOre: 'Gold-Erz',
        ironOre: 'Eisen-Erz',
        coal: 'Kohle',
        trees: 'Bäume'
    };
    return names[resource] || resource;
}

function getHeroBonusDescription(hero) {
    const descriptions = {
        buildSpeed: `Baugeschwindigkeit +${hero.value * 100}%`,
        trainSpeed: `Trainingsgeschwindigkeit +${hero.value * 100}%`,
        resourceBoost: `Ressourcenproduktion +${(hero.value - 1) * 100}%`
    };
    return descriptions[hero.bonus] || hero.bonus;
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
