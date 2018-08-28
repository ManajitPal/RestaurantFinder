let neighborhoods, cuisines, newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
	let staticMap = document.getElementById('static_map');
	staticMap.src = 'http://maps.googleapis.com/maps/api/staticmap?center=40.722216,-73.987501&zoom=13&size=800x800&format=jpg&markers=color:red%7Clabel:S%7Canchor:40.722216,-73.987501&key=AIzaSyC5uBPdVLx3QviAtBgxaRLqWjT0WKwTliU';
	fetchNeighborhoods();
	fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
	DBHelper.fetchNeighborhoods((error, neighborhoods) => {
		if (error) { // Got an error
			console.error(error);
		} else {
			self.neighborhoods = neighborhoods;
			fillNeighborhoodsHTML();
		}
	});
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
	const select = document.getElementById('neighborhoods-select');
	neighborhoods.forEach(neighborhood => {
		const option = document.createElement('option');
		option.innerHTML = neighborhood;
		option.value = neighborhood;
		select.append(option);
	});
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
	DBHelper.fetchCuisines((error, cuisines) => {
		if (error) { // Got an error!
			console.error(error);
		} else {
			self.cuisines = cuisines;
			fillCuisinesHTML();
		}
	});
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
	const select = document.getElementById('cuisines-select');

	cuisines.forEach(cuisine => {
		const option = document.createElement('option');
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
};

/**
 * Initialize google map, called from HTML.
 */

window.initMap = () => {
	let loc = {
		lat: 40.722216,
		lng: -73.987501
	};
	self.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 12,
		center: loc,
		scrollwheel: false
	});
	google.maps.event.addDomListener(window, 'resize', function () {
		map.setCenter(loc);
	});
	updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
	const cSelect = document.getElementById('cuisines-select');
	const nSelect = document.getElementById('neighborhoods-select');

	const cIndex = cSelect.selectedIndex;
	const nIndex = nSelect.selectedIndex;

	const cuisine = cSelect[cIndex].value;
	const neighborhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
		if (error) { // Got an error!
			console.error(error);
		} else {
			resetRestaurants(restaurants);
			fillRestaurantsHTML();
		}
	});
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
	// Remove all restaurants
	self.restaurants = [];
	const ul = document.getElementById('restaurants-list');
	ul.innerHTML = '';

	// Remove all map markers
	if (self.markers) {
		self.markers.forEach(marker => marker.setMap(null));
	}
	self.markers = [];
	self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
	const ul = document.getElementById('restaurants-list');
	if(restaurants.length == 0) {
		const error = document.createElement('p');
		error.innerHTML = 'No restaurant found. Sorry! :(';
		ul.append(error);
		return;
	}
	restaurants.forEach(restaurant => {
		ul.append(createRestaurantHTML(restaurant));
	});
	addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
	const li = document.createElement('li');

	const image = document.createElement('img');
	image.className = 'restaurant-img lazy';
	image.alt = `Image for ${restaurant.name}`;
	if(restaurant.photograph) {
		image.src = 'data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
		image.setAttribute('data-src',`${DBHelper.imageUrlForRestaurant(restaurant)}`);
	}
	else {
		image.src = '/dist/img/undefined.jpg';
	}
	li.append(image);

	const name = document.createElement('h1');
	name.innerHTML = restaurant.name;
	li.append(name);

	const neighborhood = document.createElement('p');
	neighborhood.innerHTML = restaurant.neighborhood;
	li.append(neighborhood);

	const address = document.createElement('p');
	address.innerHTML = restaurant.address;
	li.append(address);

	const lastLineContainer = document.createElement('div');
	lastLineContainer.className = 'restaurant-last-line';

	restaurant.is_favorite = ((restaurant.is_favorite == "true") || restaurant.is_favorite == true);

	const favoriteButton = document.createElement('button');
	favoriteButton.className = 'favorite-button';
	favoriteButton.style.backgroundColor = 'transparent';
	if(restaurant.is_favorite) {
		favoriteButton.setAttribute('aria-label', `Remove ${restaurant.name} from favorites`);
		favoriteButton.style.backgroundImage = `url(${DBHelper.favoriteSVG()})`;
	}
	else {
		favoriteButton.setAttribute('aria-label', `Add ${restaurant.name} to favorites`);
		favoriteButton.style.backgroundImage = `url(${DBHelper.notFavoriteSVG()})`;
	}
	favoriteButton.onclick = () => {
		restaurant.is_favorite = !restaurant.is_favorite;
		DBHelper.toggleFavorite(restaurant.id, restaurant.is_favorite, (data) => {
			DBHelper.updateFavorite(favoriteButton, restaurant);
		});
	}
	lastLineContainer.append(favoriteButton);

	const more = document.createElement('a');
	more.innerHTML = 'View Details';
	more.setAttribute('aria-label', 'View Details for ' + restaurant.name);
	more.href = DBHelper.urlForRestaurant(restaurant);
	lastLineContainer.append(more);

	li.append(lastLineContainer);
	var lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));

	if ("IntersectionObserver" in window && "IntersectionObserverEntry" in window && "intersectionRatio" in window.IntersectionObserverEntry.prototype) {
	  let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
		entries.forEach(function(entry) {
		  if (entry.isIntersecting) {
			let lazyImage = entry.target;
			lazyImage.src = lazyImage.dataset.src;
			// lazyImage.srcset = lazyImage.dataset.srcset;
			lazyImage.classList.remove('lazy');
			lazyImageObserver.unobserve(lazyImage);
		  }
		});
	  });
  
	  lazyImages.forEach(function(lazyImage) {
		lazyImageObserver.observe(lazyImage);
	  });
	}

	return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
	restaurants.forEach(restaurant => {
		// Add marker to the map
		const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
		google.maps.event.addListener(marker, 'click', () => {
			window.location.href = marker.url;
		});
		self.markers.push(marker);
	});
};

const swap_map = () => {    
	if (document.getElementById('map').style.display === 'none')      
	{        
	document.getElementById('map').style.display = 'block' ;       document.getElementById('static_map').style.display = 'none'  ;    
	}    
}



