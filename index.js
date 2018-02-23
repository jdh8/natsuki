"use strict";

const Discord = require("discord.js");
const Jimp = require("jimp");

const manual = require("./manual.json");

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

	cupcake(message)
	{
		const user = message.mentions.users.first() || message.author;
		const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
		const image = Jimp.read("assets/290px-Hostess-Cupcake-Whole.jpg");
		const avatar = Jimp.read(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`);

		image.then(async image => image.composite(await avatar, 80, 80).getBuffer("image/png", (error, buffer) =>
			message.channel.send(text, new Discord.Attachment(buffer, "cupcake.png"))));
	},

	cute(message)
	{
		const append = (duration, string) => async message =>
		{
			await new Promise(resolve => setTimeout(resolve, duration));
			return message.edit(message.content + string);
		}

		message.reply("don't say this embarassing thing, dummy!")
			.then(append(3000, "\nY-You t-too...."))
			.then(append(2000, "\nI'M NOT CUUUUUUUUUUUTE!"))
			.then(append(2000, "\nDon't think you can make me say this embarassing thing just because we're not at school!"))
			.then(append(4000, "\nI-I have to go to the bathroom."));
	},

	hug(message)
	{
		message.channel.send(`${message.author} hugged ${message.content || "Yuri"}!
https://cdn.discordapp.com/attachments/403697175948820481/413015715273113601/Nxdr0qO_1.jpg`);
	},

	kiss(message)
	{
		message.channel.send(`${message.author} kissed ${message.content || "Natsuki"}!
https://cdn.discordapp.com/attachments/403697175948820481/413015676488515586/tumblr_inline_p2j9lgKnBS1ujm7ol_540.jpg`);
	},

	nut(message)
	{
		message.channel.send(`${message.author} nuts on ${message.content || "the floor"}.
<:pukesuki:405984820674428928> **You guys are so gross!**`);
	},

	shelf(message)
	{
		const user = message.mentions.users.first() || message.author;

		message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
	},

// Tools
	async poll(message)
	{
		const choices = message.content.split(/\s*$/m, 1)[0].split(/\s*\|\s*/, 20);
		const length = choices.length;

		if (length > 1) {
			const option = (string, index) => String.fromCodePoint(0x1F1E6 + index) + " " + string;
			const reply = await message.channel.send(choices.map(option).join("\n"));

			for (let code = 0x1F1E6; code < 0x1F1E6 + length; ++code)
				await reply.react(String.fromCodePoint(code));
		}
		else if (message.content) {
			await message.react("👍");
			await message.react("👎");
		}
		else {
			message.reply("please provide a topic.");
		}
	},
};

const client = new Discord.Client();

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | n.invite" }}));

client.on("message", message =>
{
	const match = /^n\.(\S*)\s*([^]*)/.exec(message.content);

	if (match) {
		message.content = match[2];
		(natsuki[match[1]] || (() => {}))(message);
	}
	else if (message.content == client.user) {
		message.channel.send("https://store.teamsalvato.com/product/ddlc-poster-natsuki-11x17/");
	}
});

client.login(process.env.TOKEN);
