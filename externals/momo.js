import axios from 'axios';
import crypto from 'crypto';
import { momoUrl } from '../helpers/constants.js';
// https://developers.momo.vn/v3/vi/docs/payment/onboarding/test-instructions/
export const generateOrderId = () => {
    return process.env.MOMO_PARTNER_CODE + new Date().getTime();
}

export const createTransaction = async (orderId, orderAmount, orderDescription) => {
    const momoAccessKey = process.env.MOMO_ACCESS_KEY;
    const momoSecretKey = process.env.MOMO_SECRET_KEY;
    const momoApiDomain = process.env.MOMO_API_DOMAIN;
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = momoAccessKey;
    const secretkey = momoSecretKey;
    const requestId = orderId
    const orderInfo = orderDescription;
    const redirectUrl = process.env.MOMO_RETURN_URL;
    const ipnUrl = "https://callback.url/notify";
    const amount = orderAmount;
    const requestType = "captureWallet";
    const extraData = ""; // Pass empty value if no additional data
  
    // Generate the raw signature string
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    console.log("RAW SIGNATURE:", rawSignature);
  
    // Generate the HMAC SHA256 signature
    const signature = crypto.createHmac('sha256', secretkey)
        .update(rawSignature)
        .digest('hex');
    console.log("SIGNATURE:", signature);
  
    // Create the request payload
    const requestBody = JSON.stringify({
        partnerCode: partnerCode,
        accessKey: accessKey,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        extraData: extraData,
        requestType: requestType,
        signature: signature,
        lang: 'en'
    });
  
    try {
        const response = await axios.post(`${momoApiDomain}${momoUrl.CREATE_TRANSACTION}`, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (response.status !== 200) {
            throw new Error()
        }
        return {
            orderId: response.data.orderId,
            requestId: response.data.requestId,
            payUrl: response.data.payUrl
        }
    } catch (error) {
        console.log(error)
        throw new Error();
    }
}
//https://www.momo.vn/return?partnerCode=MOMO&orderId=MOMO1731137931267&requestId=MOMO1731137931267&amount=1000&orderInfo=undefined+n%E1%BA%A1p+ti%E1%BB%81n+v%C3%A0o+t%C3%A0i+kho%E1%BA%A3n&orderType=momo_wallet&transId=4225107942&resultCode=0&message=Successful.&payType=qr&responseTime=1731137968770&extraData=&signature=2068ac90836a9aacdefd4995b58ed03f0b1f1d27046b7ca371b92175bb5437a6
export const verifySignature = (data, signature) => {
    const momoAccessKey = process.env.MOMO_ACCESS_KEY;
    const momoSecretKey = process.env.MOMO_SECRET_KEY;
    const rawSignature = `accessKey=${momoAccessKey}&amount=${data.amount}&extraData=${data.extraData}`
        + `&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}`
        + `&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}`
        + `&requestId=${data.requestId}&responseTime=${data.responseTime}`
        + `&resultCode=${data.resultCode}&transId=${data.transId}`;

    // Step 2: Create HMAC SHA-256 hash
    const hash = crypto.createHmac('sha256', momoSecretKey)
        .update(rawSignature)
        .digest('hex');

    // Step 3: Compare generated hash with provided signature
    return hash === signature;
}

export const isSuccess = (resultCode) => {
    return String(resultCode) === "0"
}