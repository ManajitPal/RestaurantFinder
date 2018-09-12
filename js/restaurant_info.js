var restaurant;
var newMap;


document.addEventListener('DOMContentLoaded', (event) => {
	DBHelper.openIndexDB();
	window.addEventListener('online', checkOfflineData);
    window.addEventListener('offline', offlineStatus);
});
/**
 * Initialize map as soon as the page is loaded.
 */

window.initMap = () => {
	fetchRestaurantFromURL((error, restaurant) => {
		let loc = restaurant.latlng;
		if (error) { // Got an error!
			console.error(error);
		} else {
			self.map = new google.maps.Map(document.getElementById('map'), {
				zoom: 16,
				center: restaurant.latlng,
				scrollwheel: false
			});
			google.maps.event.addDomListener(window, 'resize', () => {
				map.setCenter(loc);
			});
			fillBreadcrumb();
			DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
		}
	});
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
	if (self.restaurant) { // restaurant already fetched!
		callback(null, self.restaurant);
		return;
	}
	const id = getParameterByName('id');
	if (!id) { // no id found in URL
		error = 'No restaurant id in URL';
		callback(error, null);
	} else {
		DBHelper.fetchRestaurantById(id, (error, restaurant) => {
			self.restaurant = restaurant;
			if (!restaurant) {
				console.error(error);
				return;
			}
			fillRestaurantHTML();

			callback(null, restaurant);
		});
	}
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
	const name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	restaurant.is_favorite = ((restaurant.is_favorite == "true") || restaurant.is_favorite == true);
	
	const favoriteButton = document.getElementById('favorite-button');
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

	const address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;

	const image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img';
	image.alt = 'Image for ' + restaurant.name;
	image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}`;

	const cuisine = document.getElementById('restaurant-cuisine');
	cuisine.innerHTML = restaurant.cuisine_type;

	// fill operating hours
	if (restaurant.operating_hours) {
		fillRestaurantHoursHTML();
	}
	// fill reviews
	fillReviewsHTML();
};

const checkOfflineData = () => {
	checkOfflineReviews();

	checkOfflineFavorites();
}

const checkOfflineReviews = () => {
	DBHelper.getOfflinePosts((reviews) => {
		if(!reviews) console.log("No offline reviews to post");
		else {
			reviews.forEach(review => {
				const reviewData = {
					'restaurant_id': review.restaurant_id,
					'name': review.name,
					'rating': review.rating,
					'comments': review.comments
				}
				DBHelper.postReview(reviewData);
				console.log('Offline review sent to server!');
			});
		}
	})
	DBHelper.deleteOfflinePosts();
	location.reload();
}

const checkOfflineFavorites = () => {
	DBHelper.getOfflineFavorites((favorites) => {
		if(!favorites) console.log("No offline reviews to post");
		else {
			favorites.forEach(favorite => {
				DBHelper.toggleFavorite(favorite);
			})
		DBHelper.deleteOfflineFavorites();
		}
	})
}
/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
	const hours = document.getElementById('restaurant-hours');
	for (let key in operatingHours) {
		const row = document.createElement('tr');

		const day = document.createElement('td');
		day.innerHTML = key;
		row.appendChild(day);

		const time = document.createElement('td');
		time.innerHTML = operatingHours[key];
		row.appendChild(time);

		hours.appendChild(row);
	}
};

/**
 * Create all reviews HTML and add them to the webpage.
 */

fillReviewsHTML = (id = self.restaurant.id) => {
	const container = document.getElementById('reviews-container');
	const title = document.createElement('h2');
	title.innerHTML = 'Reviews';
	container.appendChild(title);
	DBHelper.fetchReviewByRestaurantId(id, (reviews) => {
		if (!reviews) {
			const noReviews = document.createElement('p');
			noReviews.innerHTML = 'No reviews yet!';
			container.appendChild(noReviews);
			return;
		}
		const ul = document.getElementById('reviews-list');
		reviews.forEach(review => {
			ul.appendChild(createReviewHTML(review));
		});
		container.appendChild(ul);
	});

};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
	const li = document.createElement('li');
	const name = document.createElement('p');
	name.innerHTML = review.name;
	li.appendChild(name);

	// const date = document.createElement('p');
	// date.innerHTML = review.updatedAt;
	// li.appendChild(date);

	const rating = document.createElement('p');
	rating.innerHTML = `Rating: ${review.rating}`;
	li.appendChild(rating);

	const comments = document.createElement('p');
	comments.innerHTML = review.comments;
	li.appendChild(comments);

	return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
	const breadcrumb = document.getElementById('breadcrumb');
	const li = document.createElement('li');
	li.innerHTML = restaurant.name;
	breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
	if (!url)
		url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
		results = regex.exec(url);
	if (!results)
		return null;
	if (!results[2])
		return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Form.
 */
sendForm = () => {
	event.preventDefault();
	const review = validateForm();
	if(review) {
		DBHelper.postReview(review);
		location.reload();
		showAlert('Review Added Successfully!');
	}
}

validateForm = () => {
	const name = document.getElementById('name');
	if(name.value === "") {
		showAlert('Please enter your name');
		name.setAttribute('aria-invalid', true);
		name.focus();
		return;
	} else {
		name.setAttribute('aria-invalid', false);
	}

	const e = document.getElementById('rating');
	const rating = e.options[e.selectedIndex].value;
	const comment = document.getElementById('comments');
	if(comment.value === "") {
		showAlert('Please enter your review');
		comment.setAttribute('aria-invalid', true);
		comment.focus();
		return;
	} else {
		comment.setAttribute('aria-invalid', false);
	}

	const reviewData = {
		'restaurant_id': restaurant.id,
		'name': name.value,
		'rating': rating,
		'comments': comment.value
	}

	return reviewData;

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

const toggleMap = () => {    
	if (document.getElementById('map-container').style.display === 'none') {        document.getElementById('mapBtn').innerHTML = 'HIDE MAP';
		document.getElementById('map-container').style.display = 'block';
		document.getElementById('restaurant-container').classList.remove('noMap');    
	}
	else {
		document.getElementById('mapBtn').innerHTML = 'SHOW MAP';
		document.getElementById('map-container').style.display = 'none';
		document.getElementById('restaurant-container').classList.add('noMap');
	}    
}
