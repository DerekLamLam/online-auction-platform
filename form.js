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

// Function to fetch and display all auction items with seller info and item images
async function fetchAllAuctionItems() {
    const usersRef = db.ref('onlineAuction/users');
    usersRef.on('value', async (snapshot) => {
        const allAuctionItemsContainer = document.getElementById('allAuctionItems');
        allAuctionItemsContainer.innerHTML = ''; // Clear existing items

        snapshot.forEach((userSnapshot) => {
            const sellerData = userSnapshot.val(); // Fetch seller's data, including username and email
            userSnapshot.child('auction-items').forEach((itemSnapshot) => {
                const itemData = itemSnapshot.val();
                const itemID = itemSnapshot.key;
                const userUID = userSnapshot.key;

                // Set placeholder for highest bidder's name and load the name if there's a highestBidder
                let highestBidderName = "No bids yet";
                if (itemData.highestBidder) {
                    db.ref(`onlineAuction/users/${itemData.highestBidder}/username`).once('value').then((bidderSnapshot) => {
                        highestBidderName = bidderSnapshot.val() || itemData.highestBidder;
                        document.getElementById(`highestBidder-${itemID}`).innerText = highestBidderName;
                    });
                }

                const itemElement = document.createElement('div');
                itemElement.classList.add('auction-item');
                itemElement.innerHTML = `
                    <h3>${itemData.name}</h3>
                    <p>Description: ${itemData.description}</p>
                    <p>Starting Price: $${itemData.price}</p>
                    <p>Current Highest Bid: $${itemData.highestBid || itemData.price}</p>
                    <p>Highest Bidder: <span id="highestBidder-${itemID}">${highestBidderName}</span></p>
                    <p>Seller: ${sellerData.username || 'Unknown'} (${sellerData.email || 'No email provided'})</p>
                    <img src="${itemData.imageUrl || ''}" alt="${itemData.name}" style="max-width: 200px;">
                    <form onsubmit="placeBid(event, '${userUID}', '${itemID}', ${itemData.highestBid || itemData.price})">
                        <input type="number" id="bidAmount-${itemID}" placeholder="Enter bid amount" min="${itemData.highestBid ? itemData.highestBid + 1 : itemData.price + 1}" required>
                        <button type="submit">Place Bid</button>
                    </form>
                    <hr>
                `;
                allAuctionItemsContainer.appendChild(itemElement);
            });
        });
    });
}

// Function to place a bid with error logging for debugging
async function placeBid(event, userUID, itemID, currentHighestBid) {
    event.preventDefault();

    const bidInput = document.getElementById(`bidAmount-${itemID}`);
    const bidAmount = parseFloat(bidInput.value);

    try {
        // Ensure the bid is higher than the current highest bid
        if (bidAmount <= currentHighestBid) {
            alert("Your bid must be higher than the current highest bid.");
            return;
        }

        // Get the currently authenticated user
        const user = auth.currentUser;
        if (!user) {
            alert("You need to log in to place a bid.");
            return;
        }

        // Reference to the auction item in Firebase
        const itemRef = db.ref(`onlineAuction/users/${userUID}/auction-items/${itemID}`);
        
        // Update Firebase with the new highest bid and bidder
        await itemRef.update({
            highestBid: bidAmount,
            highestBidder: user.uid
        });

        alert("Bid placed successfully!");
        fetchAllAuctionItems(); // Refresh items to show updated bid
    } catch (error) {
        console.error("Error placing bid:", error.message);
        alert("An error occurred while placing your bid. Please try again.");
    }
}

// Check if the user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            fetchAllAuctionItems();
        } else {
            alert("You must be logged in to view this page.");
            window.location.href = 'index.html';
        }
    });
});
