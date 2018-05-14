import * as Message from "../util/Message.mjs";
import * as User from "../util/User.mjs";
import * as Random from "../util/Random.mjs";

import * as Dataset from "../data/index.mjs";

import Discord from "discord.js";
import Jimp from "jimp";
import snekfetch from "snekfetch";

import crypto from "crypto";
import util from "util";

export const beat = (message, content) =>
	message.channel.send(`<:buffsuki:436562981875089428> **I'll beat the shit out of ${content || "my dad"}.**`);

export const bunny = (message, content) =>
	message.channel.send(`(\\\\__/)
( • - •)
/つ ${content || " つ"}`);

export const chat = async (message, content, mention) =>
{
	const response = await snekfetch.get(`https://nekos.life/api/v2/chat?text=${encodeURIComponent(content)}`);
	const text = response.body.response;
	return await (text ? message.channel.send(text) : message.react(mention ? "433490397516267532" : "❓"));
};

export const cupcake = Message.typing(async (message, content) =>
{
	const user = message.client.users.get(/\d+|$/.exec(content)[0]) || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = Jimp.read("assets/290px-Hostess-Cupcake-Whole.jpg");
	const composed = (await image).composite((await Jimp.read(User.avatar(user))).resize(128, 128), 80, 80);
	const buffer = await util.promisify((...x) => composed.getBuffer(...x))("image/png");

	return message.channel.send(text, new Discord.Attachment(buffer, "cupcake.png"));
});

export const cute = Message.typing(async message =>
{
	const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
	let content = "Don't say this embarassing thing, dummy!";
	const reply = await message.channel.send(content);

	await sleep(3000);
	await reply.edit(content += "\nY-You t-too....");
	await sleep(2000);
	await reply.edit(content += "\nI'M NOT CUUUUUUUUUUUTE!");
	await sleep(2000);
	await reply.edit(content += "\nDon't think you can make me say this embarassing thing just because we're not at school!");
	await sleep(4000);
	await reply.edit(content += "\nI-I have to go to the bathroom.");

	return message;
});

export const nut = (message, content) =>
	message.channel.send(`${message.author} nuts on ${content || "the floor"}.
<:pukesuki:405984820674428928> **You guys are so gross!**`);

export const rate = (message, content) =>
{
	const data = content ? content.toLowerCase().replace(/<@!(\d+)>/g, "<@$1>") : `${message.author}`;
	const hash = new Uint32Array(crypto.createHash("md5").update(data).digest().buffer);
	const percentage = ((hash[0] + 25) >>> 0) % 101;

	return message.channel.send(`<:natsuki:424991419329937428> I'd give ${data} ${percentage}%.`);
};

export const shelf = (message, content) =>
{
	const user = message.client.users.get(/\d+|$/.exec(content)[0]) || message.author;
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

const collect = (filter, get) => message =>
{
	const collector = message.createReactionCollector(filter, { time: 15000 });
	collector.on("collect", reaction => (collector.stop(), message.react(get(reaction.emoji.id))));
	collector.on("end", (collection, reason) => reason == "time" && message.react(Dataset.failure));
	return message;
}

const check = (answer, monika) => id =>
{
	switch (id) {
		case answer: return Dataset.success;
		case monika: return "⁉";
		default: return Dataset.failure;
	}
}

export const poem1 = message =>
{
	const word = Random.pick(Object.keys(Dataset.poetry));

	const sayori = "424991418386350081";
	const natsuki = "424991419329937428";
	const yuri = "424987242986078218";
	const monika = "424991419233730560";

	const answer = [ natsuki, sayori, yuri, sayori ][Dataset.poetry[word]];
	const initial = message.channel instanceof Discord.DMChannel ? "W" : "w";
	const filter = (reaction, user) => user.id === message.author.id && reaction.me;

	return message.reply(`${initial}hose word is **${word}**?  Please answer in 15 seconds.`)
		.then(collect(filter, check(answer, monika)))
		.then(Message.react([ sayori, natsuki, yuri, monika ]));
};

export const poem2 = message =>
{
	const word = Random.pick(Object.keys(Dataset.poetry));

	const natsuki = "423196976398729216";
	const yuri = "405392891490598913";
	const monika = "405977244952166400";

	const answer = [ natsuki, yuri ][Dataset.poetry[word] >> 1];
	const initial = message.channel instanceof Discord.DMChannel ? "W" : "w";
	const filter = (reaction, user) => user.id === message.author.id && reaction.me;

	return message.reply(`${initial}hose word is **${word}**?  Please answer in 15 seconds.`)
		.then(collect(filter, check(answer, monika)))
		.then(Message.react([ natsuki, yuri, monika ]));
};

export const poem3 = message =>
{
	const monika = "416428171705974785";
	const initial = message.channel instanceof Discord.DMChannel ? "W" : "w";
	const filter = (reaction, user) => user.id === message.author.id && reaction.emoji.id === monika;

	message.reply(`${initial}hose word is **Monika**?  Please answer in 15 seconds.`)
		.then(message => collect(filter, () => Dataset.success)(message).react(monika));
}

export const poem = (message, content) =>
{
	const f = [ poem1, poem2, poem3 ][(!content | content) - 1];
	return f ? f(message) : message.channel.send("You input an invalid act.");
};
