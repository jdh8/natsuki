"use strict";

const manual = require("./manual.json");

const natsuki =
{
	ping() { return "Pong!"; },
	repo() { return "https://github.com/yurigang/natsuki"; },
	eval(message) { return eval(message.content); },
	help(message) { return manual[/\S*/.exec(message.content)] || manual[""]; },
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
