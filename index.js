"use strict";

const natsuki =
{
	ping(message) { message.reply("pong!"); }
};

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("message", message =>
{
	const match = /^n\.(\S*)\s*(.*)/.exec(message.content);

	if (match) {
		const callback = natsuki[match[1]];

		if (callback)
			callback(message, match[2]);
	}
});

client.login(process.env.TOKEN);
