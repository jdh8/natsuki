import pick from "../lib/pick.mjs";
import reactor from "../lib/reactor.mjs";
import poetry from "../../data/poetry.json";
import Discord from "discord.js";

const ask = async (message, word, answer, monika) =>
{
	const solve = id =>
	{
		switch (id) {
			case answer: return "✅";
			case monika: return "⁉";
			default:     return "❌";
		}
	};

	const filter = (reaction, user) => user.id == message.author.id && reaction.me;
	const w = message.channel instanceof Discord.DMChannel ? "W" : "w";
	const question = await message.reply(`${w}hose word is **${word}**?  Please answer in 15 seconds.`);

	new Discord.ReactionCollector(question, filter, { time: 15000 }).next
		.then(({ emoji }) => solve(emoji.id))
		.catch(() => "❌")
		.then(emote => question.react(emote));

	return question;
};

export const poem1 = message =>
{
	const sayori = "424991418386350081";
	const natsuki = "424991419329937428";
	const yuri = "424987242986078218";
	const monika = "424991419233730560";

	const word = pick(Object.keys(poetry));
	const answer = [natsuki, sayori, yuri, sayori][poetry[word]];

	return ask(message, word, answer, monika).then(reactor([
		":sayori:" + sayori,
		":natsukihappy:" + natsuki,
		":yuri:" + yuri,
		":monika:" + monika]));
};

export const poem2 = message =>
{
	const natsuki = "424991419329937428";
	const yuri = "501273832238088193";
	const monika = "501272960175439872";

	const word = pick(Object.keys(poetry));
	const answer = [natsuki, yuri][poetry[word] >> 1];

	return ask(message, word, answer, monika).then(reactor([
		":natsukihappy:" + natsuki,
		":yuriinsane:" + yuri,
		":monikadeletes:" + monika]));
};

export const poem3 = message =>
{
	const monika = "501274687842680832";
	return ask(message, "Monika", monika).then(message => message.react(":spaceroom:" + monika));
}

export const poem = (message, content) =>
{
	const f = [poem1, poem2, poem3][(!content | content) - 1];
	return f ? f(message) : message.channel.send("You entered an invalid act.");
};
