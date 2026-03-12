import {KiteConnect} from "kiteconnect";

const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY
});

// Access token already generated
kite.setAccessToken(process.env.KITE_ACCESS_TOKEN);

export default kite;
