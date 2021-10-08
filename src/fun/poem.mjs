import sample from "../lib/sample.mjs";
import poetry from "../../data/poetry.json";

const ACTION_ROW = 1;
const BUTTON = 2;

const SECONDARY = 2;
const SUCCESS = 3;
const DANGER = 4;

const ask = (word, ...buttons) => ({
	content: `Whose word is **${word}**?  Please answer in 15 seconds.`,
	fetchReply: true,
	components: [{
		type: ACTION_ROW,
		components: buttons.map(([ character, emoji ]) => ({
			type: BUTTON,
			label: character,
			customId: character,
			style: SECONDARY,
			emoji
		})),
	}],
});

const collect = async (message, user, answer) =>
{
	const collector = message.createMessageComponentCollector({
		filter: interaction => interaction.user.id == user.id,
		time: 15000,
		max: 1,
	});

	collector.on("collect", interaction =>
	{
		const { content, components } = message;
		const id = interaction.customId;
		const correct = id == answer;

		interaction.reply({
			content: [
				"Sorry, that's incorrect",
				"Congratulations!  That's correct",
			][correct|0],
			ephemeral: true,
		});

		for (const button of components[0].components) {
			button.disabled = true;

			if (button.customId == id)
				button.style = correct ? SUCCESS : DANGER;
		}

		message.edit({ content, components });
	});

	collector.on("end", () =>
	{
		const { content, components } = message;

		for (const button of components[0].components)
			button.disabled = true;

		message.edit({ content, components });
	});
};

export const poem1 = async action =>
{
	const word = sample(Object.keys(poetry));

	const message = await action.reply(ask(word,
		["Sayori", "424991418386350081"],
		["Natsuki", "424991419329937428"],
		["Yuri", "424987242986078218"]));

	collect(message, action.member, ["Natsuki", "Sayori", "Yuri", "Sayori"][poetry[word]]);
	return message;
};

export const poem2 = async action =>
{
	const word = sample(Object.keys(poetry));

	const message = await action.reply(ask(word,
		["Natsuki", "424991419329937428"],
		["Yuri", "424987242986078218"]));

	collect(message, action.member, ["Natsuki", "Yuri"][poetry[word] >> 1]);
	return message;
};

export const poem3 = async action =>
{
	const message = await action.reply(ask("Monika", ["Monika", "501274687842680832"]));
	collect(message, action.member, "Monika");
	return message;
}

export const poem = (action, option) =>
{
	const f = [poem1, poem2, poem3][(option.value ?? !option | option) - 1];
	return f ? f(action) : action.reply("You entered an invalid act.");
};
