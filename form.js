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

// Function to check if the user is logged in and fetch auction items
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            fetchAllAuctionItems();
        } else {
            alert("You must be logged in to view this page.");
            window.location.href = 'login.html';
        }
    });
});

// Function to fetch and display all auction items
async function fetchAllAuctionItems() {
    const usersRef = db.ref('onlineAuction/users');
    usersRef.on('value', (snapshot) => {
        const allAuctionItemsContainer = document.getElementById('allAuctionItems');
        allAuctionItemsContainer.innerHTML = ''; // Clear existing items

        snapshot.forEach((userSnapshot) => {
            userSnapshot.child('auction-items').forEach((itemSnapshot) => {
                const itemData = itemSnapshot.val();
                const itemElement = document.createElement('div');
                itemElement.classList.add('auction-item');
                itemElement.innerHTML = `
                    <h3>${itemData.name}</h3>
                    <p>Description: ${itemData.description}</p>
                    <p>Starting Price: $${itemData.price}</p>
                    <p>Current Highest Bid: $${itemData.highestBid || itemData.price}</p>
                    <p>Highest Bidder: ${itemData.highestBidder || 'No bids yet'}</p>
                    <form onsubmit="placeBid(event, '${userSnapshot.key}', '${itemSnapshot.key}', ${itemData.highestBid || itemData.price})">
                        <input type="number" id="bidAmount-${itemSnapshot.key}" placeholder="Enter bid amount" min="${itemData.highestBid ? itemData.highestBid + 1 : itemData.price + 1}" required>
                        <button type="submit">Place Bid</button>
                    </form>
                    <hr>
                `;
                allAuctionItemsContainer.appendChild(itemElement);
            });
        });
    });
}

// Function to place a bid
async function placeBid(event, userUID, itemID, currentHighestBid) {
    event.preventDefault();

    const bidInput = document.getElementById(`bidAmount-${itemID}`);
    const bidAmount = parseFloat(bidInput.value);

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

        const itemRef = db.ref(`onlineAuction/users/${userUID}/auction-items/${itemID}`);
        await itemRef.update({
            highestBid: bidAmount,
            highestBidder: user.uid
        });

        alert("Bid placed successfully!");
        fetchAllAuctionItems();
    } catch (error) {
        console.error("Error placing bid:", error.message);
        alert("An error occurred while placing your bid. Please try again.");
    }
}

// Function to handle auction item uploads
async function handleUpload(user) {
    try {
        const itemName = document.getElementById('itemName').value;
        const itemDescription = document.getElementById('itemDescription').value;
        const itemPrice = document.getElementById('itemPrice').value;
        const itemImage = document.getElementById('itemImage').files[0];

        if (!itemName || !itemDescription || !itemPrice || !itemImage) {
            alert("All fields must be filled out, including selecting an image.");
            return;
        }

        const userUID = user.uid;
        const storagePath = `auction-items/${userUID}/${itemImage.name}`;
        const storageRefPath = storage.ref(storagePath);

        const uploadTask = storageRefPath.put(itemImage);
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                document.getElementById('uploadProgress').value = progress;
            },
            (error) => {
                console.error("Error during image upload:", error.message);
                alert("Error during image upload: " + error.message);
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                const userItemsRef = db.ref(`onlineAuction/users/${userUID}/auction-items`);
                const newItemRef = userItemsRef.push();

                await newItemRef.set({
                    name: itemName,
                    description: itemDescription,
                    price: parseFloat(itemPrice),
                    imageUrl: downloadURL,
                    timestamp: Date.now()
                });

                alert("Item uploaded successfully!");
                window.location.href = 'home.html';
            }
        );
    } catch (error) {
        console.error("Unexpected error during the upload process:", error.message);
        alert("An unexpected error occurred. Please try again.");
    }
}

// Event listener to handle auction item upload form
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            const formElement = document.getElementById('auctionForm');
            if (formElement) {
                formElement.addEventListener('submit', function (e) {
                    e.preventDefault();
                    handleUpload(user);
                });
            }
        } else {
            alert("You must be logged in to access this page.");
            window.location.href = 'login.html';
        }
    });
});
