"use strict";

const Discord = require("discord.js");
const Jimp = require("jimp");

const manual = require("./manual.json");
const poetry = require("./poetry.json");

const client = new Discord.Client();

const PoemListener = (f, message, author) =>
{
	const timer = setTimeout(() =>
	{
		client.removeListener("messageReactionAdd", result);
		message.channel.send(author + ", you didn't answer.");
	}, 20000);

	const result = (reaction, user) =>
	{
		if (reaction.message.id == message.id && user.id == author.id) {
			clearTimeout(timer);
			client.removeListener("messageReactionAdd", result);
			message.channel.send(f(reaction.emoji.id));
		}
	};

	return result;
};

const resolve = (collection, x) => collection.get(x) || collection.find("name", x);

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

	poem(message)
	{
		const f = [ natsuki.poem1, natsuki.poem2, natsuki.poem3 ][(!message.content | message.content) - 1];

		if (f)
			f(message);
		else
			message.reply("you input an invalid act.");
	},

	poem1(message)
	{
		const pick = array => array[~~(array.length * Math.random())];
		const word = pick(Object.keys(poetry));

		const sayori = "413123702788718593";
		const natsuki = "413125818059849728";
		const yuri = "405392894787059732";
		const monika = "414572706370027533";

		const answer = [ natsuki, sayori, yuri, sayori ][poetry[word]];

		const reply = emoticon =>
		{
			switch (emoticon) {
				case answer:
					return `Congrats, ${message.author}!  That's correct.`;
				case monika:
					return "Really?";
				default:
					return message.author + ", you didn't get it.";
			}
		};

		message.reply(`whose word is **${word}**?  Please answer in 20 seconds.`).then(async question =>
		{
			client.on("messageReactionAdd", PoemListener(reply, question, message.author));

			await question.react(client.emojis.get(sayori));
			await question.react(client.emojis.get(natsuki));
			await question.react(client.emojis.get(yuri));
			await question.react(client.emojis.get(monika));
		});
	},

	poem2(message)
	{
		const pick = array => array[~~(array.length * Math.random())];
		const word = pick(Object.keys(poetry));

		const natsuki = "413125818059849728";
		const yuri = "405392891490598913";
		const monika = "405977244952166400";

		const answer = [ natsuki, yuri ][poetry[word] >> 1];

		const reply = emoticon =>
		{
			switch (emoticon) {
				case answer:
					return `Congrats, ${message.author}!  That's correct.`;
				case monika:
					return "Really?";
				default:
					return message.author + ", you didn't get it.";
			}
		};

		message.reply(`whose word is **${word}**?  Please answer in 20 seconds.`).then(async question =>
		{
			client.on("messageReactionAdd", PoemListener(reply, question, message.author));

			await question.react(client.emojis.get(natsuki));
			await question.react(client.emojis.get(yuri));
			await question.react(client.emojis.get(monika));
		});
	},

	poem3(message)
	{
		message.reply("whose word is **Monika**?  Please answer in 20 seconds.").then(async question =>
		{
			client.on("messageReactionAdd", PoemListener(x => "Just Monika", question, message.author));

			await question.react(client.emojis.get("414572706370027533"));
			await question.react(client.emojis.get("405977244952166400"));
		});
	},

	shelf(message)
	{
		const user = message.mentions.users.first() || message.author;

		message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
	},

	word(message)
	{
		message.channel.send("🇳\u200B🇮🅱🅱🅰");
	},

// Tools
	emojis(message)
	{
		const guild = message.content ? resolve(client.guilds, message.content) : client;

		if (guild == null)
			return message.channel.send(`The guild \`${message.content}\` is not found.`);

		if (guild.emojis.size == 0)
			return message.channel.send("This guild has no custom emoticons.");

		message.channel.send(guild.emojis.map(icon => `\`${icon.id}\` ${icon.name} ${icon}`).join("\n"), { split: true });
	},

	guilds(message)
	{
		message.channel.send(client.guilds.map(guild => `\`${guild.id}\` ${guild.name}`).join("\n"), { split: true });
	},

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

	servers(message)
	{
		natsuki.guilds(message);
	},
};

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | n.invite" }}));

client.on("message", message =>
{
	const match = message.channel instanceof Discord.TextChannel && /^n\.(\S*)\s*([^]*)/.exec(message.content);

	if (match) {
		message.content = match[2];
		(natsuki[match[1]] || (() => {}))(message);
	}
});

client.login(process.env.TOKEN);
