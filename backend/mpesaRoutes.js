/**
 * M-Pesa Daraja API Integration Routes
 * 
 * This module handles STK Push payments and callbacks for the Mandazi Sales Tracking System.
 * It integrates with Safaricom's Daraja API to process mobile money payments.
 * 
 * Required Environment Variables:
 * - CONSUMER_KEY: Safaricom API consumer key
 * - CONSUMER_SECRET: Safaricom API consumer secret
 * - SHORTCODE: Business short code
 * - PASSKEY: M-Pesa passkey
 * - CALLBACK_URL: URL for payment callbacks
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Import authentication middleware
const {
    requireAuth
} = require('./middleware/auth');

// Load environment variables
require('dotenv').config();

// Database file path
const SALES_FILE = path.join(__dirname, 'data', 'sales.json');

/**
 * Helper function to read sales data from JSON file
 * @returns {Array} Array of sale objects
 */
function readSales() {
    return JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));
}

/**
 * Helper function to write sales data to JSON file
 * @param {Array} sales - Array of sale objects to save
 */
function writeSales(sales) {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
}

/**
 * Generate Daraja API Access Token
 * 
 * This function obtains an OAuth access token from Safaricom's Daraja API.
 * The token is required for all M-Pesa API calls.
 * 
 * @returns {Promise<string>} Access token
 * @throws {Error} If token generation fails
 */
async function getAccessToken() {
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;
    const authUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa credentials not configured. Please set CONSUMER_KEY and CONSUMER_SECRET in .env file.');
    }

    // Create basic auth header
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await fetch(authUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get access token: ${error}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw new Error('Failed to authenticate with M-Pesa API');
    }
}

/**
 * Generate M-Pesa Password
 * 
 * Creates the Base64 encoded password required for STK Push requests.
 * The password is a concatenation of: Shortcode + Passkey + Timestamp
 * 
 * @param {string} timestamp - Current timestamp in YYYYMMDDHHmmss format
 * @returns {string} Base64 encoded password
 */
function generateMpesaPassword(timestamp) {
    const shortcode = process.env.SHORTCODE;
    const passkey = process.env.PASSKEY;
    const passwordString = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
}

/**
 * STK Push Payment Request
 * 
 * Initiates an M-Pesa STK Push to the customer's phone.
 * This triggers a payment prompt on the customer's device.
 * Requires authentication.
 * 
 * Request Body:
 * - customer_name: Name of the customer
 * - phone_number: Customer's phone number (format: 254XXXXXXXXX)
 * - amount: Payment amount in KES
 * - sale_id: Internal sale ID for tracking
 */
router.post('/pay', requireAuth, async (req, res) => {
    try {
        const {
            customer_name,
            phone_number,
            amount,
            sale_id
        } = req.body;

        // Input Validation
        if (!customer_name || !phone_number || !amount || !sale_id) {
            return res.status(400).json({
                error: 'Missing required fields: customer_name, phone_number, amount, sale_id'
            });
        }

        // Validate phone number format
        let formattedPhone = phone_number.replace(/[^0-9]/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        }
        if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
            return res.status(400).json({
                error: 'Invalid phone number format. Use format: 254XXXXXXXXX'
            });
        }

        // Validate amount
        const paymentAmount = parseInt(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount. Must be a positive number.'
            });
        }

        // Check if sale exists and is not already paid
        const sales = readSales();
        const sale = sales.find(s => s.id === parseInt(sale_id));

        if (!sale) {
            return res.status(404).json({
                error: 'Sale not found'
            });
        }

        if (sale.paymentStatus === 'PAID' || sale.paymentStatus === 'Paid') {
            return res.status(400).json({
                error: 'This sale is already paid'
            });
        }

        // Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').substring(0, 14);
        const password = generateMpesaPassword(timestamp);
        const shortcode = process.env.SHORTCODE;
        const callbackUrl = process.env.CALLBACK_URL;

        if (!shortcode || !callbackUrl) {
            return res.status(500).json({
                error: 'M-Pesa configuration incomplete. Please set SHORTCODE and CALLBACK_URL in .env file.'
            });
        }

        // Get access token
        const accessToken = await getAccessToken();

        // STK Push Request Payload
        const stkPushData = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: paymentAmount,
            PartyA: formattedPhone,
            PartyB: shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: 'Mandazi',
            TransactionDesc: 'Mandazi Payment'
        };

        // Send STK Push request
        const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const response = await fetch(stkPushUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(stkPushData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('STK Push error:', responseData);
            return res.status(400).json({
                error: 'Failed to initiate M-Pesa payment',
                details: responseData
            });
        }

        // Update sale with pending payment status
        const saleIndex = sales.findIndex(s => s.id === parseInt(sale_id));
        sales[saleIndex].paymentStatus = 'PENDING';
        sales[saleIndex].phone_number = formattedPhone;
        sales[saleIndex].mpesa_checkout_request_id = responseData.CheckoutRequestID;
        sales[saleIndex].mpesa_request_timestamp = timestamp;
        writeSales(sales);

        // Return success response
        res.json({
            success: true,
            message: 'Payment request sent successfully. Please check your phone.',
            checkout_request_id: responseData.CheckoutRequestID,
            customer_phone: formattedPhone
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({
            error: error.message || 'Failed to process payment'
        });
    }
});

/**
 * M-Pesa Callback Endpoint
 * 
 * Safaricom sends payment confirmation to this endpoint after the customer
 * completes or cancels the payment. This updates the database automatically.
 * 
 * Expected Callback Body:
 * - Body.stkCallback
 *   - MerchantRequestID
 *   - CheckoutRequestID
 *   - ResultCode (0 = success)
 *   - ResultDesc
 *   - CallbackMetadata (contains receipt number, amount, phone)
 */
router.post('/callback', async (req, res) => {
    try {
        const callbackData = req.body;
        console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));

        // Extract callback data
        const stkCallback = callbackData.Body ? .stkCallback;

        if (!stkCallback) {
            console.error('Invalid callback data');
            return res.json({
                ResultCode: 1,
                ResultDesc: 'Invalid callback data'
            });
        }

        const checkoutRequestID = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;

        // Find the sale by checkout request ID
        const sales = readSales();
        const saleIndex = sales.findIndex(s => s.mpesa_checkout_request_id === checkoutRequestID);

        if (saleIndex === -1) {
            console.error('Sale not found for checkout request:', checkoutRequestID);
            return res.json({
                ResultCode: 1,
                ResultDesc: 'Sale not found'
            });
        }

        // Check if already processed (prevent duplicate updates)
        if (sales[saleIndex].paymentStatus === 'PAID' || sales[saleIndex].paymentStatus === 'Paid') {
            console.log('Sale already paid, skipping duplicate update');
            return res.json({
                ResultCode: 0,
                ResultDesc: 'Success'
            });
        }

        if (resultCode === 0) {
            // Payment successful - extract metadata
            const callbackMetadata = stkCallback.CallbackMetadata ? .Item || [];

            let mpesaReceiptNumber = '';
            let amount = 0;
            let phoneNumber = '';

            // Extract values from callback metadata
            callbackMetadata.forEach(item => {
                if (item.Name === 'MpesaReceiptNumber') {
                    mpesaReceiptNumber = item.Value;
                } else if (item.Name === 'Amount') {
                    amount = item.Value;
                } else if (item.Name === 'PhoneNumber') {
                    phoneNumber = item.Value;
                }
            });

            // Update sale with payment confirmation
            sales[saleIndex].paymentStatus = 'PAID';
            sales[saleIndex].mpesa_receipt = mpesaReceiptNumber;
            sales[saleIndex].mpesa_payment_date = new Date().toISOString();

            // Update phone number if not already set
            if (!sales[saleIndex].phone_number && phoneNumber) {
                sales[saleIndex].phone_number = phoneNumber;
            }

            writeSales(sales);

            console.log(`Payment confirmed for sale #${sales[saleIndex].id}. Receipt: ${mpesaReceiptNumber}`);
        } else {
            // Payment failed or cancelled
            console.log(`Payment ${resultDesc} for sale #${sales[saleIndex].id}`);
            sales[saleIndex].paymentStatus = 'PENDING';
            sales[saleIndex].mpesa_error = resultDesc;
            writeSales(sales);
        }

        // Return success to Safaricom
        res.json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });

    } catch (error) {
        console.error('Callback processing error:', error);
        res.json({
            ResultCode: 1,
            ResultDesc: 'Internal server error'
        });
    }
});

/**
 * Check Payment Status
 * 
 * Allows the frontend to check the payment status of a specific sale.
 * Useful for polling after initiating an STK Push.
 * Requires authentication.
 */
router.get('/status/:sale_id', requireAuth, async (req, res) => {
    try {
        const saleId = parseInt(req.params.sale_id);
        const sales = readSales();
        const sale = sales.find(s => s.id === saleId);

        if (!sale) {
            return res.status(404).json({
                error: 'Sale not found'
            });
        }

        res.json({
            sale_id: sale.id,
            payment_status: sale.paymentStatus,
            mpesa_receipt: sale.mpesa_receipt || null,
            checkout_request_id: sale.mpesa_checkout_request_id || null
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to check payment status'
        });
    }
});

/**
 * Manual Payment Marking
 * 
 * Allows the seller to manually mark a sale as paid without M-Pesa.
 * Useful when the customer pays in cash or provides M-Pesa confirmation message.
 * Requires authentication.
 */
router.post('/manual-pay', requireAuth, async (req, res) => {
    try {
        const {
            sale_id,
            mpesa_receipt
        } = req.body;

        // Input Validation
        if (!sale_id || !mpesa_receipt) {
            return res.status(400).json({
                error: 'Missing required fields: sale_id, mpesa_receipt'
            });
        }

        const sales = readSales();
        const saleIndex = sales.findIndex(s => s.id === parseInt(sale_id));

        if (saleIndex === -1) {
            return res.status(404).json({
                error: 'Sale not found'
            });
        }

        // Check if already paid (prevent duplicate updates)
        if (sales[saleIndex].paymentStatus === 'PAID' || sales[saleIndex].paymentStatus === 'Paid') {
            return res.status(400).json({
                error: 'This sale is already paid'
            });
        }

        // Update sale manually
        sales[saleIndex].paymentStatus = 'PAID';
        sales[saleIndex].mpesa_receipt = mpesa_receipt.trim();
        sales[saleIndex].manual_payment = true;
        sales[saleIndex].manual_payment_date = new Date().toISOString();

        writeSales(sales);

        res.json({
            success: true,
            message: 'Sale marked as paid successfully',
            sale: sales[saleIndex]
        });

    } catch (error) {
        console.error('Manual payment error:', error);
        res.status(500).json({
            error: 'Failed to mark payment as paid'
        });
    }
});
module.exports = router;