import client from "./client.mjs"
import TopGG from "dblapi.js";

const topgg = new TopGG(process.env.TOP_GG_TOKEN, client);

topgg.on("error", console.error);

export default topgg;
