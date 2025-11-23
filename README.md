# Campus Crush Map 💕

An anonymous platform for sharing compliments tied to campus locations using Mapbox.

## Setup Instructions

### 1. Get Mapbox Access Token
1. Go to [Mapbox.com](https://www.mapbox.com/) and create a free account
2. Navigate to your Account page
3. Copy your "Default public token"
4. Replace `YOUR_MAPBOX_ACCESS_TOKEN_HERE` in `script.js` with your actual token

### 2. Run the Application

**Option A: Simple Local Server**
1. Place all files in a folder
2. Open terminal/command prompt in that folder
3. Run one of these commands:
   - Python 3: `python -m http.server 8000`
   - Python 2: `python -m SimpleHTTPServer 8000`
   - Node.js: `npx http-server`
   - PHP: `php -S localhost:8000`

4. Open browser and go to `http://localhost:8000`

**Option B: Direct File Opening**
- Simply open `index.html` in a web browser (some features might not work due to CORS)

### 3. Customize for Your Campus

Edit `data.js` to add your campus buildings:

```javascript
const campusBuildings = [
    {
        id: 'your_building_id',
        name: 'Building Name',
        coordinates: [longitude, latitude], // Get from Google Maps
        description: 'Building description'
    }
    // Add more buildings...
];