import Discord from "discord.js";

const manager = new Discord.ShardingManager("./src/client.mjs", { mode: "worker", token: process.env.TOKEN });

manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
