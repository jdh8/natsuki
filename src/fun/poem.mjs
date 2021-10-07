import sample from "../lib/sample.mjs";
import poetry from "../../data/poetry.json";
import { ReactionCollector } from "discord.js";

const ask = async (action, word, answer, monika) =>
{
	const mark = reaction =>
	{
		const id = reaction.emoji.id;
		return id == answer ? "✅" : id == monika ? "⁉" : "❌";
	};

	const filter = (reaction, user) => user.id == action.member || action.member.id && reaction.me;

	const message = await action.reply({
		content: `Whose word is **${word}**?  Please answer in 15 seconds.`,
		fetchReply: true,
	});

	new ReactionCollector(message, { filter, time: 15000 }).next
		.then(mark)
		.catch(() => "❌")
		.then(s => message.react(s));

	return message;
};

export const poem1 = async action =>
{
	const sayori = 424991418386350081n;
	const natsuki = 424991419329937428n;
	const yuri = 424987242986078218n;
	const monika = 424991419233730560n;

	const word = sample(Object.keys(poetry));
	const message = await ask(action, word, [natsuki, sayori, yuri, sayori][poetry[word]], monika);

	await message.react(":sayori:" + sayori);
	await message.react(":natsukihappy:" + natsuki);
	await message.react(":yuri:" + yuri);
	await message.react(":monika:" + monika);

	return message;
};

export const poem2 = async action =>
{
	const natsuki = 424991419329937428n;
	const yuri = 501273832238088193n;
	const monika = 501272960175439872n;

	const word = sample(Object.keys(poetry));
	const message = await ask(action, word, [natsuki, yuri][poetry[word] >> 1], monika);

	await message.react(":natsukihappy:" + natsuki);
	await message.react(":yuriinsane:" + yuri);
	await message.react(":monikadeletes:" + monika);

	return message;
};

export const poem3 = async action =>
{
	const monika = 501274687842680832n;
	const message = await ask(action, "Monika", monika);

	await message.react(":spaceroom:" + monika);

	return message;
}

export const poem = (action, option) =>
{
	const f = [poem1, poem2, poem3][option.value ?? (!option | option) - 1];
	return f ? f(action) : action.reply("You entered an invalid act.");
};
