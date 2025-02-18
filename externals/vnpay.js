import crypto from "crypto";
import querystring from 'qs'

export const generateOrderId = () => {
  return process.env.VNPAY_PARTNER_CODE + new Date().getTime();
};

export const createTransaction = async (
  orderId,
  orderAmount,
  orderDescription
) => {
  let vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = process.env.VNPAY_TMNCODE;
  vnp_Params["vnp_Locale"] = "vn";
  vnp_Params["vnp_CurrCode"] = "VND";
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = encodeURIComponent(orderDescription).replace(/%20/g, '+');
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = orderAmount * 100;
  vnp_Params["vnp_ReturnUrl"] = encodeURIComponent(process.env.VNPAY_RETURN_URL);
  vnp_Params["vnp_IpAddr"] = encodeURIComponent("127.0.0.1");
  vnp_Params["vnp_CreateDate"] = getVnpayDate();

  vnp_Params = sortObject(vnp_Params);

  const rawSignature = querystring.stringify(vnp_Params, { encode: false });
  
  // `vnp_Amount=${orderAmount}&vnp_Command=pay&vnp_CreateDate=${getVnpayDate()}&vnp_CurrCode=VND&vnp_IpAddr=%3A%3A1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+cho+ma+GD%3A10224404&vnp_OrderType=other&vnp_ReturnUrl=${encodeURIComponent(process.env.VNPAY_RETURN_URL)}&vnp_TmnCode=${process.env.VNPAY_TMNCODE}&vnp_TxnRef=${orderId}&vnp_Version=2.1.0`;
  console.log("RAW SIGNATURE:", rawSignature);
  const signature = crypto
    .createHmac("sha512", process.env.VNPAY_HASHSECRET)
    .update(Buffer.from(rawSignature, 'utf-8')).digest("hex");
    console.log("SIGNATURE:", signature);
    vnp_Params['vnp_SecureHash'] = signature;
  return {
    orderId: orderId,
    requestId: orderId,
    payUrl: `${process.env.VNPAY_API_DOMAIN}?${querystring.stringify(vnp_Params, { encode: false })}`
  }
};
// 9704198526191432198
// NGUYEN VAN A
// 07/15 123456
export const verifySignature = (data, signature) => {  
  const vnp_Params = sortObject(data);
  const rawSignature = querystring.stringify(vnp_Params, { encode: false });
  console.log("RAW SIGNATURE:", rawSignature);

  const hash = crypto
    .createHmac("sha512", process.env.VNPAY_HASHSECRET)
    .update(Buffer.from(rawSignature, 'utf-8')).digest("hex");
  return hash === signature;
};

export const isSuccess = (resultCode) => {
  return String(resultCode) === "00";
};

function getVnpayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
      sorted[key] = obj[key];
  });
  return sorted;
}