import Discord from "discord.js";
import Jimp from "jimp";
import pngjs from "pngjs";

import crypto from "crypto";

import kisses from "./data/kisses.json";
import manual from "./data/manual.json";
import poetry from "./data/poetry.json";

const pfp = user => `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`;
const robot = user => `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

const pick = array => array[~~(array.length * Math.random())];

/******* Core *******/
export const help = (message, content) =>
{
	const command = /\S*/.exec(content);
	return message.channel.send(manual[command] || `The command \`${command}\` is not found.`);
};

export const invite = message =>
	message.channel.send("https://discordapp.com/oauth2/authorize?&client_id=410315411695992833&scope=bot");

export const ping = (message, content) =>
{
	const format = (seconds, nano) => seconds ? `${(seconds + 1e-9 * nano).toFixed(3)} s` : `${(1e-6 * nano).toFixed()} ms`;
	const tick = process.hrtime();

	return message.reply("pong!").then(message => message.edit(`${message.content} ${format(...process.hrtime(tick))}`));
};

export const stats = message =>
{
	const { client } = message;
	return message.channel.send(`I'm in ${client.guilds.size} servers with ${client.users.size} users in total.`);
}

export const support = message =>
	message.channel.send(`Stuck in a trouble?  Find you way to Natsuki's shelf, my support guild.
https://discord.gg/VdHYvMC

I am free and open-source software.  Here comes my repository.  ~~Use the source, Luke!~~
https://github.com/jdh8/natsuki`);

/******* Fun *******/
export const beat = (message, content) =>
	message.channel.send(`<:Buffsuki:419995508443054080> **I'll beat the shit out of ${content || "my dad"}.**`);

export const bunny = (message, content) =>
	message.channel.send(`(\\\\__/)
( • - •)
/つ ${content || " つ"}`);

export const cupcake = async message =>
{
	const buffer = stream => new Promise((resolve, reject) =>
	{
		const buffers = [];
		stream.on("error", reject);
		stream.on("data", data => buffers.push(data));
		stream.on("end", () => resolve(Buffer.concat(buffers)));
	});

	const avatar = async user => user.avatar ? await Jimp.read(pfp(user)) : (await Jimp.read(robot(user))).scale(0.5);
	const user = message.mentions.users.first() || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = Jimp.read("assets/290px-Hostess-Cupcake-Whole.jpg");

	message.channel.startTyping();

	try {
		const bitmap = (await image).composite(await avatar(user), 80, 80).bitmap;
		const png = new pngjs.PNG({ width: bitmap.width, height: bitmap.height });

		png.data = new Buffer(bitmap.data);

		return await message.channel.send(text, new Discord.Attachment(await buffer(png.pack()), "cupcake.png"));
	}
	finally {
		message.channel.stopTyping();
	}
};

export const cute = async (message, content) =>
{
	const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
	const reply = await message.reply("don't say this embarassing thing, dummy!");
	const append = string => reply.edit(`${reply.content}${string}`);

	message.channel.startTyping();

	try {
		await sleep(3000);
		await append("\nY-You t-too....");
		await sleep(2000);
		await append("\nI'M NOT CUUUUUUUUUUUTE!");
		await sleep(2000);
		await append("\nDon't think you can make me say this embarassing thing just because we're not at school!");
		await sleep(4000);
		await append("\nI-I have to go to the bathroom.");
	}
	finally {
		message.channel.stopTyping();
	}
};

export const hug = (message, content) =>
	message.channel.send(`${message.author} hugged ${content || "Yuri"}!
https://cdn.discordapp.com/attachments/403697175948820481/413015715273113601/Nxdr0qO_1.jpg`);

export const kiss = (message, content) =>
	message.channel.send(`${message.author} kissed ${content || "Natsuki"}!
${pick(kisses)}`);

export const lewd = message => message.channel.send("https://youtu.be/qr89xoZyE1g");

export const lick = (message, content) =>
	message.channel.send(`${message.author} licked ${content || "the air"}!
https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif`);

export const licc = lick;

export const nut = (message, content) =>
	message.channel.send(`${message.author} nuts on ${content || "the floor"}.
<:pukesuki:405984820674428928> **You guys are so gross!**`);

export const poem1 = message =>
{
	const word = pick(Object.keys(poetry));

	const sayori = "424991418386350081";
	const natsuki = "424991419329937428";
	const yuri = "424987242986078218";
	const monika = "424991419233730560";

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

		await response.react(sayori);
		await response.react(natsuki);
		await response.react(yuri);
		await response.react(monika);
	});
};

export const poem2 = message =>
{
	const word = pick(Object.keys(poetry));

	const natsuki = "423196976398729216";
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

		await response.react(natsuki);
		await response.react(yuri);
		await response.react(monika);
	});
};

export const poem3 = message => message.reply("whose word is **Monika**?  Please answer in 15 seconds.").then(response =>
{
	const filter = (reaction, user) => user.id == message.author.id;
	const collector = response.createReactionCollector(filter, { time: 15000 });

	collector.on("collect", () =>
	{
		collector.stop();
		message.channel.send("Just Monika");
	});

	collector.on("end", (collection, reason) => reason == "time" && message.reply("you didn't answer."));

	response.react("416428171705974785");
});

export const poem = (message, content) =>
{
	const f = [ poem1, poem2, poem3 ][(!content | content) - 1];
	return f ? f(message) : message.reply("you input an invalid act.");
};

export const rate = (message, content) =>
{
	const data = content || `${message.author}`;
	const hash = new Uint32Array(crypto.createHash("md5").update(data.toLowerCase()).digest().buffer);
	const percentage = ((hash[0] + 24) >>> 0) % 101;

	return message.channel.send(`<:natsuki:424991419329937428> I'd give ${data} ${percentage}%.`);
};

export const shelf = message =>
{
	const user = message.mentions.users.first() || message.author;
	return message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
};

export const ship = (message, content) =>
{
	content = content.replace(/\s+&\s+/g, " × ");

	if (!/\s+×\s/.test(content))
		content = `${message.author} × ${content || message.client.user}`;

	return message.channel.send(`Look at them, a lovey dovey couple!  I ship it!
${content}
N-not that I c-care...`)
};

export const word = message => message.channel.send("🇳:regional_indicator_i:🅱🅱🅰");

/******* Tools *******/
export const avatar = message =>
{
	const user = message.mentions.users.first() || message.author;
	const url = user.avatar ? `${pfp(user)}${user.avatar.startsWith("a_") ? ".gif" : ""}?size=2048` : robot(user);

	return message.channel.send(url);
};

export const echo = (message, content) =>
{
	const f = (match, name) => name && message.client.emojis.find("name", name) || match;
	const text = content.replace(/<a?:\w*:\d*>|:(\w*):/g, f);
	const big = /^(?:<a?:\w+:\d+>\s*)+$/.test(text);

	return message.channel.send(big ? text : `${message.author}: ${text}`);
};

export const emoji = (message, content) =>
{
	const { emojis } = message.client;

	const respond = (match, id, name) =>
	{
		const emoji = id ? emojis.get(id) : emojis.find("name", name || match);
		return emoji ? emoji.url : match ? `The custom emoji ${match} is not found.` : "Please specify a custom emoji.";
	}

	return message.channel.send(respond(.../<a?:\w+:(\d+)>|:(\w+):|\S*/.exec(content)));
};

export const emojis = message =>
	message.channel.send(`The list of emojis is on <#420885744077504532> on Natsuki's shelf, my support server.  Please check them out there.
https://discord.gg/VdHYvMC`);

export const keycaps = (message, content) => message.channel.send(content.toUpperCase()
	.replace(/ /g, "\u2002")
	.replace(/[0-9*#]/g, "$&\u20E3")
	.replace(/[A-Z]/g, match => `${String.fromCodePoint(match.charCodeAt() + 0x1F1A5)}\xAD`));

export const poll = (message, content) =>
{
	const react = code => async message =>
	{
		for (let c = 0x1F1E6; c < code; ++c)
			await message.react(String.fromCodePoint(c)).catch(() => {});
		return message;
	}

	const prepend = (string, index) => `${String.fromCodePoint(0x1F1E6 + index)} ${string}`;
	const lines = content.split("\n", 21);

	if (lines.length > 1) {
		const topic = lines.shift();
		return message.channel.send([topic, ...lines.map(prepend)]).then(react(0x1F1E6 + lines.length));
	}

	const options = content.split(/\s+\|\s+/, 20);

	if (options.length > 1)
		return message.channel.send(options.map(prepend)).then(react(0x1F1E6 + options.length));

	const yesno = async message =>
	{
		await message.react("👍").catch(() => {});
		await message.react("👎").catch(() => {});
		return message;
	};

	return yesno(message);
};

export const react = (message, content) =>
{
	if (!content)
		return message.channel.send("Please specify id of the message and emojis to react.");

	const pattern = /\S+/g;
	const [ id ] = pattern.exec(content);

	const remainder = content.substr(pattern.lastIndex);
	let target;

	if (id <= -100)
		return message.reply("I can only trace back 100 messages, oof!");
	else if (id <= 0)
		target = message.channel.fetchMessages({ limit: 1 - id }).then(collection => collection.last());
	else if (/\D/.exec(id))
		return message.reply(`${id} is not a message id, which is a positive integer`);
	else
		target = message.channel.fetchMessage(id);

	return target.then(async target =>
	{
		const pattern = /<a?:\w*:(\d*)>|:(\w*):|\S+/g;
		const resolve = (match, id, name) => id || message.client.emojis.find("name", name || match) || match;
		const errors = [];
		let match;

		while (match = pattern.exec(remainder))
			await target.react(resolve(...match)).catch(() => errors.push(match[0]));

		switch (errors.length) {
			case 0:
				return (await message.channel.send("... ..- -.-. -.-. . ... ...")).delete(5000);
			case 1:
				return message.channel.send(`Emoji ${errors[0]} was not found.`);
			case 2:
				return message.channel.send(`Emojis ${errors[0]} and ${errors[1]} were not found.`);
			default:
				const last = errors.pop();
				return message.channel.send(`Emojis ${errors.join(", ")}, and ${last} were not found.`);
		}
	}).catch(() => message.channel.send(`The message with id ${id} was not found.`));
};

export const say = echo;
