const RESTAURANT_DB = 'restaurant_finder';
const RESTAURANT_OS = 'restaurants';
const REVIEW_OS = 'reviews';
const OFFLINE_REVIEW_OS = 'offline_reviews';
const OFFLINE_FAVORITE_OS = 'offline_favorite';
let dbPromise;

/**
 * Common database helper functions.
 */
class DBHelper {

	/**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
	static get DATABASE_URL() {
		const port = 1337; // Change this to your server port
		return `http://localhost:${port}`;
	}

  static openIndexDB() {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }
      dbPromise = idb.open(RESTAURANT_DB, 1, (upgradeDb) => {
      console.log('making a new object store');
      if (!upgradeDb.objectStoreNames.contains(RESTAURANT_OS)) {
        upgradeDb.createObjectStore(RESTAURANT_OS, {
          keyPath: 'id'
        });
      }
      if (!upgradeDb.objectStoreNames.contains(REVIEW_OS)) {
        upgradeDb.createObjectStore(REVIEW_OS, {
          keyPath: 'id'
        });
      }
      if (!upgradeDb.objectStoreNames.contains(OFFLINE_REVIEW_OS)) {
        upgradeDb.createObjectStore(OFFLINE_REVIEW_OS, {
          keyPath: 'id',
          autoIncrement: true
        });
      }
      if (!upgradeDb.objectStoreNames.contains(OFFLINE_FAVORITE_OS)) {
        upgradeDb.createObjectStore(OFFLINE_FAVORITE_OS, {
          keyPath: 'id'
        });
      }
    });
  }

  static storeInIndexDB(oSName, data) {
    dbPromise.then((db) => {
      if(!db) return;
      let tx = db.transaction(oSName, 'readwrite');
      let store = tx.objectStore(oSName);
      data.forEach((item) => {
        store.put(item);
      })
      return tx.complete;
    }).then(() => {
      console.log('Data Added to IDB');
    });
  }
  
	/**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    if(navigator.onLine === false) {
      dbPromise.then((db) => {
        if(!db) return;
        let restaurantIndex = db.transaction(RESTAURANT_OS).objectStore(RESTAURANT_OS);
        return restaurantIndex.getAll().then((restaurants) => {
          callback(null, restaurants);
        })
      })
    }

    else {
      return fetch(`${this.DATABASE_URL}/restaurants`, {method: 'GET'}).then(response => response.json()).then(data => {
        DBHelper.storeInIndexDB(RESTAURANT_OS, data);
        callback(null, data);
      });
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  static fetchReviews(id, callback) {

    if(navigator.onLine === false) {
      dbPromise.then((db) => {
        if(!db) return;
        let reviewIndex = db.transaction(REVIEW_OS).objectStore(REVIEW_OS);
        return reviewIndex.getAll().then((reviews) => {
          DBHelper.getOfflinePosts((offlineReviews) => {
            if(offlineReviews) {
              callback(reviews.concat(offlineReviews));
            }
            else {
              callback(reviews);
            }
          })      
        })
      })
    }
    else {
      return fetch(`${this.DATABASE_URL}/reviews/?restaurant_id=${id}`, {method: 'GET'}).then(response => response.json()).then(data => {
        DBHelper.storeInIndexDB(REVIEW_OS, data);
        callback(data);
      });
    }
  }

  static fetchReviewByRestaurantId(id, callback) {
    DBHelper.fetchReviews(id, (reviews) => {
      const finalReviews = reviews.filter(r => r.restaurant_id == id)
      callback(finalReviews);
    })
  }

  static storeOfflinePosts(review) {
    dbPromise.then((db) => {
      if(!db) return;
      let tx = db.transaction(OFFLINE_REVIEW_OS, 'readwrite');
      let store = tx.objectStore(OFFLINE_REVIEW_OS);
      store.add(review);
      return tx.complete;
    }).then(() => {
      console.log('Offline Review Added');
    });
  }

  static getOfflinePosts(callback) {
    dbPromise.then((db) => {
      if(!db) return;
      let reviewIndex = db.transaction(OFFLINE_REVIEW_OS).objectStore(OFFLINE_REVIEW_OS);
      return reviewIndex.getAll().then((reviews) => {
        callback(reviews)
      })
    })
  }

  static deleteOfflinePosts() {
    if(navigator.onLine){
      dbPromise.then((db) => {
        if(!db) return;
        let tx = db.transaction(OFFLINE_REVIEW_OS, 'readwrite');
        let store = tx.objectStore(OFFLINE_REVIEW_OS);
        store.clear();
        return tx.complete;
      }).then(() => {
        console.log('Offline Reviews deleted');
      });
    }
  }


  static postReview(review) {
    
    if(navigator.onLine === false){
      DBHelper.storeOfflinePosts(review);
    }
    else {
      return fetch(`${this.DATABASE_URL}/reviews/`, {method: 'POST', body: JSON.stringify(review)}).then(response => response.json()).then(data => {
        DBHelper.storeInIndexDB(REVIEW_OS, data);
      });
    }
  }

  static storeOfflineFavorites(id, favorite) {
    dbPromise.then((db) => {
      if(!db) return;
      let tx = db.transaction(OFFLINE_FAVORITE_OS, 'readwrite');
      let store = tx.objectStore(OFFLINE_FAVORITE_OS);
      let favoriteData = {
        id: id,
        is_favorite: favorite
      };
      store.put(favoriteData);
      return tx.complete;
    }).then(() => {
      console.log('Offline Favorite Added');
    });
  }

  static getOfflineFavorites(callback) {
    dbPromise.then((db) => {
      if(!db) return;
      let favoriteIndex = db.transaction(OFFLINE_FAVORITE_OS).objectStore(OFFLINE_FAVORITE_OS);
      return favoriteIndex.getAll().then((favorites) => {
        callback(favorites)
      })
    })
  }

  static deleteOfflineFavorites() {
    if(navigator.onLine) {
      dbPromise.then((db) => {
        if(!db) return;
        let tx = db.transaction(OFFLINE_FAVORITE_OS, 'readwrite');
        let store = tx.objectStore(OFFLINE_FAVORITE_OS);
        store.clear();
        return tx.complete;
      }).then(() => {
        console.log('Offline Favorites deleted');
      });
    }
  }

  static toggleFavorite(restaurant) {

    if(navigator.onLine === false){
      DBHelper.storeOfflineFavorites(restaurant.id, restaurant.is_favorite);
      dbPromise.then((db) => {
        if(!db) return;
        let tx = db.transaction(RESTAURANT_OS, 'readwrite');
        let store = tx.objectStore(RESTAURANT_OS);
        store.put(restaurant);
        return tx.complete;
      }).then(() => {
        console.log('Favorite updated in IDB');
      });
    }

    else {
      return fetch(`${this.DATABASE_URL}/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`, {method: 'PUT'}).then(response => response.json().then(data => {
        DBHelper.storeInIndexDB(RESTAURANT_OS, data);
      }));
    }
  }

  static updateFavorite(button, restaurant) {
    if(restaurant.is_favorite) {
      button.setAttribute('aria-label', `Remove ${restaurant.name} from favorites`);
      button.style.backgroundImage = `url(${DBHelper.favoriteSVG()})`;
    }
    else {
      button.setAttribute('aria-label', `Add ${restaurant.name} to favorites`);
      button.style.backgroundImage = `url(${DBHelper.notFavoriteSVG()})`;
    }
  }
  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/dist/img/${restaurant.photograph}.webp`);
  }
  static notFavoriteSVG() {
    return (`/icons/like-outline.svg`);
  }
  static favoriteSVG() {
    return (`/icons/like-fill.svg`);
  }

  /**
   * Map marker for a restaurant.
   */
static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      title: restaurant.name,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } 

}
