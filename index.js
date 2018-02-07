"use strict";

const Discord = require("discord.js");
const natsuki = new Discord.Client();

natsuki.on("message", message =>
{
	if (message.content == "n.ping")
		message.reply("pong!");
});

natsuki.login(process.env.TOKEN);
