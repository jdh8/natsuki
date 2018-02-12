"use strict";

const manual = require("./manual.json");

const append = string => message => message.edit(message.content + string);

const sleep = duration => x => new Promise(resolve => setTimeout(resolve, duration)).then(() => x);

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
		const tick = Date.now();

		message.reply("pong!").then(message => message.edit(`${message.content} ${Date.now() - tick} ms`));
	},

	support(message)
	{
		message.channel.send("Looking for support?  Natsuki is free and open-source software.  Report issues or even contribute to our GitHub repository!\nhttps://github.com/yurigang/natsuki");
	},

// Fun
	beat(message)
	{
		message.channel.send(`<:buffsuki:403658386723307521> **I'll beat the shit out of ${message.content || "my dad"}.**`);
	},

	cute(message)
	{
		message.reply("don't say this embarassing thing, dummy!")
			.then(sleep(3000)).then(append("\nY-You t-too...."))
			.then(sleep(2000)).then(append("\nI'M NOT CUUUUUUUUUUUTE!"))
			.then(sleep(2000)).then(append("\nDon't think you can make me say this embarassing thing just because we're not at school!"))
			.then(sleep(4000)).then(append("\nI-I have to go to the bathroom."));
	},

	nut(message)
	{
		message.channel.send(`${message.author} nuts on ${message.content || "the floor"}.\n<:pukesuki:405984820674428928> **You guys are so gross!**`);
	},

	shelf(message)
	{
		const user = message.mentions.users.first() || message.author;

		message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
	},
};

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | https://github.com/yurigang/natsuki" }}));

client.on("message", message =>
{
	const match = /^n\.(\S*)\s*(.*)/.exec(message.content);

	if (match) {
		message.content = match[2];
		(natsuki[match[1]] || (() => {}))(message);
	}
});

client.login(process.env.TOKEN);
