"use strict";

const Discord = require("discord.js");
const Jimp = require("jimp");

const manual = require("./manual.json");
const poetry = require("./poetry.json");

const client = new Discord.Client();

const natsuki =
{
// Core
	help(message, content)
	{
		const command = /\S*/.exec(content);

		return message.channel.send(manual[command] || `The command \`${command}\` is not found.`);
	},

	invite(message)
	{
		return message.channel.send("https://discordapp.com/oauth2/authorize?&client_id=410315411695992833&scope=bot&permissions=0");
	},

	ping(message, content)
	{
		const tick = Date.now();

		return message.reply("pong!").then(message => message.edit(`${message.content} ${Date.now() - tick} ms`));
	},

	support(message)
	{
		return message.channel.send(`I am developed by <@406911726638989313> from Yuri Gang.  I have no dedicated guild, so join Yuri Gang to discuss me and everything.  They are cool people and accept non-Yurists.  Actually, I am conceived by <@374000350363123712>, the biggest Natsuki fan of Yuri Gang.
https://discord.gg/ftdYR75

I am free and open-source software.  Here comes my repository.  ~~Use the source, Luke!~~
https://github.com/yurigang/natsuki`);
	},

// Fun
	beat(message, content)
	{
		return message.channel.send(`<:buffsuki:403658386723307521> **I'll beat the shit out of ${content || "my dad"}.**`);
	},

	cupcake(message)
	{
		const user = message.mentions.users.first() || message.author;
		const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
		const image = Jimp.read("assets/290px-Hostess-Cupcake-Whole.jpg");
		const avatar = Jimp.read(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`);

		return image.then(async image => image.composite(await avatar, 80, 80).getBuffer("image/png",
			(error, buffer) => message.channel.send(text, new Discord.Attachment(buffer, "cupcake.png"))));
	},

	cute(message, content)
	{
		const append = (duration, string) => async message =>
		{
			await new Promise(resolve => setTimeout(resolve, duration));
			return message.edit(message.content + string);
		}

		return message.reply("don't say this embarassing thing, dummy!")
			.then(append(3000, "\nY-You t-too...."))
			.then(append(2000, "\nI'M NOT CUUUUUUUUUUUTE!"))
			.then(append(2000, "\nDon't think you can make me say this embarassing thing just because we're not at school!"))
			.then(append(4000, "\nI-I have to go to the bathroom."));
	},

	hug(message, content)
	{
		return message.channel.send(`${message.author} hugged ${content || "Yuri"}!
https://cdn.discordapp.com/attachments/403697175948820481/413015715273113601/Nxdr0qO_1.jpg`);
	},

	kiss(message, content)
	{
		return message.channel.send(`${message.author} kissed ${content || "Natsuki"}!
https://cdn.discordapp.com/attachments/403697175948820481/413015676488515586/tumblr_inline_p2j9lgKnBS1ujm7ol_540.jpg`);
	},

	nut(message, content)
	{
		return message.channel.send(`${message.author} nuts on ${content || "the floor"}.
<:pukesuki:405984820674428928> **You guys are so gross!**`);
	},

	poem(message, content)
	{
		const f = [ natsuki.poem1, natsuki.poem2, natsuki.poem3 ][(!content | content) - 1];

		return f ? f(message) : message.reply("you input an invalid act.");
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

		return message.reply(`whose word is **${word}**?  Please answer in 15 seconds.`).then(async response =>
		{
			const filter = (reaction, user) => user.id == message.author.id;
			const collector = response.createReactionCollector(filter, { time: 15000 });

			collector.on("collect", reaction =>
			{
				collector.stop();

				switch (reaction.emoji.id) {
					case answer: return message.reply("that's correct.  Congrats!");
					case monika: return message.channel.send("Really?");
					default: return message.reply("you didn't get it.");
				}
			});

			collector.on("end", (collection, reason) => reason == "time" && message.reply("you didn't answer."));

			await response.react(client.emojis.get(sayori));
			await response.react(client.emojis.get(natsuki));
			await response.react(client.emojis.get(yuri));
			await response.react(client.emojis.get(monika));
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

		return message.reply(`whose word is **${word}**?  Please answer in 15 seconds.`).then(async response =>
		{
			const filter = (reaction, user) => user.id == message.author.id;
			const collector = response.createReactionCollector(filter, { time: 15000 });

			collector.on("collect", reaction =>
			{
				collector.stop();

				switch (reaction.emoji.id) {
					case answer: return message.reply("that's correct.  Congrats!");
					case monika: return message.channel.send("Really?");
					default: return message.reply("you didn't get it.");
				}
			});

			collector.on("end", (collection, reason) => reason == "time" && message.reply("you didn't answer."));

			await response.react(client.emojis.get(natsuki));
			await response.react(client.emojis.get(yuri));
			await response.react(client.emojis.get(monika));
		});
	},

	poem3(message)
	{
		return message.reply("whose word is **Monika**?  Please answer in 15 seconds.").then(async response =>
		{
			const filter = (reaction, user) => user.id == message.author.id;
			const collector = response.createReactionCollector(filter, { time: 15000 });

			collector.on("collect", () =>
			{
				collector.stop();
				message.channel.send("Just Monika");
			});

			collector.on("end", (collection, reason) => reason == "time" && message.reply("you didn't answer."));

			await response.react(client.emojis.get("414572706370027533"));
			await response.react(client.emojis.get("405977244952166400"));
		});
	},

	shelf(message)
	{
		const user = message.mentions.users.first() || message.author;

		return message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
	},

	ship(message, content)
	{
		const mentions = content.match(/<(?:#|@[!&]?)\d+>|@(?:everyone|here)/g);
		const shipping = !mentions || mentions.length < 2 ?
			`${message.author} × ${content || client.user}` :
			mentions.join(" × ");

		return message.channel.send(`Look at them, a lovey dovey couple!  I ship it!
${shipping}
N-not that I c-care...`)
	},

	word(message)
	{
		return message.channel.send("🇳\u200B🇮🅱🅱🅰");
	},

// Tools
	echo(message, content)
	{
		const f = (match, name) => name && client.emojis.find("name", name) || match;
		const text = content.replace(/<a?:\w*:\d*>|:(\w*):/g, f);

		return text ? message.channel.send(text) :
			message.reply("I cannot send an empty message.  Please give me something to say.");
	},

	emoji(message, content)
	{
		const respond = (match, id, name) =>
		{
			const emoji = id ? client.emojis.get(id) : client.emojis.find("name", name || match);
			return emoji ? emoji.url : match ? `The custom emoji ${match} is not found.` : "Please specify a custom emoji.";
		}

		return message.channel.send(respond(.../<a?:\w+:(\d+)>|:(\w+):|\S*/.exec(content)));
	},

	emojis(message, content)
	{
		const guild = content ? client.guilds.get(content) || client.guilds.find("name", content) : client;

		if (guild == null)
			return message.channel.send(`The guild \`${content}\` is not found.`);

		if (guild.emojis.size == 0)
			return message.channel.send("This guild has no custom emojis.");

		return message.channel.send(guild.emojis.map(icon => `\`${icon.id}\` ${icon.name} ${icon}`), { split: true });
	},

	guilds(message)
	{
		return message.channel.send(client.guilds.map(guild => `\`${guild.id}\` ${guild.name}`), { split: true });
	},

	async poll(message, content)
	{
		const choices = content.split(/\s*$/m, 1)[0].split(/\s*\|\s*/, 20);
		const length = choices.length;

		if (length > 1) {
			const option = (string, index) => String.fromCodePoint(0x1F1E6 + index) + " " + string;
			const reply = await message.channel.send(choices.map(option));

			for (let code = 0x1F1E6; code < 0x1F1E6 + length; ++code)
				await reply.react(String.fromCodePoint(code));

			return reply;
		}
		else if (content) {
			await message.react("👍");
			await message.react("👎");
			return message;
		}
		else {
			return message.reply("please provide a topic.");
		}
	},

	react(message, content)
	{
		const list = content.replace(/<a?:\w*:(\d*)>/g, "$1 ").match(/\S+/g);

		if (list == null)
			return message.channel.send("Please specify id of the message.");

		const id = list.shift();

		const target = id <= 0 ?
			message.channel.fetchMessages({ limit: 1 - id }).then(collection => collection.last()) :
			message.channel.fetchMessage(id);

		return target.then(async target =>
		{
			const resolve = x => x[0].toLowerCase() == x[0].toUpperCase() ? x : client.emojis.find("name", x);
			const errors = [];

			if (list.length == 0)
				return message.channel.send("Please specify emojis to react.");

			for (let k = 0; k < list.length; ++k) {
				const emoji = resolve(list[k]);
				emoji ? await target.react(emoji) : errors.push(list[k]);
			}

			switch (errors.length) {
				case 0:
					return message;
				case 1:
					return message.channel.send(`Emoji ${errors[0]} was not found.`);
				case 2:
					return message.channel.send(`Emojis ${errors[0]} and ${errors[1]} were not found.`);
				default:
					const last = errors.pop();
					return message.channel.send(`Emojis ${errors.join(", ")}, and ${last} were not found.`);
			}
		}).catch(error =>
		{
			const content =
			{
				"Unknown Message": `The message with id ${id} was not found.`,
				"Invalid Form Body\nlimit: int value should be less than or equal to 100.": "I can only trace back 100 messages, oof!",
				[`Invalid Form Body
message_id: Value "${id}" is not snowflake.`]: `${id} is not a message id, which is a positive integer`,
			}[error.message];

			if (!content) throw error;

			return message.channel.send(content);
		});
	},

	say(message, content)
	{
		return natsuki.echo(message, content);
	},

	servers(message)
	{
		return natsuki.guilds(message);
	},
};

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | n.invite" }}));

client.on("message", message =>
{
	const match = message.channel instanceof Discord.TextChannel && /^n\.(\S*)\s*([^]*)/.exec(message.content);
	const f = match && !Object.prototype[match[1]] && natsuki[match[1]];
	const promise = f && f(message, match[2]);

	process.env.LOGGER && promise &&
		promise.catch(error => client.channels.get(process.env.LOGGER).send(error + "\nCause: " + message.content));
});

client.login(process.env.TOKEN);
