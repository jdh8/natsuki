"use strict";

const manual = require("./manual.json");

const natsuki =
{
// Core
	help(message)
	{
		const command = /\S*/.exec(message.content);
		return manual[command] || `The command \`${command}\` is not found.`;
	},

	invite()
	{
		return "https://discordapp.com/oauth2/authorize?&client_id=410315411695992833&scope=bot&permissions=0";
	},

	ping(message)
	{
		message.reply("pong!");
	},

// Fun
	beat(message)
	{
		return "**I'll beat the shit out of " + (message.content || "my dad") + ".**";
	},

	nut(message)
	{
		return message.author + " nuts on " + (message.content || "the floor")
			+ ".\n**You guys are so gross!**";
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
