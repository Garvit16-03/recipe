// app.js

// Global state
const state = {
    user: null,
    favoriteIds: [],
    recipes: [],
    activeTab: 'browse-section',
    activeCategory: 'All',
    searchQuery: '',
    debounceTimer: null
};

// DOM Elements
const DOM = {
    // Navigation
    tabs: document.querySelectorAll('.tab-btn'),
    pages: document.querySelectorAll('.page-section'),
    logo: document.getElementById('logo-btn'),
    authHeaderWidget: document.getElementById('auth-header-widget'),
    
    // Browse View
    searchBar: document.getElementById('recipe-search'),
    categoryPills: document.getElementById('category-pills'),
    recipesGrid: document.getElementById('recipes-grid'),
    recipesCount: document.getElementById('recipes-count'),
    browseTitle: document.getElementById('browse-title'),
    
    // Favorites View
    favoritesGrid: document.getElementById('favorites-grid'),
    favoritesCount: document.getElementById('favorites-count'),
    
    // My Recipes View
    myRecipesGrid: document.getElementById('my-recipes-grid'),
    myRecipesCount: document.getElementById('my-recipes-count'),
    
    // Add Recipe Form
    addRecipeForm: document.getElementById('add-recipe-form'),
    ingredientsContainer: document.getElementById('ingredients-form-rows'),
    instructionsContainer: document.getElementById('instructions-form-rows'),
    addIngredientBtn: document.getElementById('add-ingredient-row-btn'),
    addInstructionBtn: document.getElementById('add-instruction-row-btn'),
    
    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    openLoginBtn: document.getElementById('open-login-btn'),
    closeAuthModalBtn: document.getElementById('close-auth-modal-btn'),
    loginFormView: document.getElementById('login-form-view'),
    registerFormView: document.getElementById('register-form-view'),
    toggleToRegister: document.getElementById('toggle-to-register'),
    toggleToLogin: document.getElementById('toggle-to-login'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    authModalBackdrop: document.getElementById('auth-modal-backdrop'),
    
    // Detail Modal
    detailModal: document.getElementById('recipe-detail-modal'),
    detailBody: document.getElementById('recipe-detail-body'),
    closeDetailBtn: document.getElementById('close-recipe-modal-btn'),
    detailBackdrop: document.getElementById('recipe-detail-backdrop'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
};

// API Helpers
async function apiCall(action, method = 'GET', data = null) {
    const url = `api.php?action=${action}`;
    const options = {
        method: method,
        headers: {}
    };

    if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (e) {
        console.error('API call failed:', e);
        showToast('Server connection error. Please try again.', 'error');
        return { success: false, message: 'Server communication failure.' };
    }
}

// Toast System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--accent-green);"><use href="#icon-check"></use></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--accent-red);"><use href="#icon-close"></use></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--accent-orange);"><use href="#icon-chef"></use></svg>`;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <span class="toast-message">${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Trigger animation slide in
    setTimeout(() => toast.classList.add('active'), 50);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await checkAuthStatus();
    loadPageData();
}

// Check Authentication Status
async function checkAuthStatus() {
    const res = await apiCall('auth_status');
    if (res && res.loggedIn) {
        state.user = res.user;
        state.favoriteIds = res.favoriteIds || [];
    } else {
        state.user = null;
        state.favoriteIds = [];
    }
    updateAuthUI();
}

// Update authentication elements in header
function updateAuthUI() {
    if (state.user) {
        const firstLetter = state.user.username.charAt(0).toUpperCase();
        DOM.authHeaderWidget.innerHTML = `
            <div class="user-profile" title="Logged in as ${state.user.username}">
                <div class="avatar">${firstLetter}</div>
                <span>${state.user.username}</span>
            </div>
            <button class="btn btn-danger btn-icon" id="logout-btn" title="Logout">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><use href="#icon-logout"></use></svg>
            </button>
        `;
        
        // Bind logout action
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    } else {
        DOM.authHeaderWidget.innerHTML = `
            <button class="btn btn-secondary" id="open-login-btn">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;vertical-align:middle;margin-right:4px;"><use href="#icon-user"></use></svg>
                Login
            </button>
        `;
        
        // Re-bind login modal opening
        document.getElementById('open-login-btn').addEventListener('click', () => toggleModal(DOM.authModal, true));
    }
}

// Toggle modals with backdrop animation
function toggleModal(modalEl, show) {
    if (show) {
        modalEl.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    } else {
        modalEl.classList.remove('active');
        document.body.style.overflow = '';
        
        // Specific cleanups
        if (modalEl === DOM.detailModal) {
            // Stop YouTube player if playing by empty contents
            DOM.detailBody.innerHTML = '';
        }
    }
}

// Set up all interactive event listeners
function setupEventListeners() {
    // SPA Tab Navigation
    DOM.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = tab.getAttribute('data-target');
            switchTab(target);
        });
    });

    // Logo reset click
    DOM.logo.addEventListener('click', () => {
        state.searchQuery = '';
        DOM.searchBar.value = '';
        state.activeCategory = 'All';
        
        // Reset category pill state
        document.querySelectorAll('.category-pill').forEach(pill => {
            if (pill.getAttribute('data-category') === 'All') {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
        
        switchTab('browse-section');
        loadBrowseRecipes();
    });

    // Search input handling with debounce (300ms)
    DOM.searchBar.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => {
            loadBrowseRecipes();
        }, 300);
    });

    // Category pills selection
    DOM.categoryPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (!pill) return;

        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        state.activeCategory = pill.getAttribute('data-category');
        loadBrowseRecipes();
    });

    // Auth forms toggle
    DOM.toggleToRegister.addEventListener('click', () => {
        DOM.loginFormView.style.display = 'none';
        DOM.registerFormView.style.display = 'block';
    });

    DOM.toggleToLogin.addEventListener('click', () => {
        DOM.registerFormView.style.display = 'none';
        DOM.loginFormView.style.display = 'block';
    });

    // Close buttons for modals
    DOM.closeAuthModalBtn.addEventListener('click', () => toggleModal(DOM.authModal, false));
    DOM.authModalBackdrop.addEventListener('click', () => toggleModal(DOM.authModal, false));
    
    DOM.closeDetailBtn.addEventListener('click', () => toggleModal(DOM.detailModal, false));
    DOM.detailBackdrop.addEventListener('click', () => toggleModal(DOM.detailModal, false));

    // Form submissions
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.registerForm.addEventListener('submit', handleRegister);
    DOM.addRecipeForm.addEventListener('submit', handleAddRecipe);

    // Dynamic row addition in Create Recipe form
    DOM.addIngredientBtn.addEventListener('click', () => addFormRow('ingredients'));
    DOM.addInstructionBtn.addEventListener('click', () => addFormRow('instructions'));
}

// Routing logic
function switchTab(targetTabId) {
    // Authorization barrier for Favorites, My Recipes, Add Recipe tabs
    if (targetTabId !== 'browse-section' && !state.user) {
        showToast('Please login to access this feature.', 'info');
        toggleModal(DOM.authModal, true);
        return;
    }

    state.activeTab = targetTabId;
    
    // Update active tab buttons
    DOM.tabs.forEach(tab => {
        if (tab.getAttribute('data-target') === targetTabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Toggle pages visibility
    DOM.pages.forEach(page => {
        if (page.id === targetTabId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    loadPageData();
}

// Load data based on active tab routing
function loadPageData() {
    if (state.activeTab === 'browse-section') {
        loadBrowseRecipes();
    } else if (state.activeTab === 'favorites-section') {
        loadFavoriteRecipes();
    } else if (state.activeTab === 'my-recipes-section') {
        loadMyRecipes();
    }
}

// ==========================================
// DATA LOADING AND RENDERING FUNCTIONS
// ==========================================

// Load Browse/Search Results
async function loadBrowseRecipes() {
    DOM.recipesCount.textContent = 'Loading recipes...';
    DOM.recipesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
            <div class="avatar" style="margin: 0 auto 1rem auto; width: 48px; height: 48px; animation: spin 1s infinite linear;">F</div>
            Searching recipes...
        </div>
    `;

    const res = await apiCall('get_recipes', 'GET', null);
    
    if (res && res.success) {
        state.recipes = res.recipes;
        
        // Filter client-side if category/query are set (already filtered server-side but safe to filter again or fetch parameters)
        // Let's call the API with the actual parameters for server-side query processing!
        const paramUrl = `get_recipes&query=${encodeURIComponent(state.searchQuery)}&category=${encodeURIComponent(state.activeCategory)}`;
        const filterRes = await apiCall(paramUrl, 'GET');
        
        if (filterRes && filterRes.success) {
            const list = filterRes.recipes;
            renderRecipeGrid(DOM.recipesGrid, list, 'browse');
            DOM.recipesCount.textContent = `${list.length} recipe${list.length === 1 ? '' : 's'} found`;
            
            if (state.searchQuery) {
                DOM.browseTitle.textContent = `Search Results for "${state.searchQuery}"`;
            } else {
                DOM.browseTitle.textContent = state.activeCategory === 'All' ? 'All Recipes' : `${state.activeCategory} Recipes`;
            }
        }
    }
}

// Load user's favorites
async function loadFavoriteRecipes() {
    DOM.favoritesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading favorites...</div>';
    const res = await apiCall('get_favorites', 'GET');
    
    if (res && res.success) {
        renderRecipeGrid(DOM.favoritesGrid, res.favorites, 'favorites');
        DOM.favoritesCount.textContent = `${res.favorites.length} recipe${res.favorites.length === 1 ? '' : 's'} saved`;
    }
}

// Load custom recipes authored by user
async function loadMyRecipes() {
    DOM.myRecipesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading your recipes...</div>';
    const res = await apiCall('get_recipes&my_recipes=true', 'GET');
    
    if (res && res.success) {
        renderRecipeGrid(DOM.myRecipesGrid, res.recipes, 'my-recipes');
        DOM.myRecipesCount.textContent = `${res.recipes.length} recipe${res.recipes.length === 1 ? '' : 's'} created`;
    }
}

// Master grid renderer
function renderRecipeGrid(gridElement, recipeList, viewType) {
    gridElement.innerHTML = '';
    
    if (recipeList.length === 0) {
        let msg = "No recipes found matching your query.";
        if (viewType === 'favorites') msg = "You haven't favorited any recipes yet. Browse and tap the heart icon to save recipes!";
        if (viewType === 'my-recipes') msg = "You haven't uploaded any custom recipes yet. Go to the 'Add Recipe' tab to create your first!";
        
        gridElement.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <svg viewBox="0 0 24 24"><use href="#icon-book"></use></svg>
                <h3>Nothing here yet</h3>
                <p>${msg}</p>
                ${viewType === 'favorites' ? `<button class="btn btn-primary" onclick="switchTab('browse-section')">Browse Recipes</button>` : ''}
                ${viewType === 'my-recipes' ? `<button class="btn btn-primary" onclick="switchTab('add-recipe-section')">Add a Recipe</button>` : ''}
            </div>
        `;
        return;
    }
    
    recipeList.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.setAttribute('data-id', recipe.id);
        
        const isFavorited = recipe.isFavorited || state.favoriteIds.includes(recipe.id);
        const difficultyClass = recipe.difficulty.toLowerCase();
        
        // Tags markup
        const tagsHtml = (recipe.tags || []).slice(0, 2).map(tag => `<span class="recipe-tag">#${tag}</span>`).join(' ');
        
        card.innerHTML = `
            <div class="recipe-image-wrapper">
                <img class="recipe-image" src="${recipe.image}" alt="${recipe.title}" loading="lazy">
                <div class="recipe-card-overlay">
                    <span class="category-badge">${recipe.category}</span>
                    <button class="btn-favorite-icon ${isFavorited ? 'active' : ''}" data-fav-id="${recipe.id}">
                        <svg viewBox="0 0 24 24"><use href="#icon-heart"></use></svg>
                    </button>
                </div>
            </div>
            <div class="recipe-content">
                <div class="recipe-tags">${tagsHtml}</div>
                <h3 class="recipe-title">${recipe.title}</h3>
                <p class="recipe-desc">${recipe.description}</p>
                
                <div class="recipe-meta">
                    <span class="meta-item">
                        <svg viewBox="0 0 24 24"><use href="#icon-clock"></use></svg>
                        ${recipe.prepTime + recipe.cookTime} mins
                    </span>
                    <span class="meta-item">
                        <svg viewBox="0 0 24 24"><use href="#icon-people"></use></svg>
                        ${recipe.servings} servings
                    </span>
                    <span class="difficulty-badge ${difficultyClass}">${recipe.difficulty}</span>
                </div>
            </div>
        `;
        
        // Creator controls: Show deletion button if the logged-in user created this custom recipe
        if (recipe.isOwner && viewType === 'my-recipes') {
            const deleteBar = document.createElement('div');
            deleteBar.className = 'owner-action-bar';
            deleteBar.innerHTML = `
                <button class="btn btn-danger btn-icon" data-delete-id="${recipe.id}" title="Delete Custom Recipe">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><use href="#icon-trash"></use></svg>
                </button>
            `;
            card.appendChild(deleteBar);
            
            // Delete click binding
            deleteBar.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation(); // Stop trigger opening details modal
                handleDeleteRecipe(recipe.id);
            });
        }
        
        // Favorite button click binding
        card.querySelector('.btn-favorite-icon').addEventListener('click', (e) => {
            e.stopPropagation(); // Stop trigger opening details modal
            handleToggleFavorite(recipe.id, e.currentTarget);
        });

        // Open details modal binding on card body click
        card.addEventListener('click', (e) => {
            // Make sure we didn't click the favorite icon or deletion button
            if (!e.target.closest('.btn-favorite-icon') && !e.target.closest('.btn-icon')) {
                openRecipeDetails(recipe.id);
            }
        });
        
        gridElement.appendChild(card);
    });
}

// Toggle favorites AJAX
async function handleToggleFavorite(recipeId, favoriteButtonEl) {
    if (!state.user) {
        showToast('Login required to favorite recipes.', 'info');
        toggleModal(DOM.authModal, true);
        return;
    }

    const res = await apiCall('toggle_favorite', 'POST', { id: recipeId });
    if (res && res.success) {
        const isFav = res.favorited;
        if (isFav) {
            favoriteButtonEl.classList.add('active');
            if (!state.favoriteIds.includes(recipeId)) state.favoriteIds.push(recipeId);
            showToast('Added to favorites!', 'success');
        } else {
            favoriteButtonEl.classList.remove('active');
            state.favoriteIds = state.favoriteIds.filter(id => id !== recipeId);
            showToast('Removed from favorites.', 'info');
        }
        
        // Sync grids if we are on favorites tab
        if (state.activeTab === 'favorites-section') {
            loadFavoriteRecipes();
        }
    } else {
        showToast(res.message || 'Action failed.', 'error');
    }
}

// Delete custom recipe AJAX
async function handleDeleteRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this custom recipe? This action cannot be undone.')) {
        return;
    }

    const res = await apiCall('delete_recipe', 'POST', { id: recipeId, _method: 'DELETE' });
    if (res && res.success) {
        showToast('Recipe deleted successfully.', 'success');
        // Reload grids
        loadMyRecipes();
        // Clear from local favorites array if there
        state.favoriteIds = state.favoriteIds.filter(id => id !== recipeId);
    } else {
        showToast(res.message || 'Failed to delete recipe.', 'error');
    }
}

// ==========================================
// RECIPE DETAIL MODAL RENDERING
// ==========================================

async function openRecipeDetails(recipeId) {
    DOM.detailBody.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:300px;flex-direction:column;color:var(--text-secondary);">
            <div class="avatar" style="width:40px;height:40px;animation:spin 1s infinite linear;margin-bottom:1rem;">F</div>
            Loading recipe details...
        </div>
    `;
    toggleModal(DOM.detailModal, true);
    
    const res = await apiCall(`get_recipe_details&id=${recipeId}`, 'GET');
    if (res && res.success) {
        const recipe = res.recipe;
        renderRecipeDetail(recipe);
    } else {
        DOM.detailBody.innerHTML = `
            <div style="padding:4rem 2rem;text-align:center;">
                <svg viewBox="0 0 24 24" style="width:64px;height:64px;fill:var(--accent-red);"><use href="#icon-close"></use></svg>
                <h3 style="margin-top:1.5rem;">Failed to Load</h3>
                <p style="color:var(--text-secondary);margin-top:0.5rem;">${res.message || 'We could not fetch details for this recipe.'}</p>
            </div>
        `;
    }
}

function renderRecipeDetail(recipe) {
    const isFavorited = recipe.isFavorited || state.favoriteIds.includes(recipe.id);
    const difficultyClass = recipe.difficulty.toLowerCase();
    const totalMinutes = recipe.prepTime + recipe.cookTime;
    
    // Ingredients check list
    const ingredientsHtml = (recipe.ingredients || []).map((ing, idx) => `
        <li class="ingredient-item" data-idx="${idx}">
            <div class="ingredient-checkbox">
                <svg viewBox="0 0 24 24"><use href="#icon-check"></use></svg>
            </div>
            <span><strong>${ing.amount}</strong> ${ing.name}</span>
        </li>
    `).join('');
    
    // Instructions numbered list
    const instructionsHtml = (recipe.instructions || []).map((step, idx) => `
        <div class="step-card">
            <span class="step-number">${idx + 1}</span>
            <div class="step-content">${step}</div>
        </div>
    `).join('');

    // Video Section
    let videoHtml = '';
    if (recipe.youtubeId) {
        videoHtml = `
            <div class="youtube-section">
                <h3 class="column-title" style="margin-top: 1.5rem; margin-bottom: 1.5rem;">Video Demonstration</h3>
                <div class="video-container">
                    <iframe src="https://www.youtube.com/embed/${recipe.youtubeId}" 
                            title="YouTube recipe video player" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen></iframe>
                </div>
            </div>
        `;
    }

    // Nutrition values
    const nut = recipe.nutritionalInfo || {};
    const calories = nut.calories ? `${nut.calories} kcal` : 'N/A';
    const protein = nut.protein || 'N/A';
    const carbs = nut.carbs || 'N/A';
    const fat = nut.fat || 'N/A';

    DOM.detailBody.innerHTML = `
        <!-- Cover Banner -->
        <div class="recipe-detail-hero">
            <img src="${recipe.image}" alt="${recipe.title}">
            <div class="recipe-detail-hero-overlay">
                <span class="category-badge">${recipe.category}</span>
                <h2 class="recipe-detail-title">${recipe.title}</h2>
            </div>
            <div class="recipe-detail-actions">
                <button class="btn-favorite-icon ${isFavorited ? 'active' : ''}" id="detail-fav-btn">
                    <svg viewBox="0 0 24 24"><use href="#icon-heart"></use></svg>
                </button>
            </div>
        </div>

        <!-- Details Info Body -->
        <div class="recipe-detail-main">
            <!-- Stats -->
            <div class="recipe-detail-stats">
                <div class="stat-box">
                    <span class="val">${recipe.prepTime} min</span>
                    <span class="lbl">Prep Time</span>
                </div>
                <div class="stat-box">
                    <span class="val">${recipe.cookTime} min</span>
                    <span class="lbl">Cook Time</span>
                </div>
                <div class="stat-box">
                    <span class="val">${totalMinutes} min</span>
                    <span class="lbl">Total Time</span>
                </div>
                <div class="stat-box">
                    <span class="val">${recipe.servings}</span>
                    <span class="lbl">Servings</span>
                </div>
            </div>

            <!-- Two Columns -->
            <div class="recipe-columns">
                <!-- Left: Ingredients Checkbox list -->
                <div class="ingredients-panel">
                    <h3 class="column-title">Ingredients</h3>
                    <ul class="ingredient-list" id="detail-ingredients-list">
                        ${ingredientsHtml}
                    </ul>
                </div>
                
                <!-- Right: Instructions steps -->
                <div class="instructions-panel">
                    <h3 class="column-title">Cooking Steps</h3>
                    <div class="instruction-steps">
                        ${instructionsHtml}
                    </div>
                </div>
            </div>

            <!-- Nutrition panel (horizontal) -->
            <div class="nutrition-details">
                <h3 class="column-title" style="margin-top: 0; font-size:1.15rem; border-bottom: none; margin-bottom: 0.75rem;">Nutritional Facts (Per Serving)</h3>
                <div class="nutrition-details-grid">
                    <div class="nut-box">
                        <div class="nut-val">${calories}</div>
                        <div class="nut-lbl">Calories</div>
                    </div>
                    <div class="nut-box">
                        <div class="nut-val">${protein}</div>
                        <div class="nut-lbl">Protein</div>
                    </div>
                    <div class="nut-box">
                        <div class="nut-val">${carbs}</div>
                        <div class="nut-lbl">Carbs</div>
                    </div>
                    <div class="nut-box">
                        <div class="nut-val">${fat}</div>
                        <div class="nut-lbl">Fat</div>
                    </div>
                </div>
            </div>

            <!-- Video Demonstration -->
            ${videoHtml}
        </div>
    `;

    // Bind Favorite Action inside Modal
    document.getElementById('detail-fav-btn').addEventListener('click', (e) => {
        handleToggleFavorite(recipe.id, e.currentTarget);
    });

    // Bind Interactive Checkbox Crossing
    const ingItems = DOM.detailBody.querySelectorAll('.ingredient-item');
    ingItems.forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('checked');
        });
    });
}

// ==========================================
// DYNAMIC FORM ROWS (CREATE RECIPE)
// ==========================================

function addFormRow(type) {
    if (type === 'ingredients') {
        const row = document.createElement('div');
        row.className = 'row-item';
        row.innerHTML = `
            <input type="text" class="form-control ing-name" placeholder="Ingredient name (e.g. Fresh Basil)" required style="flex-grow: 2;">
            <input type="text" class="form-control ing-amount" placeholder="Amount (e.g. 5 leaves)" required style="flex-grow: 1;">
            <button type="button" class="btn-icon btn-icon-danger remove-row-btn">
                <svg viewBox="0 0 24 24"><use href="#icon-close"></use></svg>
            </button>
        `;
        
        DOM.ingredientsContainer.appendChild(row);
        bindRowRemover(row, 'ingredients');
    } else if (type === 'instructions') {
        const rowCount = DOM.instructionsContainer.querySelectorAll('.row-item').length;
        const row = document.createElement('div');
        row.className = 'row-item';
        row.innerHTML = `
            <span class="step-number">${rowCount + 1}</span>
            <textarea class="form-control step-content-input" placeholder="Explain this cooking step..." required style="flex-grow: 1; min-height: 60px;"></textarea>
            <button type="button" class="btn-icon btn-icon-danger remove-row-btn">
                <svg viewBox="0 0 24 24"><use href="#icon-close"></use></svg>
            </button>
        `;
        
        DOM.instructionsContainer.appendChild(row);
        bindRowRemover(row, 'instructions');
    }
}

function bindRowRemover(rowElement, type) {
    const removeBtn = rowElement.querySelector('.remove-row-btn');
    removeBtn.addEventListener('click', () => {
        rowElement.remove();
        if (type === 'instructions') {
            // Recalculate instruction numbers
            const steps = DOM.instructionsContainer.querySelectorAll('.step-number');
            steps.forEach((span, index) => {
                span.textContent = index + 1;
            });
        }
        toggleInitialRowRemovers(type);
    });
    toggleInitialRowRemovers(type);
}

// Check if we should show delete button (hide it if only 1 row remains)
function toggleInitialRowRemovers(type) {
    const container = type === 'ingredients' ? DOM.ingredientsContainer : DOM.instructionsContainer;
    const rows = container.querySelectorAll('.row-item');
    
    if (rows.length <= 1) {
        rows[0].querySelector('.remove-row-btn').style.visibility = 'hidden';
    } else {
        rows.forEach(row => {
            row.querySelector('.remove-row-btn').style.visibility = 'visible';
        });
    }
}

// Bind initial delete row actions if they are loaded on load
document.querySelectorAll('#ingredients-form-rows .row-item, #instructions-form-rows .row-item').forEach(row => {
    const isIng = row.closest('#ingredients-form-rows') !== null;
    const type = isIng ? 'ingredients' : 'instructions';
    
    // Bind click if remove-row-btn exists
    const btn = row.querySelector('.remove-row-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            row.remove();
            if (type === 'instructions') {
                const steps = DOM.instructionsContainer.querySelectorAll('.step-number');
                steps.forEach((span, index) => {
                    span.textContent = index + 1;
                });
            }
            toggleInitialRowRemovers(type);
        });
    }
});

// ==========================================
// FORM SUBMISSIONS HANDLERS
// ==========================================

// Login Submission
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    const res = await apiCall('login', 'POST', { username: user, password: pass });
    if (res && res.success) {
        state.user = res.user;
        state.favoriteIds = []; // Session check status will retrieve these shortly
        await checkAuthStatus(); // Reload user settings & favorites
        
        DOM.loginForm.reset();
        toggleModal(DOM.authModal, false);
        showToast(`Welcome back, ${state.user.username}!`, 'success');
        
        // Refresh active views
        loadPageData();
    } else {
        showToast(res.message || 'Login failed.', 'error');
    }
}

// Registration Submission
async function handleRegister(e) {
    e.preventDefault();
    const user = document.getElementById('register-username').value.trim();
    const pass = document.getElementById('register-password').value;

    const res = await apiCall('register', 'POST', { username: user, password: pass });
    if (res && res.success) {
        state.user = res.user;
        await checkAuthStatus();
        
        DOM.registerForm.reset();
        toggleModal(DOM.authModal, false);
        showToast('Registration successful! Profile active.', 'success');
        
        // Refresh active views
        loadPageData();
    } else {
        showToast(res.message || 'Registration failed.', 'error');
    }
}

// Logout Action
async function handleLogout() {
    const res = await apiCall('logout', 'POST');
    if (res && res.success) {
        state.user = null;
        state.favoriteIds = [];
        updateAuthUI();
        showToast('Successfully logged out.', 'info');
        
        // Re-route to browse section in case they are on a protected tab
        if (state.activeTab !== 'browse-section') {
            switchTab('browse-section');
        } else {
            loadBrowseRecipes();
        }
    }
}

// Add Custom Recipe Submission
async function handleAddRecipe(e) {
    e.preventDefault();
    
    // Gather values
    const title = document.getElementById('recipe-title-input').value.trim();
    const description = document.getElementById('recipe-desc-input').value.trim();
    const category = document.getElementById('recipe-cat-input').value;
    const difficulty = document.getElementById('recipe-difficulty-input').value;
    const prepTime = parseInt(document.getElementById('recipe-prep-input').value) || 10;
    const cookTime = parseInt(document.getElementById('recipe-cook-input').value) || 10;
    const servings = parseInt(document.getElementById('recipe-servings-input').value) || 2;
    const youtubeUrl = document.getElementById('recipe-youtube-input').value.trim();
    const image = document.getElementById('recipe-image-input').value.trim();
    
    // Nutrition
    const calories = parseInt(document.getElementById('recipe-cal-input').value) || 0;
    const protein = document.getElementById('recipe-protein-input').value.trim();
    const carbs = document.getElementById('recipe-carbs-input').value.trim();
    const fat = document.getElementById('recipe-fat-input').value.trim();

    // Ingredients
    const ingredientRows = DOM.ingredientsContainer.querySelectorAll('.row-item');
    const ingredients = [];
    ingredientRows.forEach(row => {
        const name = row.querySelector('.ing-name').value.trim();
        const amount = row.querySelector('.ing-amount').value.trim();
        if (name) {
            ingredients.push({ name, amount });
        }
    });

    // Instructions
    const instructionRows = DOM.instructionsContainer.querySelectorAll('.row-item');
    const instructions = [];
    instructionRows.forEach(row => {
        const stepText = row.querySelector('.step-content-input').value.trim();
        if (stepText) {
            instructions.push(stepText);
        }
    });

    if (ingredients.length === 0) {
        showToast('Please add at least one ingredient.', 'error');
        return;
    }
    if (instructions.length === 0) {
        showToast('Please add at least one instruction step.', 'error');
        return;
    }

    const payload = {
        title,
        description,
        category,
        difficulty,
        prepTime,
        cookTime,
        servings,
        youtubeUrl,
        image,
        calories,
        protein,
        carbs,
        fat,
        ingredients,
        instructions
    };

    const res = await apiCall('add_recipe', 'POST', payload);
    if (res && res.success) {
        showToast('Recipe created successfully!', 'success');
        
        // Reset form
        DOM.addRecipeForm.reset();
        
        // Reset dynamic elements in form to single rows
        DOM.ingredientsContainer.innerHTML = `
            <div class="row-item">
                <input type="text" class="form-control ing-name" placeholder="Ingredient name (e.g. Fresh Garlic)" required style="flex-grow: 2;">
                <input type="text" class="form-control ing-amount" placeholder="Amount (e.g. 3 cloves)" required style="flex-grow: 1;">
                <button type="button" class="btn-icon btn-icon-danger remove-row-btn" style="visibility: hidden;">
                    <svg viewBox="0 0 24 24"><use href="#icon-close"></use></svg>
                </button>
            </div>
        `;
        DOM.instructionsContainer.innerHTML = `
            <div class="row-item">
                <span class="step-number">1</span>
                <textarea class="form-control step-content-input" placeholder="Explain this cooking step..." required style="flex-grow: 1; min-height: 60px;"></textarea>
                <button type="button" class="btn-icon btn-icon-danger remove-row-btn" style="visibility: hidden;">
                    <svg viewBox="0 0 24 24"><use href="#icon-close"></use></svg>
                </button>
            </div>
        `;
        
        toggleInitialRowRemovers('ingredients');
        toggleInitialRowRemovers('instructions');

        // Switch to My Recipes Tab
        switchTab('my-recipes-section');
    } else {
        showToast(res.message || 'Failed to create recipe.', 'error');
    }
}

// Add simple CSS animations classes at runtime
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);
