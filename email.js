// email.js

// Function to send email using Sendinblue
async function sendEmailNotification(sellerEmail, itemName) {
    const url = "https://api.sendinblue.com/v3/smtp/email";
    const apiKey = "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"; // Replace with your actual Sendinblue API key

    const emailData = {
        sender: { email: "84de5a001@smtp-brevo.com", name: "Auction Platform" },  // Replace with your sender email
        to: [{ email: sellerEmail }],
        subject: `Auction for ${itemName} has ended`,
        textContent: `The auction for your item, "${itemName}", has ended. Please check the platform for bid results.`,
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify(emailData),
        });

        if (response.ok) {
            console.log(`Email sent successfully to ${sellerEmail}`);
        } else {
            console.error("Error sending email:", await response.text());
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
