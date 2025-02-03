const BREVO_API_KEY = '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'; // Replace with your actual Brevo API key

const sendEmail = (sellerEmail, itemName, highestBid) => {
    const url = 'https://api.brevo.com/v3/smtp/email';
    const headers = {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
    };

    const emailData = {
        sender: {
            email: '84de5a001@smtp-brevo.com', // Replace with your sender email
            name: 'Auction Platform',
        },
        to: [
            {
                email: sellerEmail,
            },
        ],
        subject: `Auction Ended: ${itemName}`,
        htmlContent: `
            <h1>Auction Ended</h1>
            <p>Your auction for the item <strong>${itemName}</strong> has ended.</p>
            <p>The highest bid was <strong>$${highestBid}</strong>.</p>
            <p>Thank you for using our platform!</p>
        `,
    };

    fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(emailData),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log('Email sent successfully:', data);
        })
        .catch((error) => {
            console.error('Error sending email:', error);
        });
};

module.exports = { sendEmail };
