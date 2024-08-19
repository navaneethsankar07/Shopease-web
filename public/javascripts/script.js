function addToCart(productId) {
  event.stopPropagation();
  $.ajax({
    url: '/add-to-cart/' + productId,
    method: 'get',
    success: (response) => {
      if (response.status) {
        let count = $('#cart-count').html();
        count = parseInt(count) + 1;
        $('#cart-count').html(count);
      }
    },
    error: (err) => {
      alert('Do It After Login');
      console.log('Error in AJAX call:', err);
    }
  });
}

function toggleWishlist(productId, iconElement, event) {
  event.stopPropagation(); // Prevent event from bubbling up
  
  // Toggle heart color
  if (iconElement.classList.contains('far')) {
    // Heart is not filled (empty)
    iconElement.classList.remove('far');
    iconElement.classList.add('fas');
    iconElement.style.color = 'red'; // Change color to red
    addToWishlist(productId); // Call addToWishlist function or perform other actions
  } else {
    // Heart is filled (red)
    iconElement.classList.remove('fas');
    iconElement.classList.add('far');
    iconElement.style.color = 'lightgray'; // Change color to light gray or initial state
    removeFromWishlist(productId); // Call removeFromWishlist function or perform other actions
  }
}

function addToWishlist(productId) {
  // Add to wishlist functionality using fetch or AJAX
  fetch('/add-to-wishlist/' + productId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ productId: productId })
  }).then(response => {
    if (response.ok) {
      alert("product added to wishlist")
    } else {
      console.error('Failed to add to wishlist');
    }
  }).catch(error => {
    console.error('Error adding to wishlist:', error);
  });
}

function removeFromWishlist(productId) {
  event.stopPropagation(); // Prevent event from bubbling up
  
  fetch('/remove-from-wishlist/' + productId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ productId: productId })
  }).then(response => {
    if (response.ok) {
      console.log('Removed from wishlist');
      alert('Product removed from wishlist.');
      // Remove the product card from the DOM
      document.getElementById(`product-${productId}`).remove();
      refreshWishlist();
    } else {
      console.error('Failed to remove from wishlist');
      alert('Failed to remove product from wishlist.');
    }
  }).catch(error => {
    console.error('Error removing from wishlist:', error);
   
  });
}

function refreshWishlist() {
  fetch('/wishlist')
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newWishlistContent = doc.querySelector('.row').innerHTML;
      document.querySelector('.row').innerHTML = newWishlistContent;
    })
    .catch(error => {
      console.error('Error refreshing wishlist:', error);
    });
}

