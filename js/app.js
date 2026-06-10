// State Management
const state = {
    dramas: [],
    currentDrama: null,
    currentPage: 'home',
    favorites: JSON.parse(localStorage.getItem('fav_dramas') || '[]'),
    history: JSON.parse(localStorage.getItem('watch_history') || '[]')
};

// DOM Elements
const mainContent = document.getElementById('mainContent');
const initialLoader = document.getElementById('initialLoader');
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Initialization
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await loadDramas();
        handleRoute();
        initEventListeners();
        initHeaderScroll();
    } catch (error) {
        console.error("Initialization failed", error);
        mainContent.innerHTML = '<div class="container"><h2 style="text-align:center;margin-top:50px;">Failed to load content. Please run on a local server.</h2></div>';
    }
}

// Data Loading
async function loadDramas() {
    // Fetch the master list
    const response = await fetch('data/dramas.json');
    const list = await response.json();
    
    // Fetch all individual drama files
    const promises = list.map(item => fetch(`data/${item.file}`).then(res => res.json()));
    state.dramas = await Promise.all(promises);
}

// Router
function handleRoute() {
    const params = new URLSearchParams(window.location.search);
    const dramaId = params.get('drama');
    const season = params.get('season');
    const episode = params.get('episode');

    // Scroll to top on ANY route change
    window.scrollTo(0, 0);

    if (dramaId && season && episode) {
        renderEpisodePage(dramaId, parseInt(season), parseInt(episode));
    } else if (dramaId) {
        renderDramaDetail(dramaId);
    } else {
        renderHome();
    }
}

// Rendering: Home
function renderHome() {
    state.currentPage = 'home';
    updateSEO('DramaVault - Home');
    
    const featured = state.dramas.slice(0, 4); // Hero slides
    const trending = [...state.dramas].sort((a,b) => b.views - a.views).slice(0, 10);
    
    let html = `
        <!-- Hero Slider -->
        <section class="hero">
            <div class="hero-slider">
                ${featured.map((d, i) => `
                    <div class="hero-slide ${i === 0 ? 'active' : ''}">
                        <img src="${d.banner}" class="hero-bg" alt="${d.title}">
                        <div class="hero-overlay"></div>
                        <div class="hero-content">
                            <span class="hero-tag">${d.status}</span>
                            <h1 class="hero-title">${d.title}</h1>
                            <p class="hero-desc">${d.description}</p>
                            <a href="index.html?drama=${d.id}" class="btn btn-primary">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                Watch Now
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>

        <div class="container">
            <!-- Continue Watching -->
            ${state.history.length > 0 ? `
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Continue Watching</h2>
                </div>
                <div class="drama-row">
                    ${state.history.slice(0, 5).map(h => {
                        const d = state.dramas.find(x => x.id === h.id);
                        if(!d) return '';
                        return createCardHTML(d, false, `index.html?drama=${d.id}&season=${h.season}&episode=${h.episode}`);
                    }).join('')}
                </div>
            </section>
            ` : ''}

            <!-- Trending -->
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Trending Now</h2>
                </div>
                <div class="drama-row">
                    ${trending.map(d => createCardHTML(d)).join('')}
                </div>
            </section>

            <!-- Categories -->
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Categories</h2>
                </div>
                <div class="category-pills">
                    <button class="pill active" onclick="filterCategory('All')">All</button>
                    <button class="pill" onclick="filterCategory('Romance')">Romance</button>
                    <button class="pill" onclick="filterCategory('Drama')">Drama</button>
                    <button class="pill" onclick="filterCategory('Action')">Action</button>
                    <button class="pill" onclick="filterCategory('Fantasy')">Fantasy</button>
                    <button class="pill" onclick="filterCategory('Historical')">Historical</button>
                </div>
                <div id="categoryResults" class="drama-row" style="margin-top:20px;">
                    ${state.dramas.map(d => createCardHTML(d)).join('')}
                </div>
            </section>
            
            <!-- Ad Placeholder -->
            <div style="background: #eee; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <!-- Ad Code Here -->
                Advertisement
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
    initHeroSlider();
}

// Rendering: Drama Detail
function renderDramaDetail(id) {
    const drama = state.dramas.find(d => d.id === id);
    if (!drama) {
        renderHome();
        return;
    }

    state.currentDrama = drama;
    state.currentPage = 'detail';
    updateSEO(`${drama.title} - DramaVault`);

    let html = `
        <section class="detail-banner">
            <img src="${drama.banner}" class="detail-bg" alt="${drama.title}">
            <div class="detail-gradient"></div>
        </section>

        <div class="detail-content">
            <div class="detail-poster">
                <img src="${drama.poster}" alt="${drama.title}">
            </div>
            <div class="detail-info">
                <h1>${drama.title}</h1>
                <div class="detail-meta">
                    <span>${drama.year}</span>
                    <span>${drama.status}</span>
                    <span>${drama.views.toLocaleString()} Views</span>
                    <span class="tag">${drama.rating} Rating</span>
                </div>
                <div style="margin-bottom:15px;">
                    ${drama.genres.map(g => `<span class="tag">${g}</span>`).join(' ')}
                </div>
                <p class="detail-desc">${drama.description}</p>
                <div style="display:flex; gap:10px;">
                    <a href="index.html?drama=${drama.id}&season=1&episode=1" class="btn btn-primary">Watch Now</a>
                    <button class="btn" style="background:white; border:1px solid var(--accent);" onclick="toggleFavorite('${drama.id}')">
                        ${state.favorites.includes(drama.id) ? 'Remove from List' : 'Add to List'}
                    </button>
                </div>
            </div>
        </div>

        <div class="episodes-container">
            <div class="season-tabs" id="seasonTabs">
                ${drama.seasons.map((s, i) => `
                    <button class="season-tab ${i === 0 ? 'active' : ''}" onclick="switchSeason(${s.season}, this)">Season ${s.season}</button>
                `).join('')}
            </div>
            <div id="episodeList" class="episode-list">
                ${renderEpisodes(drama.seasons[0])}
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
}

// Rendering: Episode Page
function renderEpisodePage(dramaId, seasonNum, epNum) {
    const drama = state.dramas.find(d => d.id === dramaId);
    if (!drama) return;

    const season = drama.seasons.find(s => s.season === seasonNum);
    const episode = season.episodes.find(e => e.episode === epNum);
    
    // Save to history
    addToHistory(dramaId, seasonNum, epNum);

    state.currentPage = 'episode';
    updateSEO(`${drama.title} S${seasonNum}E${epNum}`);

    const hasAccess = localStorage.getItem(`access_${dramaId}_${seasonNum}_${epNum}`) === 'true';

    let html = `
        <div class="player-page">
            <div class="player-wrapper">
                <div class="video-container" id="videoContainer">
                    <img src="${episode.thumbnail}" class="video-placeholder-img">
                    
                    ${hasAccess ? `
                        <video id="videoPlayer" class="video-player" controls width="100%" style="position:relative; z-index:20;">
                            <source src="${episode.video_url}" type="video/mp4">
                        </video>
                    ` : `
                        <div class="access-overlay" id="accessOverlay">
                            <h3>Ready to Watch?</h3>
                            <p>Click below to continue. An ad will open in a new tab.</p>
                            <button class="access-btn" id="accessBtn" onclick="handleAccess('${dramaId}', ${seasonNum}, ${epNum}, '${episode.ad_url}')">
                                Continue To Watch
                            </button>
                            <div class="success-msg" id="successMsg">Access granted! Click Play Episode.</div>
                        </div>
                    `}
                </div>

                <div class="player-info">
                    <div>
                        <h2>${drama.title}</h2>
                        <p>Season ${seasonNum} Episode ${epNum}: ${episode.title}</p>
                    </div>
                    <div class="player-nav">
                        ${createNavButton(drama, seasonNum, epNum, -1, 'Previous')}
                        ${createNavButton(drama, seasonNum, epNum, 1, 'Next')}
                    </div>
                </div>
            </div>
            
            <!-- Ad Placeholder -->
            <div style="max-width: 1000px; margin: 20px auto; background: #222; padding: 20px; text-align: center; color: #666;">
                Ad Banner
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
}

// Logic: Access Control
function handleAccess(dramaId, season, episode, adUrl) {
    const btn = document.getElementById('accessBtn');
    const msg = document.getElementById('successMsg');
    
    // 1. Open Ad in new tab
    if(adUrl && adUrl !== "AD_URL_HERE") {
        window.open(adUrl, '_blank');
    }

    // 2. Save to localStorage
    localStorage.setItem(`access_${dramaId}_${season}_${episode}`, 'true');
    
    // 3. Update UI
    btn.textContent = "Play Episode";
    btn.classList.add('granted');
    btn.onclick = function() {
        renderEpisodePage(dramaId, season, episode);
    };
    
    msg.classList.add('show');
}

// Helper: Create Card HTML
function createCardHTML(drama, showMeta = true, customLink = null) {
    const link = customLink || `index.html?drama=${drama.id}`;
    return `
        <a href="${link}" class="drama-card">
            <div class="card-poster">
                <img src="${drama.poster}" alt="${drama.title}" loading="lazy">
                <span class="card-badge">${drama.status}</span>
                <div class="card-rating">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ${drama.rating}
                </div>
            </div>
            <div class="card-info">
                <div class="card-title">${drama.title}</div>
            </div>
        </a>
    `;
}

// Helper: Render Episodes
function renderEpisodes(season) {
    if(!season) return '';
    return season.episodes.map(ep => `
        <a href="index.html?drama=${state.currentDrama.id}&season=${season.season}&episode=${ep.episode}" class="episode-card">
            <div class="ep-thumb">
                <img src="${ep.thumbnail}" loading="lazy">
                <span class="ep-num">E${ep.episode}</span>
            </div>
            <div class="ep-info">
                <h4>${ep.title}</h4>
                <p>Episode ${ep.episode}</p>
            </div>
        </a>
    `).join('');
}

// Helper: Navigation Buttons
function createNavButton(drama, currentSeason, currentEp, direction, label) {
    // Find current season object
    let season = drama.seasons.find(s => s.season === currentSeason);
    let targetEp = currentEp + direction;
    let targetSeason = currentSeason;

    // Check if we need to switch seasons
    if (direction > 0 && targetEp > season.episodes.length) {
        // Move to next season first episode
        let nextSeasonIndex = drama.seasons.findIndex(s => s.season === currentSeason) + 1;
        if (nextSeasonIndex < drama.seasons.length) {
            season = drama.seasons[nextSeasonIndex];
            targetSeason = season.season;
            targetEp = 1;
        } else {
            return `<button class="nav-btn" disabled>${label}</button>`;
        }
    } else if (direction < 0 && targetEp < 1) {
        // Move to previous season last episode
        let prevSeasonIndex = drama.seasons.findIndex(s => s.season === currentSeason) - 1;
        if (prevSeasonIndex >= 0) {
            season = drama.seasons[prevSeasonIndex];
            targetSeason = season.season;
            targetEp = season.episodes.length;
        } else {
            return `<button class="nav-btn" disabled>${label}</button>`;
        }
    }

    return `<a href="index.html?drama=${drama.id}&season=${targetSeason}&episode=${targetEp}" class="nav-btn">${label}</a>`;
}

// Feature: Favorite Toggle
function toggleFavorite(id) {
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(f => f !== id);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem('fav_dramas', JSON.stringify(state.favorites));
    renderDramaDetail(id); // Re-render to update button
}

// Feature: History
function addToHistory(id, s, e) {
    let history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    // Remove if already exists
    history = history.filter(h => !(h.id === id && h.season === s && h.episode === e));
    history.unshift({ id, season: s, episode: e });
    localStorage.setItem('watch_history', JSON.stringify(history.slice(0, 10)));
}

// Feature: Category Filter
window.filterCategory = function(category) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    event.target.classList.add('active');
    
    const container = document.getElementById('categoryResults');
    let filtered = category === 'All' ? state.dramas : state.dramas.filter(d => d.genres.includes(category));
    
    container.innerHTML = filtered.map(d => createCardHTML(d)).join('');
};

// Feature: Season Switch
window.switchSeason = function(seasonNum, btn) {
    document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    const season = state.currentDrama.seasons.find(s => s.season === seasonNum);
    document.getElementById('episodeList').innerHTML = renderEpisodes(season);
};

// Feature: Hero Slider Auto-play
function initHeroSlider() {
    let index = 0;
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    setInterval(() => {
        slides[index].classList.remove('active');
        index = (index + 1) % slides.length;
        slides[index].classList.add('active');
    }, 5000);
}

// Feature: Header Scroll
function initHeaderScroll() {
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        } else {
            header.style.boxShadow = 'none';
        }
    });
}

// Feature: Search
function initEventListeners() {
    // Search Toggle
    document.getElementById('searchToggle').addEventListener('click', () => {
        searchModal.classList.add('active');
        searchInput.focus();
    });

    document.getElementById('searchClose').addEventListener('click', () => {
        searchModal.classList.remove('active');
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        if (!q) {
            searchResults.innerHTML = '';
            return;
        }
        
        const results = state.dramas.filter(d => 
            d.title.toLowerCase().includes(q) || 
            d.genres.some(g => g.toLowerCase().includes(q))
        );

        searchResults.innerHTML = results.map(d => `
            <a href="index.html?drama=${d.id}" class="search-result-item">
                <img src="${d.poster}" alt="${d.title}">
                <div>
                    <h4>${d.title}</h4>
                    <p>${d.genres.join(', ')}</p>
                </div>
            </a>
        `).join('');
    });

    // Favorites
    document.getElementById('favoritesToggle').addEventListener('click', () => {
        state.currentPage = 'favorites';
        mainContent.innerHTML = `
            <div class="container" style="padding-top: 100px;">
                <h2 class="section-title">My Favorites</h2>
                <div class="drama-row" style="flex-wrap: wrap; gap: 20px; margin-top: 30px;">
                    ${state.favorites.length === 0 ? '<p>No favorites added yet.</p>' : 
                        state.favorites.map(id => {
                            const d = state.dramas.find(x => x.id === id);
                            return d ? createCardHTML(d) : '';
                        }).join('')
                    }
                </div>
            </div>
        `;
    });
}

// Utility: SEO
function updateSEO(title) {
    document.title = title;
}
