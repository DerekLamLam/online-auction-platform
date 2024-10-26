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
// Initialize Firebase using the global `firebase` object provided by the Firebase SDK scripts
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

console.log("Firebase initialized successfully");

// Check if the user is logged in when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User is authenticated:", user.uid); // Log the authenticated user UID
            displayAuctionItems(user.uid); // Display existing auction items for the user

            // Handle auction item form submission
            const formElement = document.getElementById('auctionForm');
            if (formElement) {
                formElement.addEventListener('submit', function (e) {
                    e.preventDefault(); // Prevent default form submission
                    console.log("Form submitted, starting upload process...");
                    handleUpload(user); // Handle the upload process
                });
            }
        } else {
            console.log("User is not authenticated, redirecting to login...");
            alert("You must be logged in to access this page.");
            window.location.href = 'login.html'; // Redirect if the user is not authenticated
        }
    });
});

// Function to handle auction item uploads
async function handleUpload(user) {
    try {
        // Get form input values
        const itemName = document.getElementById('itemName').value;
        const itemDescription = document.getElementById('itemDescription').value;
        const itemPrice = document.getElementById('itemPrice').value;
        const itemImage = document.getElementById('itemImage').files[0]; // Get the selected image file

        console.log("Item Details:", {
            itemName,
            itemDescription,
            itemPrice,
            itemImage: itemImage.name
        });

        // Validate that all fields are filled
        if (!itemName || !itemDescription || !itemPrice || !itemImage) {
            alert("All fields must be filled out, including selecting an image.");
            return;
        }

        const userUID = user.uid; // Get the user's UID for storing their items
        console.log("User UID:", userUID); // Log the user's UID

        // Create a reference for the image in Firebase Storage
        const storagePath = `auction-items/${userUID}/${itemImage.name}`;
        const storageRefPath = storage.ref(storagePath);

        console.log("Uploading image to storage path:", storagePath);

        // Start uploading the image to Firebase Storage
        const uploadTask = storageRefPath.put(itemImage);

        // Monitor the upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '% done'); // Log upload progress
                document.getElementById('uploadProgress').value = progress; // Update progress bar
            },
            (error) => {
                console.error("Error during image upload:", error.message); // Log upload error
                alert("Error during image upload: " + error.message);
            },
            async () => {
                // On successful upload, get the image's download URL
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                console.log("Image uploaded successfully. Download URL:", downloadURL); // Log the image's download URL

                // Reference to the user's auction items in Firebase Realtime Database
                const userItemsRef = db.ref(`onlineAuction/users/${userUID}/auction-items`);
                const newItemRef = userItemsRef.push();

                console.log("Storing auction item details in the database...");

                // Save the auction item details in the Firebase Realtime Database
                await newItemRef.set({
                    name: itemName,
                    description: itemDescription,
                    price: parseFloat(itemPrice),
                    imageUrl: downloadURL, // Save the image's download URL
                    timestamp: Date.now() // Save the upload timestamp
                });

                console.log("Auction item stored in database successfully.");

                alert("Item uploaded successfully!");

                // Redirect to the home page after a successful upload
                window.location.href = 'home.html';
            }
        );
    } catch (error) {
        console.error("Unexpected error during the upload process:", error.message); // Log any unexpected errors
        alert("An unexpected error occurred. Please try again.");
    }
}

// Function to display the user's auction items
async function displayAuctionItems(userUID) {
    try {
        console.log("Fetching auction items for user:", userUID); // Log user UID when fetching items

        // Reference to the user's auction items in Firebase Realtime Database
        const userItemsRef = db.ref(`onlineAuction/users/${userUID}/auction-items`);

        // Fetch auction items and listen for changes
        userItemsRef.on('value', (snapshot) => {
            const auctionItemsContainer = document.getElementById('auctionItems');
            auctionItemsContainer.innerHTML = '';  // Clear existing items

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const itemData = childSnapshot.val();
                    console.log("Fetched auction item:", itemData); // Log fetched auction item

                    const itemElement = document.createElement('div');
                    itemElement.classList.add('auction-item');
                    itemElement.innerHTML = `
                        <h3>${itemData.name}</h3>
                        <p>${itemData.description}</p>
                        <p>Price: $${itemData.price}</p>
                        <img src="${itemData.imageUrl}" alt="${itemData.name}" width="150" />
                        <hr>
                    `;
                    auctionItemsContainer.appendChild(itemElement);
                });
            } else {
                console.log("No auction items found for user:", userUID); // Log if no items found
                auctionItemsContainer.innerHTML = `<p>No items uploaded yet.</p>`;
            }
        });
    } catch (error) {
        console.error("Error fetching auction items:", error.message); // Log any errors during fetching
        alert("Could not fetch auction items. Please reload the page.");
    }
}
