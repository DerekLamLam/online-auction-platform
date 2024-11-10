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
                    <form onsubmit="placeBid(event, '${userUID}', '${itemID}', ${currentHighestBid})">
                        <input type="number" id="bidAmount-${itemID}" placeholder="Enter bid amount" min="${currentHighestBid + 1}" required>
                        <button type="submit">Place Bid</button>
                    </form>
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

// Function to place a bid with error handling
async function placeBid(event, userUID, itemID, currentHighestBid) {
    event.preventDefault();

    const bidInput = document.getElementById(`bidAmount-${itemID}`);
    const bidAmount = parseFloat(bidInput.value);

    console.log("Attempting to place bid", { userUID, itemID, bidAmount, currentHighestBid });

    try {
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
// Check if user is authenticated (  edit.html)
function checkUserAuthentication(redirectUrl = "index.html") {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            alert("You must be logged in to access this page.");
            window.location.href = redirectUrl;
        }
    });
}

// Example: Usage of checkUserAuthentication for pages requiring login
document.addEventListener("DOMContentLoaded", () => {
    checkUserAuthentication(); // This will ensure the user is logged in when accessing edit.html
});


