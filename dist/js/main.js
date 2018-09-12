let neighborhoods, cuisines, newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
	DBHelper.openIndexDB();
	window.addEventListener('online', checkOfflineData);
    window.addEventListener('offline', offlineStatus);
	fetchNeighborhoods();
	fetchCuisines();
	if(neighborhoods && cuisines) {
		updateRestaurants();
	}
	else {
		updateRestaurants();
	}
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
	console.log("Maps!");
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
	addMarkersToMap();
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
			addMarkersToMap();
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

	let lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));
	if ('IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype) {
	  let lazyImageObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach((entry) => {
		  if (entry.isIntersecting) {
			let lazyImage = entry.target;
			lazyImage.src = lazyImage.dataset.src;
			lazyImage.classList.remove('lazy');

			lazyImageObserver.unobserve(lazyImage);
		  }
		});
	  });
  
	  lazyImages.forEach((lazyImage) => {
		lazyImageObserver.observe(lazyImage);
	  });
	}
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
	const li = document.createElement('li');

	const image = document.createElement('img');
	image.className = 'restaurant-img lazy';
	image.alt = `Image for ${restaurant.name}`;
	image.src = 'data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
	image.setAttribute('data-src',`${DBHelper.imageUrlForRestaurant(restaurant)}`);
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
		DBHelper.toggleFavorite(restaurant);
		DBHelper.updateFavorite(favoriteButton, restaurant);
	}
	lastLineContainer.append(favoriteButton);

	const more = document.createElement('a');
	more.innerHTML = 'View Details';
	more.setAttribute('aria-label', 'View Details for ' + restaurant.name);
	more.href = DBHelper.urlForRestaurant(restaurant);
	lastLineContainer.append(more);

	li.append(lastLineContainer);

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

const toggleMap = () => {    
	if (document.getElementById('map-container').style.display === 'none') {        document.getElementById('mapBtn').innerHTML = 'HIDE MAP';
		document.getElementById('map-container').style.display = 'block';
	}
	else {
		document.getElementById('mapBtn').innerHTML = 'SHOW MAP';
		document.getElementById('map-container').style.display = 'none';
	}    
}

const checkOfflineData = () => {
	checkOfflineReviews();
	checkOfflineFavorites();
	location.reload();
}

const checkOfflineReviews = () => {
	DBHelper.getOfflinePosts((reviews) => {
		if(!reviews) console.log("No offline reviews to post");
		else {
			reviews.forEach(review => {
				DBHelper.postReview(review, (response) => {
					console.log('Offline review sent to server!')
				});
			})
		DBHelper.deleteOfflinePosts();
		}
	})
}

const checkOfflineFavorites = () => {
	DBHelper.getOfflineFavorites((favorites) => {
		if(!favorites) console.log("No offline reviews to post");
		else {
			favorites.forEach(favorite => {
				DBHelper.toggleFavorite(favorite);
			})
		}
	})
	DBHelper.deleteOfflineFavorites();
}

const offlineStatus = () => {
	if(navigator.onLine === false)
		showAlert('Internet connection is lost');
}

/*
 * show alert message
 */
const showAlert = (msg) => {
    const alertBox = document.getElementById('alert');
    alertBox.getElementsByClassName('msg')[0].innerText = msg;
    alertBox.style.display = "inline-block";
    setTimeout(() => { closeAlert(); }, 5000);
}


/*
 * close alert message; 
 */
const closeAlert = () => {
    const alertBox = document.getElementById('alert');
    alertBox.getElementsByClassName('msg')[0].innerText = "";
    alertBox.style.display = "none";
}


