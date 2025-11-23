// Campus Compliments - Map Pin Location Selection with UIUC Building Data
mapboxgl.accessToken = 'pk.eyJ1IjoidHVzaGFyajA0IiwiYSI6ImNtaTBubDFzbzB5d2cya3E2eHprdWFqajcifQ.dQT1U3K3IWoDl9WbUMSNCQ';

class CampusCompliments {
    constructor() {
        this.state = {
            compliments: [],
            uiucBuildings: [],
            map: null,
            markers: [],
            userLocation: null,
            userMarker: null,
            theme: 'light',
            currentTab: 'map',
            searchQuery: '',
            selectedLocation: null,
            selectedBuilding: null,
            isSelectingLocation: false,
            selectionMarker: null,
            likedCompliments: new Set()
        };

        this.mobileMenuOpen = false;
        this.elements = {};
        this.API_BASE = '/api';
        this.init();
    }

    async init() {
        try {
            this.initializeElements();
            this.loadTheme();
            await this.loadData();
            this.initializeMap();
            this.setupEventListeners();
            this.setupOrientationHandling();
            this.renderUI();
            this.showToast('Click "Drop a Pin" to share a compliment anywhere on campus!', 'info');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to load application', 'error');
        }
    }

    initializeElements() {
        this.elements = {
            app: document.getElementById('app'),
            
            // Mobile Elements
            mobileMenuBtn: document.getElementById('mobileMenuBtn'),
            sidebar: document.getElementById('sidebar'),
            mobileDropPinBtn: document.getElementById('mobileDropPinBtn'),
            
            // Navigation
            navItems: document.querySelectorAll('.nav-item'),
            tabSections: document.querySelectorAll('[data-tab]'),
            
            // Feed
            complimentsContainer: document.getElementById('complimentsContainer'),
            refreshFeed: document.getElementById('refreshFeed'),
            
            // Stats
            totalCompliments: document.getElementById('totalCompliments'),
            activeLocations: document.getElementById('activeLocations'),
            mapTotalCompliments: document.getElementById('mapTotalCompliments'),
            mapTodayCompliments: document.getElementById('mapTodayCompliments'),
            
            // Controls
            locateBtn: document.getElementById('locateBtn'),
            themeToggle: document.getElementById('themeToggle'),
            dropPinBtn: document.getElementById('dropPinBtn'),
            
            // Search
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            
            // Map
            map: document.getElementById('map'),
            
            // Compliment Modal
            complimentModal: document.getElementById('complimentModal'),
            modalBuildingName: document.getElementById('modalBuildingName'),
            modalBuildingAddress: document.getElementById('modalBuildingAddress'),
            modalBuildingCode: document.getElementById('modalBuildingCode'),
            closeModal: document.getElementById('closeModal'),
            complimentText: document.getElementById('complimentText'),
            charCount: document.getElementById('charCount'),
            submitCompliment: document.getElementById('submitCompliment'),
            cancelCompliment: document.getElementById('cancelCompliment'),

            // Feedback
            feedbackText: document.getElementById('feedbackText'),
            feedbackEmail: document.getElementById('feedbackEmail'),
            feedbackCharCount: document.getElementById('feedbackCharCount'),
            submitFeedback: document.getElementById('submitFeedback')
        };

        // Create toast container
        this.elements.toastContainer = document.getElementById('toastContainer');
        if (!this.elements.toastContainer) {
            this.elements.toastContainer = document.createElement('div');
            this.elements.toastContainer.id = 'toastContainer';
            this.elements.toastContainer.className = 'toast-container';
            document.body.appendChild(this.elements.toastContainer);
        }
    }

    async loadData() {
        try {
            // Load UIUC buildings from data.json
            const response = await fetch('data.json');
            if (response.ok) {
                const data = await response.json();
                this.state.uiucBuildings = data.buildings || [];
                console.log('Loaded UIUC buildings:', this.state.uiucBuildings.length);
            } else {
                console.error('Failed to load data.json');
                this.state.uiucBuildings = [];
            }

            // Load compliments from API or localStorage
            await this.loadCompliments();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.state.uiucBuildings = [];
            this.showToast('Error loading data', 'error');
        }
    }

    async loadCompliments() {
        try {
            console.log('Loading compliments from API...');
            const response = await fetch(`${this.API_BASE}/compliments`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.state.compliments = data.compliments || [];
            console.log('✅ Loaded compliments from API:', this.state.compliments.length);
            
        } catch (error) {
            console.error('❌ Failed to load from API:', error.message);
            // Fallback to localStorage
            const savedData = localStorage.getItem('campusComplimentsData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.state.compliments = data.compliments || [];
                this.state.likedCompliments = new Set(data.likedCompliments || []);
                console.log('📁 Loaded compliments from localStorage:', this.state.compliments.length);
            } else {
                this.state.compliments = this.getSampleCompliments();
                console.log('🎭 Loaded sample compliments:', this.state.compliments.length);
            }
            this.showToast('Using offline mode - compliments not shared with others', 'warning');
        }
    }

    getSampleCompliments() {
        const now = new Date();
        return [
            {
                _id: 'sample1',
                buildingCode: '0001',
                buildingName: 'Davenport Hall',
                text: "To the person with the beautiful handwriting in the corner - your script is like artwork on the page.",
                timestamp: new Date(now.getTime() - 3600000).toISOString(),
                likes: 8,
                coordinates: [-88.2253, 40.1057]
            },
            {
                _id: 'sample2',
                buildingCode: '0023',
                buildingName: 'Illini Union',
                text: "Whoever was patiently helping that student with calculus - your kindness was a beautiful thing to witness.",
                timestamp: new Date(now.getTime() - 7200000).toISOString(),
                likes: 15,
                coordinates: [-88.2272, 40.1095]
            },
            {
                _id: 'sample3',
                buildingCode: '0041',
                buildingName: 'Main Library',
                text: "The group sharing stories by the fountain - your laughter was like music floating across the courtyard.",
                timestamp: new Date(now.getTime() - 86400000).toISOString(),
                likes: 23,
                coordinates: [-88.2253, 40.1057]
            }
        ];
    }

    initializeMap() {
        // Use the clean outdoors style - it has great built-in colors for parks and water
        const mapStyle = 'mapbox://styles/mapbox/outdoors-v12';
        
        this.state.map = new mapboxgl.Map({
            container: 'map',
            style: mapStyle,
            center: [-88.2253, 40.1057],
            zoom: 15.5,
            pitch: 0,
            bearing: 0,
            antialias: true,
            attributionControl: false,
            touchZoomRotate: true, // Enable touch interactions
            dragRotate: false, // Disable rotation for better mobile UX
            trackResize: true // Automatically track resize
        });

        // Add minimal navigation control
        this.state.map.addControl(new mapboxgl.NavigationControl({
            showCompass: false,
            showZoom: true
        }), 'top-right');

        this.state.map.on('load', () => {
            this.addBuildingsToMap();
            this.setupMapClickHandler();
            this.updateMapCursor();
        });

        // Handle map errors
        this.state.map.on('error', (e) => {
            console.error('Map error:', e);
            this.showToast('Map loading issue - please refresh', 'error');
        });
    }

    setupMapClickHandler() {
        this.state.map.on('click', async (e) => {
            if (!this.state.isSelectingLocation) return;

            const { lng, lat } = e.lngLat;
            await this.startLocationSelection([lng, lat]);
        });

        // Add touch support for better mobile interaction
        this.state.map.on('touchstart', (e) => {
            if (this.state.isSelectingLocation && e.originalEvent.touches.length === 1) {
                // Prevent default to avoid page scrolling
                e.originalEvent.preventDefault();
                
                const point = e.point;
                const lngLat = this.state.map.unproject(point);
                this.startLocationSelection([lngLat.lng, lngLat.lat]);
            }
        });
    }

    updateMapCursor() {
        const canvas = this.state.map.getCanvas();
        if (this.state.isSelectingLocation) {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'grab';
        }
    }

    startDropPinMode() {
        this.state.isSelectingLocation = !this.state.isSelectingLocation;
        this.updateMapCursor();
        this.updateDropPinButton();
        
        if (this.state.isSelectingLocation) {
            this.showToast('Click anywhere on campus to place a compliment', 'info');
            this.closeMobileMenu(); // Close sidebar on mobile when placing pin
        } else {
            this.showToast('Location selection cancelled', 'info');
            this.clearSelectionMarker();
        }
    }

    updateDropPinButton() {
        const dropPinBtn = this.elements.dropPinBtn;
        const mobileDropPinBtn = this.elements.mobileDropPinBtn;
        
        if (this.state.isSelectingLocation) {
            dropPinBtn.classList.add('active');
            dropPinBtn.innerHTML = 'Cancel Pin Drop';
            mobileDropPinBtn.classList.add('active');
            mobileDropPinBtn.innerHTML = '×';
        } else {
            dropPinBtn.classList.remove('active');
            dropPinBtn.innerHTML = 'Drop a Pin';
            mobileDropPinBtn.classList.remove('active');
            mobileDropPinBtn.innerHTML = '+';
        }
    }

    async startLocationSelection(coordinates) {
        this.state.selectedLocation = coordinates;
        this.showSelectionMarker(coordinates);
        await this.identifyBuildingAtLocation(coordinates);
    }

    showSelectionMarker(coordinates) {
        if (this.state.selectionMarker) {
            this.state.selectionMarker.remove();
        }

        const el = document.createElement('div');
        el.className = 'selection-marker';
        el.innerHTML = '<div class="selection-marker-pin"></div>';

        this.state.selectionMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
            .setLngLat(coordinates)
            .addTo(this.state.map);

        // Center map on selection with mobile-optimized zoom
        this.state.map.flyTo({
            center: coordinates,
            zoom: 17,
            duration: 1000
        });
    }

    async identifyBuildingAtLocation(coordinates) {
        const [lng, lat] = coordinates;

        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            let buildingName = "Selected Location";
            let address = "Address not found";
            let buildingCode = null;

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                address = feature.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                
                const matchedBuilding = this.findBuildingByAddress(feature.place_name);
                
                if (matchedBuilding) {
                    buildingName = matchedBuilding.buildingName;
                    buildingCode = matchedBuilding.buildingCode;
                    address = `${matchedBuilding.address}, ${matchedBuilding.city}, ${matchedBuilding.state} ${matchedBuilding.zipCode}`;
                } else {
                    buildingName = feature.text || feature.properties?.name || "Selected Location";
                }
            }

            this.showComplimentModal(buildingName, address, buildingCode, coordinates);

        } catch (error) {
            console.error("Error identifying building:", error);
            const fallbackName = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            this.showComplimentModal(fallbackName, "Address unavailable", null, coordinates);
        }
    }

    findBuildingByAddress(mapboxAddress) {
        if (!mapboxAddress) return null;

        const searchAddress = this.normalizeText(mapboxAddress);
        console.log('🔍 Searching for building match for:', mapboxAddress);
        
        let bestMatch = null;
        let bestScore = 0;

        for (const building of this.state.uiucBuildings) {
            let score = 0;
            
            // Strategy 1: Direct address matching
            const buildingFullAddress = this.normalizeText(`${building.address} ${building.city} ${building.state} ${building.zipCode}`);
            const buildingStreet = this.normalizeText(building.address);
            const buildingName = this.normalizeText(building.buildingName);
            
            // Strategy 2: Check if Mapbox address contains building street
            if (buildingStreet && searchAddress.includes(buildingStreet)) {
                score += 30;
                console.log(`✅ Street match: ${buildingStreet} in ${building.buildingName}`);
            }
            
            // Strategy 3: Check if Mapbox address contains building name
            if (buildingName && searchAddress.includes(buildingName)) {
                score += 25;
                console.log(`✅ Name match: ${buildingName}`);
            }
            
            // Strategy 4: Check for full address match
            if (buildingFullAddress && searchAddress.includes(buildingFullAddress)) {
                score += 20;
            }
            
            // Strategy 5: Token-based matching - break down into words
            const buildingTokens = new Set([
                ...buildingStreet.split(/\s+/),
                ...buildingName.split(/\s+/)
            ]);
            
            const searchTokens = new Set(searchAddress.split(/\s+/));
            let tokenMatches = 0;
            
            for (const token of buildingTokens) {
                if (token.length > 2 && searchTokens.has(token)) {
                    tokenMatches++;
                }
            }
            
            if (tokenMatches > 0) {
                score += (tokenMatches * 5);
            }
            
            // Strategy 6: Handle common variations and abbreviations
            if (this.checkCommonVariations(building, searchAddress)) {
                score += 15;
            }
            
            // Strategy 7: Check building code if present in address
            if (building.buildingCode && searchAddress.includes(building.buildingCode)) {
                score += 10;
            }
            
            console.log(`🏢 ${building.buildingName} - Score: ${score}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = building;
            }
        }
        
        // Only return if we have a reasonably good match
        if (bestMatch && bestScore >= 10) {
            console.log(`🎯 Best match: ${bestMatch.buildingName} with score ${bestScore}`);
            return bestMatch;
        }
        
        console.log('❌ No good building match found');
        return null;
    }

    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
            .replace(/\s+/g, ' ')     // Collapse multiple spaces
            .trim();
    }

    checkCommonVariations(building, searchAddress) {
        const variations = [];
        const buildingName = this.normalizeText(building.buildingName);
        const buildingStreet = this.normalizeText(building.address);
        
        // Common street variations
        const streetVariations = {
            'n ': 'north ',
            's ': 'south ', 
            'e ': 'east ',
            'w ': 'west ',
            'st ': 'street ',
            'ave ': 'avenue ',
            'av ': 'avenue ',
            'blvd ': 'boulevard ',
            'dr ': 'drive ',
            'ln ': 'lane ',
            'rd ': 'road '
        };
        
        // Check street variations
        let variedStreet = buildingStreet;
        for (const [short, long] of Object.entries(streetVariations)) {
            if (buildingStreet.includes(short)) {
                variedStreet = buildingStreet.replace(short, long);
                if (searchAddress.includes(variedStreet)) {
                    return true;
                }
            }
        }
        
        // Check for building name variations (without "Hall", "Building", etc.)
        const nameWithoutSuffix = buildingName
            .replace(/\b(hall|building|center|centre|lab|laboratory|annex)\b/g, '')
            .trim();
            
        if (nameWithoutSuffix && searchAddress.includes(nameWithoutSuffix)) {
            return true;
        }
        
        return false;
    }

    showComplimentModal(buildingName, address, buildingCode, coordinates) {
        this.elements.modalBuildingName.textContent = buildingName;
        this.elements.modalBuildingAddress.textContent = address;
        this.elements.modalBuildingCode.textContent = buildingCode ? `Building Code: ${buildingCode}` : '';

        this.state.selectedBuilding = {
            buildingName,
            address,
            buildingCode,
            coordinates
        };

        this.elements.complimentText.value = '';
        this.elements.charCount.textContent = '0';
        this.elements.submitCompliment.disabled = true;

        this.elements.complimentModal.classList.remove('hidden');
        
        // Prevent body scroll when modal is open on mobile
        document.body.style.overflow = 'hidden';
    }

    async submitCompliment() {
        const text = this.elements.complimentText.value.trim();
        if (!text || !this.state.selectedBuilding) return;

        const building = this.state.selectedBuilding;
        const buildingCode = building.buildingCode || `custom_${Date.now()}`;

        const newCompliment = {
            buildingCode: buildingCode,
            buildingName: building.buildingName,
            text: text,
            coordinates: building.coordinates
        };

        try {
            console.log('Submitting compliment to API...');
            const response = await fetch(`${this.API_BASE}/compliments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCompliment)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Compliment saved to API:', result);
            
            // Add the new compliment
            this.state.compliments.unshift({
                ...newCompliment,
                _id: result._id,
                timestamp: new Date().toISOString(),
                likes: 0
            });
            
            this.saveData();
            this.renderCompliments();
            this.addBuildingsToMap();
            this.updateStats();
            
            this.hideComplimentModal();
            this.clearSelectionMarker();
            this.state.isSelectingLocation = false;
            this.updateDropPinButton();
            this.updateMapCursor();
            
            this.showToast('Compliment shared with the community!', 'success');

        } catch (error) {
            console.error('❌ Error submitting compliment:', error.message);
            // Fallback to localStorage
            this.state.compliments.unshift({
                ...newCompliment,
                _id: 'local_' + Date.now(),
                timestamp: new Date().toISOString(),
                likes: 0
            });
            this.saveData();
            this.renderCompliments();
            this.addBuildingsToMap();
            this.updateStats();
            this.hideComplimentModal();
            this.clearSelectionMarker();
            this.state.isSelectingLocation = false;
            this.updateDropPinButton();
            this.updateMapCursor();
            this.showToast('Compliment saved locally (offline mode)', 'warning');
        }
    }

    cancelCompliment() {
        this.hideComplimentModal();
        this.clearSelectionMarker();
        this.state.isSelectingLocation = false;
        this.updateDropPinButton();
        this.updateMapCursor();
        this.showToast('Compliment cancelled', 'info');
    }

    hideComplimentModal() {
        this.elements.complimentModal.classList.add('hidden');
        // Restore body scroll
        document.body.style.overflow = '';
    }

    clearSelectionMarker() {
        if (this.state.selectionMarker) {
            this.state.selectionMarker.remove();
            this.state.selectionMarker = null;
        }
    }

    setupEventListeners() {
        // Mobile Menu
        this.elements.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        this.elements.mobileDropPinBtn.addEventListener('click', () => this.startDropPinMode());

        // Navigation
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Drop Pin Button
        this.elements.dropPinBtn.addEventListener('click', () => this.startDropPinMode());

        // Compliment Modal
        this.elements.closeModal.addEventListener('click', () => this.cancelCompliment());
        this.elements.submitCompliment.addEventListener('click', () => this.submitCompliment());
        this.elements.cancelCompliment.addEventListener('click', () => this.cancelCompliment());
        this.elements.complimentText.addEventListener('input', (e) => {
            const length = e.target.value.length;
            this.elements.charCount.textContent = length;
            this.elements.submitCompliment.disabled = length === 0;
        });

        // Feed
        this.elements.refreshFeed.addEventListener('click', () => this.refreshFeed());

        // Controls
        this.elements.locateBtn.addEventListener('click', () => this.locateUser());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Search
        this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.elements.clearSearch.addEventListener('click', () => this.clearSearch());

        // Feedback
        this.elements.feedbackText.addEventListener('input', (e) => {
            const length = e.target.value.length;
            this.elements.feedbackCharCount.textContent = length;
        });
        this.elements.submitFeedback.addEventListener('click', () => this.submitFeedback());

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.mobileMenuOpen && 
                !this.elements.sidebar.contains(e.target) && 
                !this.elements.mobileMenuBtn.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.mobileMenuOpen) {
                    this.closeMobileMenu();
                }
                if (!this.elements.complimentModal.classList.contains('hidden')) {
                    this.cancelCompliment();
                }
            }
        });
    }

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        this.elements.sidebar.classList.toggle('active', this.mobileMenuOpen);
        this.elements.mobileMenuBtn.classList.toggle('active', this.mobileMenuOpen);
        
        // Close menu when clicking on a nav item
        if (this.mobileMenuOpen) {
            this.elements.navItems.forEach(item => {
                item.addEventListener('click', () => this.closeMobileMenu(), { once: true });
            });
        }
    }

    closeMobileMenu() {
        this.mobileMenuOpen = false;
        this.elements.sidebar.classList.remove('active');
        this.elements.mobileMenuBtn.classList.remove('active');
    }

    setupOrientationHandling() {
        // Handle orientation changes
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        window.addEventListener('resize', () => this.handleOrientationChange());
    }

    handleOrientationChange() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            if (this.state.map) {
                this.state.map.resize();
                this.showToast('Map adjusted for screen size', 'info', 2000);
            }
        }, 250);
    }

    async submitFeedback() {
        const text = this.elements.feedbackText.value.trim();
        const email = this.elements.feedbackEmail.value.trim();
        
        if (!text) {
            this.showToast('Please enter your feedback', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    email,
                    userAgent: navigator.userAgent
                })
            });

            if (response.ok) {
                this.elements.feedbackText.value = '';
                this.elements.feedbackEmail.value = '';
                this.elements.feedbackCharCount.textContent = '0';
                this.showToast('Thank you for your feedback!', 'success');
                this.closeMobileMenu();
            } else {
                throw new Error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Feedback submission error:', error);
            this.showToast('Failed to submit feedback', 'error');
        }
    }

    switchTab(tabName) {
        this.elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        this.elements.tabSections.forEach(section => {
            section.classList.toggle('active', section.dataset.tab === tabName);
        });

        this.state.currentTab = tabName;

        if (tabName === 'feed') {
            this.renderCompliments();
        } else if (tabName === 'map') {
            setTimeout(() => {
                if (this.state.map) {
                    this.state.map.resize();
                }
            }, 100);
        }

        // Close mobile menu after switching tabs
        if (this.mobileMenuOpen) {
            this.closeMobileMenu();
        }
    }

    locateUser() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation not supported', 'error');
            return;
        }

        this.showToast('Finding your location...', 'info');

        // Mobile-specific geolocation options
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.state.userLocation = [longitude, latitude];
                
                if (this.state.userMarker) {
                    this.state.userMarker.remove();
                }
                
                const userMarkerEl = document.createElement('div');
                userMarkerEl.className = 'user-marker';
                userMarkerEl.innerHTML = '<div class="user-marker-pin"></div>';
                
                this.state.userMarker = new mapboxgl.Marker({
                    element: userMarkerEl,
                    anchor: 'bottom'
                })
                    .setLngLat(this.state.userLocation)
                    .addTo(this.state.map);
                
                this.state.map.flyTo({
                    center: this.state.userLocation,
                    zoom: 16,
                    duration: 1500
                });
                this.showToast('Location found', 'success');
                this.closeMobileMenu();
            },
            (error) => {
                let errorMessage = 'Unable to find location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                this.showToast(errorMessage, 'error');
            },
            options
        );
    }

    toggleTheme() {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        localStorage.setItem('campusComplimentsTheme', this.state.theme);
        this.showToast(`${this.state.theme === 'dark' ? 'Dark' : 'Light'} theme activated`, 'info');
    }

    renderUI() {
        this.renderCompliments();
        this.updateStats();
    }

    renderCompliments() {
        const container = this.elements.complimentsContainer;
        let complimentsToShow = [...this.state.compliments];

        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            complimentsToShow = complimentsToShow.filter(comp => 
                comp.text.toLowerCase().includes(query) ||
                comp.buildingName.toLowerCase().includes(query)
            );
        }

        complimentsToShow.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (complimentsToShow.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = complimentsToShow.map(comp => this.renderComplimentCard(comp)).join('');
    }

    renderComplimentCard(compliment) {
        const isLiked = this.state.likedCompliments.has(compliment._id);
        return `
            <div class="compliment-card">
                <div class="compliment-header">
                    <div class="compliment-location">${compliment.buildingName}</div>
                    <div class="compliment-time">${this.timeAgo(new Date(compliment.timestamp))}</div>
                </div>
                <div class="compliment-text">${compliment.text}</div>
                <div class="compliment-actions">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="app.likeCompliment('${compliment._id}')">
                        Appreciate • ${compliment.likes || 0}
                    </button>
                </div>
            </div>
        `;
    }

    async likeCompliment(complimentId) {
        const compliment = this.state.compliments.find(c => c._id === complimentId);
        if (!compliment) return;

        const isLiked = this.state.likedCompliments.has(complimentId);
        
        // Toggle like state
        if (isLiked) {
            // Unlike
            compliment.likes = Math.max(0, (compliment.likes || 0) - 1);
            this.state.likedCompliments.delete(complimentId);
        } else {
            // Like
            compliment.likes = (compliment.likes || 0) + 1;
            this.state.likedCompliments.add(complimentId);
        }

        // Update UI immediately
        this.renderCompliments();
        this.refreshMapPopups();
        
        // Save to localStorage
        this.saveData();
        
        // Show feedback
        this.showToast(isLiked ? 'Appreciation removed' : 'Appreciation sent!', 'success');

        // If it's not a local compliment, sync with API
        if (!complimentId.startsWith('local_')) {
            try {
                const response = await fetch(`${this.API_BASE}/compliments/${complimentId}/like`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ like: !isLiked }) // Send like/unlike state
                });

                if (!response.ok) {
                    throw new Error('Failed to update like');
                }
            } catch (error) {
                console.error('Error updating like:', error);
                this.showToast('Failed to sync appreciation', 'error');
            }
        }
    }

    refreshFeed() {
        this.loadCompliments().then(() => {
            this.renderCompliments();
            this.showToast('Feed refreshed', 'success');
        });
    }

    handleSearch(query) {
        this.state.searchQuery = query;
        this.elements.clearSearch.classList.toggle('visible', query.length > 0);
        this.renderCompliments();
    }

    clearSearch() {
        this.state.searchQuery = '';
        this.elements.searchInput.value = '';
        this.elements.clearSearch.classList.remove('visible');
        this.renderCompliments();
    }

    addBuildingsToMap() {
        this.state.markers.forEach(marker => marker.remove());
        this.state.markers = [];

        const buildingCompliments = {};
        this.state.compliments.forEach(comp => {
            if (!buildingCompliments[comp.buildingCode]) {
                buildingCompliments[comp.buildingCode] = [];
            }
            buildingCompliments[comp.buildingCode].push(comp);
        });

        Object.entries(buildingCompliments).forEach(([buildingCode, compliments]) => {
            const comp = compliments[0];
            if (!comp.coordinates) return;

            const el = this.createCustomMarker(compliments.length);
            const popupContent = this.createPopupContent(comp.buildingName, compliments);

            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom'
            })
                .setLngLat(comp.coordinates)
                .setPopup(new mapboxgl.Popup({ 
                    offset: 25,
                    className: 'vintage-popup',
                    maxWidth: '400px',
                    closeOnClick: false // Better for mobile
                }).setHTML(popupContent))
                .addTo(this.state.map);

            marker.buildingCode = buildingCode;
            this.state.markers.push(marker);
        });
    }

    createCustomMarker(complimentCount) {
        const el = document.createElement('div');
        el.className = 'marker';
        el.innerHTML = `
            <div class="marker-pin">
                <div class="marker-count">${complimentCount}</div>
            </div>
        `;
        return el;
    }

    createPopupContent(buildingName, compliments) {
        const totalCompliments = compliments.length;
        const latestCompliments = compliments.slice(0, 3);

        return `
            <div class="popup-content">
                <div class="popup-header">
                    <h4>${buildingName}</h4>
                    <div class="popup-count-badge">${totalCompliments}</div>
                </div>
                <div class="popup-compliments">
                    ${latestCompliments.map(compliment => {
                        const isLiked = this.state.likedCompliments.has(compliment._id);
                        return `
                        <div class="popup-compliment" data-compliment-id="${compliment._id}">
                            <div class="popup-compliment-text">"${this.truncateText(compliment.text, 120)}"</div>
                            <div class="popup-compliment-meta">
                                <span class="popup-time">${this.timeAgo(new Date(compliment.timestamp))}</span>
                                <button class="popup-like-btn ${isLiked ? 'liked' : ''}" onclick="app.likeCompliment('${compliment._id}')">
                                    Appreciate • ${compliment.likes || 0}
                                </button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                ${totalCompliments > 3 ? `
                    <div class="popup-footer">
                        <span class="popup-more">+${totalCompliments - 3} more compliments</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    refreshMapPopups() {
        this.state.markers.forEach(marker => {
            const popup = marker.getPopup();
            if (popup && popup.isOpen()) {
                const buildingCompliments = this.state.compliments.filter(
                    comp => comp.buildingCode === marker.buildingCode
                );
                const popupContent = this.createPopupContent(
                    buildingCompliments[0]?.buildingName || 'Location',
                    buildingCompliments
                );
                
                // Store current popup state
                const wasOpen = popup.isOpen();
                
                // Create new popup
                const newPopup = new mapboxgl.Popup({ 
                    offset: 25,
                    className: 'vintage-popup',
                    maxWidth: '400px',
                    closeOnClick: false
                }).setHTML(popupContent);
                
                marker.setPopup(newPopup);
                
                // Reopen if it was open
                if (wasOpen) {
                    marker.togglePopup();
                }
            }
        });
    }

    updateStats() {
        const totalCompliments = this.state.compliments.length;
        const activeLocations = new Set(this.state.compliments.map(c => c.buildingCode)).size;
        const today = new Date().toDateString();
        const todayCompliments = this.state.compliments.filter(comp => {
            return new Date(comp.timestamp).toDateString() === today;
        }).length;

        this.elements.totalCompliments.textContent = totalCompliments;
        this.elements.activeLocations.textContent = activeLocations;
        this.elements.mapTotalCompliments.textContent = totalCompliments;
        this.elements.mapTodayCompliments.textContent = todayCompliments;
    }

    getEmptyStateHTML() {
        if (this.state.searchQuery) {
            return `
                <div class="empty-state">
                    <h3>No matches found</h3>
                    <p>Try different search terms</p>
                </div>
            `;
        }

        return `
            <div class="empty-state">
                <h3>No compliments yet</h3>
                <p>Be the first to spread some positivity across campus</p>
            </div>
        `;
    }

    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    truncateText(text, maxLength) {
        return text.length <= maxLength ? text : text.substring(0, maxLength - 3) + '...';
    }

    showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    saveData() {
        const data = {
            compliments: this.state.compliments,
            likedCompliments: Array.from(this.state.likedCompliments),
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('campusComplimentsData', JSON.stringify(data));
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('campusComplimentsTheme');
        this.state.theme = savedTheme || 'light';
        document.documentElement.setAttribute('data-theme', this.state.theme);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new CampusCompliments();
    window.app = app; // Make app globally available for onclick handlers
});

// Handle page visibility changes for better mobile performance
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.app && window.app.state.map) {
        // Refresh map when returning to the app
        setTimeout(() => {
            window.app.state.map.resize();
        }, 100);
    }
});