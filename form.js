// Your web app's Firebase configuration
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
// Function to track a viewed item in Firebase under the user's profile
async function trackViewedItem(userId, itemId) {
    const userViewedItemsRef = firebase.database().ref(`onlineAuction/users/${userId}/viewedItems`);

    // Fetch current viewed items
    const snapshot = await userViewedItemsRef.once('value');
    const viewedItems = snapshot.exists() ? snapshot.val() : [];

    // Add the new item if it's not already in the list
    if (!viewedItems.includes(itemId)) {
        viewedItems.push(itemId);
        await userViewedItemsRef.set(viewedItems);  // Store the updated list back to Firebase
    }
}

// Function to get the list of viewed items from Firebase for the logged-in user
async function getUserViewedItems(userId) {
    const userViewedItemsRef = firebase.database().ref(`onlineAuction/users/${userId}/viewedItems`);
    const snapshot = await userViewedItemsRef.once('value');
    
    return snapshot.exists() ? snapshot.val() : []; // Return empty array if no viewed items
}

// Function to recommend an item based on the user's interaction and ongoing items
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

        // Get user ID (this should be available if the user is logged in)
        const userId = 'user123';  // Replace with actual user ID (authentication-dependent)

        // Retrieve the list of viewed items from Firebase
        const userViewedItems = await getUserViewedItems(userId);

        let recommendedItem = null;

        // Prioritize the items the user has viewed recently
        if (userViewedItems && userViewedItems.length > 0) {
            const viewedOngoingItems = ongoingItems.filter(item => userViewedItems.includes(item.id));
            if (viewedOngoingItems.length > 0) {
                // Recommend the most recent item the user has viewed
                recommendedItem = viewedOngoingItems[0];  // Customize recommendation logic here
            }
        }

        // If no viewed item, pick a random ongoing auction item
        if (!recommendedItem) {
            recommendedItem = ongoingItems[Math.floor(Math.random() * ongoingItems.length)];
        }

        // Display the recommended item
        document.getElementById('recommendedItems').innerHTML = `
            <div class="recommendation-item">
                <h4>${recommendedItem.name}</h4>
                <p>${recommendedItem.description}</p>
                <p><strong>Starting Price:</strong> $${recommendedItem.price}</p>
                <p><strong>Current Highest Bid:</strong> $${recommendedItem.highestBid}</p>
                <p><strong>Ends at:</strong> ${new Date(recommendedItem.endTime).toLocaleString()}</p>
                <img src="${recommendedItem.imageUrl}" alt="${recommendedItem.name}" style="width: 100px;">
            </div>
        `;
    } catch (error) {
        console.error("Error fetching auction items:", error);
        document.getElementById('recommendedItems').innerHTML = "An error occurred while fetching auction items.";
    }
}

// Function to increment the view count for an auction item
async function incrementViewCount(itemId) {
    const itemRef = firebase.database().ref(`onlineAuction/auction-items/${itemId}/viewCount`);

    // Use a transaction to safely increment the view count
    await itemRef.transaction(currentCount => {
        return (currentCount || 0) + 1; // If no count, set it to 0; otherwise, increment by 1
    });
}

function viewItem(userId, item) {
    incrementViewCount(userId, item.id);  // Assuming `item.id` is the unique identifier for the auction item
   
}



document.addEventListener('DOMContentLoaded', () => {
    checkUserAuthentication(); // Check user is logged in
    fetchAllAuctionItems(); // Display auction items
    recommend(); // Call the recommend function 
});


//checkUserAuthentication for pages requiring login
document.addEventListener("DOMContentLoaded", () => {
    checkUserAuthentication(); 
});


