// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB0j5JKcEoY__TKGD4cWnwdW0gkfZRB3ew",
    authDomain: "onlineauction-ba60b.firebaseapp.com",
    databaseURL: "https://onlineauction-ba60b-default-rtdb.firebaseio.com",
    projectId: "onlineauction-ba60b",
    storageBucket: "onlineauction-ba60b.appspot.com",
    messagingSenderId: "313811380253",
    appId: "1:313811380253:web:e80553266413d869dafef4"
    };


// Initialize Firebase if it hasn't been initialized elsewhere
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// Function to calculate remaining time in "Xd Xh Xm" format
function calculateRemainingTime(endTime) {
    const now = Date.now();
    const timeDiff = endTime - now;

    if (timeDiff <= 0) {
        return "Auction ended";
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}
// Function to fetch and display all auction items with seller info, item images, and timer
async function fetchAllAuctionItems() {
    const usersRef = db.ref('onlineAuction/users');
    usersRef.on('value', async (snapshot) => {
        const allAuctionItemsContainer = document.getElementById('allAuctionItems');
        allAuctionItemsContainer.innerHTML = ''; // Clear existing items

        snapshot.forEach((userSnapshot) => {
            const sellerData = userSnapshot.val(); // Fetch seller's username and email
            userSnapshot.child('auction-items').forEach((itemSnapshot) => {
                const itemData = itemSnapshot.val();
                const itemID = itemSnapshot.key;
                const userUID = userSnapshot.key;

                // Handle highestBid being null
                const currentHighestBid = itemData.highestBid || itemData.price;
                let highestBidderName = "No bids yet";
                if (itemData.highestBidder) {
                    db.ref(`onlineAuction/users/${itemData.highestBidder}/username`).once('value')
                        .then((bidderSnapshot) => {
                            highestBidderName = bidderSnapshot.val() || itemData.highestBidder;
                            document.getElementById(`highestBidder-${itemID}`).innerText = highestBidderName;
                        });
                }

                // Calculate remaining time
                const remainingTime = calculateRemainingTime(itemData.endTime);

                // Determine if auction has ended
                const now = Date.now();
                const isAuctionEnded = now >= itemData.endTime;

                const itemElement = document.createElement('div');
                itemElement.classList.add('auction-item');
                itemElement.innerHTML = `
                    <h3>${itemData.name}</h3>
                    <p>Description: ${itemData.description}</p>
                    <p>Starting Price: $${itemData.price}</p>
                    <p>Current Highest Bid: $${currentHighestBid}</p>
                    <p>Highest Bidder: <span id="highestBidder-${itemID}">${highestBidderName}</span></p>
                    <p>Remaining Time: <span id="timer-${itemID}">${remainingTime}</span></p>
                    <p>Seller: ${sellerData.username || 'Unknown'} (${sellerData.email || 'No email provided'})</p>
                    <img src="${itemData.imageUrl || ''}" alt="${itemData.name}" style="max-width: 200px;">
                    <form onsubmit="placeBid(event, '${userUID}', '${itemID}', ${currentHighestBid}, ${itemData.endTime})">
                        <input type="number" id="bidAmount-${itemID}" placeholder="Enter bid amount" min="${currentHighestBid + 1}" required ${isAuctionEnded ? 'disabled' : ''}>
                        <button type="submit" ${isAuctionEnded ? 'disabled' : ''}>Place Bid</button>
                    </form>
                    ${isAuctionEnded ? '<p>This auction has ended. You cannot place any bids.</p>' : ''}
                    <hr>
                `;
                allAuctionItemsContainer.appendChild(itemElement);

                // Update timer every minute
                setInterval(() => {
                    document.getElementById(`timer-${itemID}`).innerText = calculateRemainingTime(itemData.endTime);
                }, 60000); // Update every 60 seconds
            });
        });
    });
}


async function placeBid(event, userUID, itemID, currentHighestBid, endTime) {
    event.preventDefault();

    const bidInput = document.getElementById(`bidAmount-${itemID}`);
    const bidAmount = parseFloat(bidInput.value);

    console.log("Attempting to place bid", { userUID, itemID, bidAmount, currentHighestBid });

    try {
        // Check if the auction has ended
        const now = Date.now();
        if (now >= endTime) {
            alert("This auction has ended. You can no longer place a bid.");
            return;
        }

        if (bidAmount <= currentHighestBid) {
            alert("Your bid must be higher than the current highest bid.");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert("You need to log in to place a bid.");
            return;
        }

        // Reference to the specific auction item in Firebase
        const itemRef = db.ref(`onlineAuction/users/${userUID}/auction-items/${itemID}`);

        // Update Firebase with the new highest bid and bidder
        await itemRef.update({
            highestBid: bidAmount,
            highestBidder: user.uid
        });

        alert("Bid placed successfully!");
        fetchAllAuctionItems(); // Refresh items to show updated bid
    } catch (error) {
        console.error("Error placing bid:", error);
        alert("An error occurred while placing your bid. Please try again.");
    }
}


// Logout Function
function logout() {
    auth.signOut().then(() => {
            alert("You have been logged out successfully.");
            window.location.href = "index.html"; // Redirect to login page after logout
        }).catch((error) => {
            console.error("Error logging out:", error);
            alert("An error occurred while logging out. Please try again.");
        });
}
// Check if user is authenticated 
function checkUserAuthentication(redirectUrl = "index.html") {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            alert("You must be logged in to access this page.");
            window.location.href = redirectUrl;
        }
    });
}
// Fetch all auction items from Firebase and recommend a random one that's still ongoing
async function recommend() {
    try {
        const auctionsRef = firebase.database().ref('onlineAuction/users');
        const snapshot = await auctionsRef.once('value');

        if (!snapshot.exists()) {
            document.getElementById('recommendedItems').innerHTML = "No items available.";
            return;
        }

        // Collect all ongoing auction items
        const ongoingItems = [];
        snapshot.forEach(userSnapshot => {
            const userItems = userSnapshot.child('auction-items').val();
            if (userItems) {
                Object.values(userItems).forEach(item => {
                    const currentTime = Date.now();
                    if (item.endTime > currentTime) {  // Filter items that are still ongoing
                        ongoingItems.push(item);
                    }
                });
            }
        });

        if (ongoingItems.length === 0) {
            document.getElementById('recommendedItems').innerHTML = "No ongoing auction items.";
            return;
        }

        // Randomly pick one item from the ongoing items
        const randomItem = ongoingItems[Math.floor(Math.random() * ongoingItems.length)];

        // Display the recommended item
        document.getElementById('recommendedItems').innerHTML = `
            <div class="recommendation-item">
                <h4>${randomItem.name}</h4>
                <p>${randomItem.description}</p>
                <p><strong>Starting Price:</strong> $${randomItem.price}</p>
                <p><strong>Current Highest Bid:</strong> $${randomItem.highestBid}</p>
                <p><strong>Ends at:</strong> ${new Date(randomItem.endTime).toLocaleString()}</p>
                <img src="${randomItem.imageUrl}" alt="${randomItem.name}" style="width: 100px;">
            </div>
        `;
    } catch (error) {
        console.error("Error fetching auction items:", error);
        document.getElementById('recommendedItems').innerHTML = "An error occurred while fetching auction items.";
    }
}


// Function to display auction items dynamically
function displayAuctionItems(items) {
    const allItemsContainer = document.getElementById('allAuctionItems');
    allItemsContainer.innerHTML = ''; // Clear current items

    if (items.length === 0) {
        allItemsContainer.innerHTML = 'No matching items found.'; // Show message if no items match the search
        return;
    }

    // Loop through the filtered items and create HTML for each item
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('auction-item');
        itemDiv.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <h4>${item.name}</h4>
            <p>${item.description}</p>
            <div class="auction-item-footer">
                <span class="price">Starting Price: $${item.price}</span>
                <span class="timer">Ends at: ${new Date(item.endTime).toLocaleString()}</span>
            </div>
        `;
        allItemsContainer.appendChild(itemDiv); // Add the item div to the container
    });
}


// Search function to filter auction items based on input
function searchAuctionItems() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase(); // Get the search query 

    // Fetch all auction items 
    const usersRef = firebase.database().ref('onlineAuction/users');
    usersRef.once('value', snapshot => {
        const filteredItems = [];

        // Loop through each user
        snapshot.forEach(userSnapshot => {
            const userUID = userSnapshot.key;
            const userItems = userSnapshot.child('auction-items').val(); // Get auction items for this user

            if (userItems) {
                // Loop through each item under this user
                Object.entries(userItems).forEach(([itemID, item]) => {
                    // Check if the item name or description contains the search query 
                    if (item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)) {
                        // Add userUID and itemID to the item object for reference 
                        filteredItems.push({
                            ...item,
                            userUID,
                            itemID
                        });
                    }
                });
            }
        });

        // Call the display function to show the filtered items
        displayAuctionItems(filteredItems);
    });
}

// Clear the search input and show all items again
function clearSearch() {
    // Clear the search input field
    document.getElementById('searchInput').value = '';
    
    // Fetch and display all items again
    fetchAllAuctionItems();
}


// Example: Usage of checkUserAuthentication for pages requiring login
document.addEventListener("DOMContentLoaded", () => {
    checkUserAuthentication(); 
});


