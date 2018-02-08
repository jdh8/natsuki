"use strict";

const manual = require("./manual.json");

function sleep(duration)
{
	return new Promise(resolve => setTimeout(resolve, duration));
}

const natsuki =
{
// Core
	help(message)
	{
		const command = /\S*/.exec(message.content);

		message.channel.send(manual[command] || `The command \`${command}\` is not found.`);
	},

	invite(message)
	{
		message.channel.send("https://discordapp.com/oauth2/authorize?&client_id=410315411695992833&scope=bot&permissions=0");
	},

	ping(message)
	{
		message.reply("pong!");
	},

// Fun
	beat(message)
	{
		message.channel.send(`**I'll beat the shit out of ${message.content || "my dad"}.**`);
	},

	cute(message)
	{
		const append = string => async message =>
		{
			await sleep(2000 + 3000 * Math.random());
			return await message.edit(message.content + string);
		}

		message.reply("don't say this embarassing thing, dummy!")
			.then(append("\nY-You t-too...."))
			.then(append("\nI'M NOT CUUUUUUUUUUUTE!"))
			.then(append("\nDon't think you can make me say this embarassing thing just because we're not at school!"))
			.then(append("\nI-I have to go to the bathroom."));
	},

	nut(message)
	{
		message.channel.send(`${message.author} nuts on ${message.content || "the floor"}.\n**You guys are so gross!**`);
	},

	shelf(message)
	{
		const user = message.mentions.users.first() || message.author;

		message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
	},

// Information
	repo(message)
	{
		message.channel.send("https://github.com/yurigang/natsuki");
	},
};

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("message", message =>
{
	const match = /^n\.(\S*)\s*(.*)/.exec(message.content);

	if (match) {
		message.content = match[2];
		(natsuki[match[1]] || (() => {}))(message);
	}
});

client.login(process.env.TOKEN);
