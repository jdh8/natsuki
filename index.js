"use strict";

const manual = require("./manual.json");

const natsuki =
{
// Core
	ping(message)
	{
		message.reply("pong!");
	},

	help(message)
	{
		const command = /\S*/.exec(message.content);
		return manual[command] || `The command \`${command}\` is not found.`;
	},

// Utilities
	eval(message)
	{
		return eval(message.content);
	},

// Information
	repo()
	{
		return "https://github.com/yurigang/natsuki";
	},
};

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("message", message =>
{
	const match = /^n\.(\S*)\s*(.*)/.exec(message.content);

	if (match) {
		const callback = natsuki[match[1]];

		message.content = match[2];

		if (callback)
			message.channel.send(callback(message));
	}
});

client.login(process.env.TOKEN);
