// import DerivAPIBasic from 'https://cdn.skypack.dev/@deriv/deriv-api/dist/DerivAPIBasic';
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';

const app_id = 40003; // Replace with your app_id or leave as 1089 for testing.
export const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);
export const api2 = new DerivAPIBasic({ connection });
