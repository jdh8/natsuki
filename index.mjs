import Discord from "discord.js";
import Jimp from "jimp";
import snekfetch from "snekfetch";
import xml2js from "xml2js";

import crypto from "crypto";
import util from "util";

import kisses from "./data/kisses.json";
import manual from "./data/manual.json";
import poetry from "./data/poetry.json";

const pfp = user => `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`;
const robot = user => `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

const pick = array => array[~~(array.length * Math.random())];

const success = "431825476898652160";
const failure = "431825476638474250";

const mentioned = content =>
{
	const match = /<@!?(\d+)>/.exec(content);
	return match && match[1];
};

const Image = (message, description, image) =>
	message.channel.send(new Discord.RichEmbed({ description: description }).setImage(image))
		.catch(() => message.channel.send(description + "\n" + image));

/******* Core *******/
export const help = (message, content) =>
{
	const command = /\S*/.exec(content);
	return message.channel.send(manual[command] || `The command \`${command}\` is not found.`);
};

export const git = message => message.channel.send("https://github.com/jdh8/natsuki");

export const hanako = message => message.channel.send(`Meet Hanako Ikezawa, the best grill from Katawa Shoujo!
https://discordapp.com/oauth2/authorize?client_id=414384608076103680&scope=bot&permissions=66186303`);

export const invite = message =>
	message.channel.send(`https://discordapp.com/oauth2/authorize?&client_id=${message.client.user.id}&scope=bot`);

export const ping = (message, content) =>
{
	const format = (seconds, nano) => seconds ? `${(seconds + 1e-9 * nano).toFixed(3)} s` : `${(1e-6 * nano).toFixed()} ms`;
	const tick = process.hrtime();

	return message.channel.send("Pong!").then(message => message.edit(`${message.content} ${format(...process.hrtime(tick))}`));
};

export const repo = git;
export const source = git;

export const support = message => message.channel.send("https://discord.gg/VdHYvMC");

export const vote = message => message.channel.send(`https://discordbots.org/bot/${message.client.user.id}`);

export const yuri = message => message.channel.send(`My development team originates from Yuri Gang.  There are cool people.
https://discord.gg/bZByhJf

Also, meet my best friend, Yuri!  ~~I love her although she has big boobs.~~
https://discordbots.org/bot/403715442201591818`);

/******* Fun *******/
export const beat = (message, content) =>
	message.channel.send(`<:buffsuki:436562981875089428> **I'll beat the shit out of ${content || "my dad"}.**`);

export const bunny = (message, content) =>
	message.channel.send(`(\\\\__/)
( • - •)
/つ ${content || " つ"}`);

export const cupcake = async (message, content) =>
{
	const avatar = async user => user.avatar ? await Jimp.read(pfp(user)) : (await Jimp.read(robot(user))).scale(0.5);
	const user = message.client.users.get(mentioned(content)) || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = Jimp.read("assets/290px-Hostess-Cupcake-Whole.jpg");

	message.channel.startTyping();

	try {
		const composed = (await image).composite(await avatar(user), 80, 80);
		const buffer = await util.promisify((...x) => composed.getBuffer(...x))("image/png");
		return message.channel.send(text, new Discord.Attachment(buffer, "cupcake.png"));
	}
	finally {
		message.channel.stopTyping();
	}
};

export const cute = async message =>
{
	const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
	let content = "Don't say this embarassing thing, dummy!";
	const reply = await message.channel.send(content);

	message.channel.startTyping();

	try {
		await sleep(3000);
		await reply.edit(content += "\nY-You t-too....");
		await sleep(2000);
		await reply.edit(content += "\nI'M NOT CUUUUUUUUUUUTE!");
		await sleep(2000);
		await reply.edit(content += "\nDon't think you can make me say this embarassing thing just because we're not at school!");
		await sleep(4000);
		await reply.edit(content += "\nI-I have to go to the bathroom.");
	}
	finally {
		message.channel.stopTyping();
	}
};

export const hug = (message, content) => Image(message,
	`${message.author} hugged ${content || "Yuri"}!`,
	"https://cdn.discordapp.com/attachments/403697175948820481/413015715273113601/Nxdr0qO_1.jpg");

export const kiss = (message, content) => Image(message,
	`${message.author} kissed ${content || "Natsuki"}!`,
	pick(kisses));

export const lewd = message => message.channel.send("https://youtu.be/qr89xoZyE1g");

export const lick = (message, content) => Image(message,
	`${message.author} licked ${content || "the air"}!`,
	"https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif");

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
	const initial = message.channel instanceof Discord.DMChannel ? "W" : "w";

	return message.reply(`${initial}hose word is **${word}**?  Please answer in 15 seconds.`).then(async response =>
	{
		const filter = (reaction, user) => user.id === message.author.id && reaction.me;
		const collector = response.createReactionCollector(filter, { time: 15000 });

		collector.on("collect", reaction =>
		{
			collector.stop();

			switch (reaction.emoji.id) {
				case answer: return response.react(success);
				case monika: return response.react("⁉");
				default: return response.react(failure);
			}
		});

		collector.on("end", (collection, reason) => reason == "time" && response.react(failure));

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
	const initial = message.channel instanceof Discord.DMChannel ? "W" : "w";

	return message.reply(`${initial}hose word is **${word}**?  Please answer in 15 seconds.`).then(async response =>
	{
		const filter = (reaction, user) => user.id === message.author.id && reaction.me;
		const collector = response.createReactionCollector(filter, { time: 15000 });

		collector.on("collect", reaction =>
		{
			collector.stop();

			switch (reaction.emoji.id) {
				case answer: return response.react(success);
				case monika: return response.react("⁉");
				default: return response.react(failure);
			}
		});

		collector.on("end", (collection, reason) => reason == "time" && response.react(failure));

		await response.react(natsuki);
		await response.react(yuri);
		await response.react(monika);
	});
};

export const poem3 = message =>
{
	const monika = "416428171705974785";
	const initial = message.channel instanceof Discord.DMChannel ? "W" : "w";

	message.reply(`${initial}hose word is **Monika**?  Please answer in 15 seconds.`).then(response =>
	{
		const filter = (reaction, user) => user.id === message.author.id && reaction.emoji.id === monika;
		const collector = response.createReactionCollector(filter, { time: 15000 });

		collector.on("collect", () =>
		{
			collector.stop();
			response.react(success);
		});

		collector.on("end", (collection, reason) => reason == "time" && message.react(failure));
		response.react(monika);
	});
}

export const poem = (message, content) =>
{
	const f = [ poem1, poem2, poem3 ][(!content | content) - 1];
	return f ? f(message) : message.channel.send("You input an invalid act.");
};

export const rate = (message, content) =>
{
	const data = content ? content.toLowerCase().replace(/<@!(\d+)>/g, "<@$1>") : `${message.author}`;
	const hash = new Uint32Array(crypto.createHash("md5").update(data).digest().buffer);
	const percentage = ((hash[0] + 25) >>> 0) % 101;

	return message.channel.send(`<:natsuki:424991419329937428> I'd give ${data} ${percentage}%.`);
};

export const shelf = (message, content) =>
{
	const user = message.client.users.get(mentioned(content)) || message.author;
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

export const word = (message, content, mention) =>
{
	const nword = "🇳:regional_indicator_i:🅱🅱🅰";
	const preferred = `Here are my preferred words.
http://doki-doki-literature-club.wikia.com/wiki/Natsuki#Preferred_Words`;
	return message.channel.send(mention ? preferred : nword);
};

/******* Tools *******/
export const avatar = (message, content) =>
{
	const user = message.client.users.get(mentioned(content)) || message.author;
	const url = user.avatar ? `${pfp(user)}${user.avatar.startsWith("a_") ? ".gif" : ""}?size=2048` : robot(user);

	return message.channel.send(url);
};

export const base64 = (message, content) =>
{
	const encode = (message, text) =>
	{
		const code = text
			? text.length > 1500 ? "The message is too long." : Buffer.from(text).toString("base64")
			: message.attachments.size ? "" : "_ _";

		const transform = (attachment, index) => snekfetch.get(attachment.url)
			.then(response => new Discord.Attachment(Buffer.from(response.body.toString("base64")), `${index}.txt`));

		return Promise.all(message.attachments.map(transform))
			.then(attachments => message.channel.send(code, { files: attachments }));
	};

	const decode = (message, code) =>
	{
		const text = `${Buffer.from(code, "base64")}` || (message.attachments.size ? "" : "_ _");

		const transform = (attachment, index) => snekfetch.get(attachment.url)
			.then(response => new Discord.Attachment(Buffer.from(response.text, "base64"), `${index}.bin`));

		return Promise.all(message.attachments.map(transform))
			.then(attachments => message.channel.send(text, { files: attachments }));
	};

	const [, command, text] = /(\S*)\s*([^]*)/.exec(content);

	switch (command) {
		case "encode":
			return encode(message, text);
		case "decode":
			return decode(message, text);
		default:
			return message.channel.send(manual.base64);
	}
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

export const emote = emoji;

export const emojis = message =>
	message.channel.send(`The list of emojis is on <#420885744077504532> on Natsuki's shelf, my support server.  Please check them out there.
https://discord.gg/VdHYvMC`);

export const keycaps = (message, content) =>
{
	if (!content)
		return message.channel.send("_ _");

	const capped = content.toUpperCase()
		.replace(/ /g, "\u2002")
		.replace(/[0-9*#]/g, "$&\u20E3")
		.replace(/[A-Z]/g, match => `${String.fromCodePoint(match.charCodeAt() + 0x1F1A5)}\xAD`);

	const error = "Your message is too long!  Discord allows at most 2000 characters in a message and keycapping roughly doubles the length.  Therefore, try to cut you message down to 1000 characters.";

	return message.channel.send(capped.length <= 2000 ? capped : error);
};

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
		await message.react(success).catch(() => {});
		await message.react(failure).catch(() => {});
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
		return message.channel.send("I can only trace back 100 messages, oof!");
	else if (id <= 0)
		target = message.channel.fetchMessages({ limit: 1 - id }).then(collection => collection.last());
	else if (/\D/.exec(id))
		return message.channel.send(`${id} is not a message id, which is a positive integer`);
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
				return message.react(success);
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

/******* NSFW *******/
export const fuck = async (message, content) =>
{
	if (!message.channel.nsfw)
		return await message.channel.send("🔞 This command only works in NSFW channels!");

	const avatar = user => Jimp.read(user.avatar ? `${pfp(user)}?size=256` : robot(user));
	const user = message.client.users.get(mentioned(content));
	const text = `${message.author} fucked ${user || "Natsuki"}`;
	const image = Jimp.read("assets/566424ede431200e3985ca6f21287cee.png");

	message.channel.startTyping();

	try {
		const composed = (await image).composite(await avatar(message.author), 364, 125);
		if (user) composed.composite(await avatar(user), 110, 20);
		const buffer = await util.promisify((...x) => composed.getBuffer(...x))("image/png");
		return message.channel.send(text, new Discord.Attachment(buffer, "fuck.png"));
	}
	finally {
		message.channel.stopTyping();
	}
};

export const fucc = fuck;

const NSFW = async (message, content, f) =>
{
	if (!message.channel.nsfw)
		return await message.channel.send("🔞 This command only works in NSFW channels!");

	try {
		message.channel.startTyping();
		return message.channel.send(await f(tags(content)));
	}
	catch (error) {
		return message.channel.send(`No image found for ${content}`);
	}
	finally {
		message.channel.stopTyping();
	}
}

const XML = util.promisify(xml2js.parseString);
const tags = query => query.split(/\s+/).map(encodeURIComponent).join("+");

const weeb = object => `Score: ${object.score}
${object.file_url}`;

export const rule34 = (message, content) => NSFW(message, content, async query =>
{
	const response = await snekfetch.get(`https://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${query}`);
	return weeb(pick((await XML(response.text)).posts.post).$);
});

export const r34 = rule34;

export const yandere = (message, content) => NSFW(message, content, async query =>
{
	const response = await snekfetch.get(`https://yande.re/post.json?tags=${query}`);
	return weeb(pick(response.body));
});
