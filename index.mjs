import Discord from "discord.js";
import Jimp from "jimp";
import pngjs from "pngjs";

import crypto from "crypto";
import util from "util";
import vm from "vm";

import manual from "./manual.json";
import poetry from "./poetry.json";

Promise.prototype.finally = Promise.prototype.finally || async function(callback)
{
	try { return await this }
	finally { callback() }
}

const pfp = user => `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`;
const robot = user => `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

const pick = array => array[~~(array.length * Math.random())];

export const client = new Discord.Client();

export const natsuki =
{
// Core
	help(message, content)
	{
		const command = /\S*/.exec(content);

		return message.channel.send(manual[command] || `The command \`${command}\` is not found.`);
	},

	invite(message)
	{
		return message.channel.send("https://discordapp.com/oauth2/authorize?&client_id=410315411695992833&scope=bot");
	},

	ping(message, content)
	{
		const format = (seconds, nano) => seconds ? `${(seconds + 1e-9 * nano).toFixed(3)} s` : `${(1e-6 * nano).toFixed()} ms`;
		const tick = process.hrtime();

		return message.reply("pong!").then(message => message.edit(`${message.content} ${format(...process.hrtime(tick))}`));
	},

	support(message)
	{
		return message.channel.send(`Stuck in a trouble?  Find you way to Natsuki's shelf, my support guild.
https://discord.gg/VdHYvMC

I am free and open-source software.  Here comes my repository.  ~~Use the source, Luke!~~
https://github.com/yurigang/natsuki`);
	},

// Fun
	beat(message, content)
	{
		return message.channel.send(`<:Buffsuki:419995508443054080> **I'll beat the shit out of ${content || "my dad"}.**`);
	},

	async cupcake(message)
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
	},

	cute(message, content)
	{
		const append = (duration, string) => async message =>
		{
			await new Promise(resolve => setTimeout(resolve, duration));
			return await message.edit(`${message.content}${string}`);
		}

		return message.reply("don't say this embarassing thing, dummy!")
			.finally(() => message.channel.startTyping())
			.then(append(3000, "\nY-You t-too...."))
			.then(append(2000, "\nI'M NOT CUUUUUUUUUUUTE!"))
			.then(append(2000, "\nDon't think you can make me say this embarassing thing just because we're not at school!"))
			.then(append(4000, "\nI-I have to go to the bathroom."))
			.finally(() => message.channel.stopTyping());
	},

	hug(message, content)
	{
		return message.channel.send(`${message.author} hugged ${content || "Yuri"}!
https://cdn.discordapp.com/attachments/403697175948820481/413015715273113601/Nxdr0qO_1.jpg`);
	},

	kiss(message, content)
	{
		const images =
		[
			"https://cdn.discordapp.com/attachments/403299886352695297/428494387341688833/hJ6DcXJUurOfHcyG5Sv3wSzZafNqhSGbKTnpF6fFzV4.png",
			"https://cdn.discordapp.com/attachments/403299886352695297/428483005389078528/WfvNDEnq_HoNHwr5-o9fIf0W7x2Rw5Q0tXbLNJy-a8Q.png",
		];

		return message.channel.send(`${message.author} kissed ${content || "Natsuki"}!
${pick(images)}`);
	},

	lewd(message)
	{
		return message.channel.send("https://youtu.be/qr89xoZyE1g");
	},

	lick(message, content)
	{
		return message.channel.send(`${message.author} licked ${content || "the air"}!
https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif`)
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

			await response.react(client.emojis.get(sayori));
			await response.react(client.emojis.get(natsuki));
			await response.react(client.emojis.get(yuri));
			await response.react(client.emojis.get(monika));
		});
	},

	poem2(message)
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

			await response.react(client.emojis.get(natsuki));
			await response.react(client.emojis.get(yuri));
			await response.react(client.emojis.get(monika));
		});
	},

	poem3(message)
	{
		return message.reply("whose word is **Monika**?  Please answer in 15 seconds.").then(response =>
		{
			const filter = (reaction, user) => user.id == message.author.id;
			const collector = response.createReactionCollector(filter, { time: 15000 });

			collector.on("collect", () =>
			{
				collector.stop();
				message.channel.send("Just Monika");
			});

			collector.on("end", (collection, reason) => reason == "time" && message.reply("you didn't answer."));

			response.react(client.emojis.get("416428171705974785"));
		});
	},

	rate(message, content)
	{
		const data = content || `${message.author}`;
		const hash = new Uint32Array(crypto.createHash("md5").update(data.toLowerCase()).digest().buffer);
		const percentage = ((hash[0] + 24) >>> 0) % 101;

		return message.channel.send(`<:natsuki:424991419329937428> I'd give ${data} ${percentage}%.`);
	},

	shelf(message)
	{
		const user = message.mentions.users.first() || message.author;

		return message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
	},

	ship(message, content)
	{
		content = content.replace(/(\\.)|&/g, (match, escaped) => escaped || "×");

		if (content.indexOf("×") < 0)
			content = `${message.author} × ${content || client.user}`;

		return message.channel.send(`Look at them, a lovey dovey couple!  I ship it!
${content}
N-not that I c-care...`)
	},

	word(message)
	{
		return message.channel.send("🇳:regional_indicator_i:🅱🅱🅰");
	},

// Tools
	avatar(message)
	{
		const user = message.mentions.users.first() || message.author;
		const url = user.avatar ? `${pfp(user)}${user.avatar.startsWith("a_") ? ".gif" : ""}?size=2048` : robot(user);

		return message.channel.send(url);
	},

	echo(message, content)
	{
		const f = (match, name) => name && client.emojis.find("name", name) || match;
		const text = content.replace(/<a?:\w*:\d*>|:(\w*):/g, f);
		const big = /^(?:<a?:\w+:\d+>\s*)+$/.test(text);

		return message.channel.send(big ? text : `${message.author}: ${text}`);
	},

	eval(message, content)
	{
		const block = result => "```javascript\n" + util.inspect(result, { depth: 5, customInspect: false }) + "\n```";

		const run = code =>
		{
			try {
				const script = new vm.Script(code);
				const context = vm.createContext(Object.create(null));
				const tick = process.hrtime();
				const result = script.runInContext(context, { timeout: 500 });
				const duration = process.hrtime(tick)[1] * 1e-6;

				return `executed in ${duration.toFixed(6)} ms. ${block(result)}`;
			}
			catch (error) {
				return `an error occurred. ${block(error)}`;
			}
		}

		return message.reply(run(content));
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

	emojis(message)
	{
		return message.channel.send(`The list of emojis is on <#420885744077504532> on Natsuki's shelf, my support server.  Please check them out there.
https://discord.gg/VdHYvMC`);
	},

	keycaps(message, content)
	{
		return message.channel.send(content.toUpperCase()
			.replace(/ /g, "\u2002")
			.replace(/[0-9*#]/g, "$&\u20E3")
			.replace(/[A-Z]/g, match => `${String.fromCodePoint(match.charCodeAt() + 0x1F1A5)}\xAD`));
	},

	poll(message, content)
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
			return message.channel.send([topic,...lines.map(prepend)]).then(react(0x1F1E6 + lines.length));
		}

		const options = content.match(/(?:(?:\\.|[^|\s])(?:\\.|[^|])*)(?=\||$)|(?=\|(?:\||$))|^(?=\|)/g).slice(0, 20);

		if (options.length > 1)
			return message.channel.send(options.map(prepend)).then(react(0x1F1E6 + options.length));

		const yesno = async () =>
		{
			await message.react("👍").catch(() => {});
			await message.react("👎").catch(() => {});
			return message;
		};

		return content ? yesno() : message.reply("please provide a topic.");
	},

	react(message, content)
	{
		const pattern = /\S+/g;
		const id = pattern.exec(content)[0];

		if (!id)
			return message.channel.send("Please specify id of the message.");

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
			const resolve = (match, id, name) => id || client.emojis.find("name", name || match) || match;
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
	},
};

natsuki.say = natsuki.echo;

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | n.invite" }}));

client.on("ready", () =>
{
	const channel = client.channels.get("420885744077504532");

	channel.fetchMessages().then(collection =>
	{
		for (let message of collection.values())
			if (message.author.id == client.user.id)
				message.delete();
	}).catch(() => {});

	channel.send(client.emojis.map(icon => `:${icon.name}: ${icon}`), { split: true });
});

const main = async message =>
{
	if (message.author.bot || message.channel instanceof Discord.DMChannel)
		return;

	const match = /^n\.(\S*)\s*([^]*)/.exec(message.content);

	if (match) {
		const [, command, content] = match;
		const f = natsuki.hasOwnProperty(command) && natsuki[command];
		return f && f(message, content);
	}
}

client.on("message", message => main(message)
	.catch(error => message.channel.send(`An error occurred.  Please leave a note on my shelf if it lingers.
https://discord.gg/VdHYvMC
\`\`\`
${error}
\`\`\``).catch(() => message.author.send("I don't have permission to send messages to this channel."))));
