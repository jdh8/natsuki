import sample from "../lib/sample.mjs";
import poetry from "../../data/poetry.json";
import { ReactionCollector } from "discord.js";

const ask = async (message, word, answer, monika) =>
{
	const mark = reaction =>
	{
		const id = reaction.emoji.id;
		return id == answer ? "✅" : id == monika ? "⁉" : "❌";
	};

	const filter = (reaction, user) => user.id == message.author.id && reaction.me;
	const question = await message.reply(`Whose word is **${word}**?  Please answer in 15 seconds.`);

	new ReactionCollector(question, filter, { time: 15000 }).next
		.then(mark)
		.catch(() => "❌")
		.then(s => question.react(s));

	return question;
};

export const poem1 = async message =>
{
	const sayori = 424991418386350081n;
	const natsuki = 424991419329937428n;
	const yuri = 424987242986078218n;
	const monika = 424991419233730560n;

	const word = sample(Object.keys(poetry));
	const question = await ask(message, word, [natsuki, sayori, yuri, sayori][poetry[word]], monika);

	await question.react(":sayori:" + sayori);
	await question.react(":natsukihappy:" + natsuki);
	await question.react(":yuri:" + yuri);
	await question.react(":monika:" + monika);

	return question;
};

export const poem2 = async message =>
{
	const natsuki = 424991419329937428n;
	const yuri = 501273832238088193n;
	const monika = 501272960175439872n;

	const word = sample(Object.keys(poetry));
	const question = await ask(message, word, [natsuki, yuri][poetry[word] >> 1], monika);

	await question.react(":natsukihappy:" + natsuki);
	await question.react(":yuriinsane:" + yuri);
	await question.react(":monikadeletes:" + monika);

	return question;
};

export const poem3 = async message =>
{
	const monika = 501274687842680832n;
	const question = await ask(message, "Monika", monika);

	await question.react(":spaceroom:" + monika);

	return question;
}

export const poem = (message, content) =>
{
	const f = [poem1, poem2, poem3][(!content | content) - 1];
	return f ? f(message) : message.reply("You entered an invalid act.");
};
