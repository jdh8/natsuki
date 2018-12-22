import reactor from "../../lib/reactor.mjs";
import emotes from "../../data/emotes.json";

const { success, failure } = emotes;

const code = (x, index) => String.fromCodePoint(0x1F1E6 + index);
const prepend = array => (x, index) => `${array[index]} ${x}`;

export const poll = (message, content) =>
{
	const implementation = (first, ...rest) =>
	{
		if (rest.length) {
			const choices = rest.map(code);
			return message.channel.send([first, ...rest.map(prepend(choices))]).then(reactor(choices));
		}

		const array = first.split(/\s+\|\s+/, 20);

		if (array.length > 1) {
			const choices = array.map(code);
			return message.channel.send(array.map(prepend(choices))).then(reactor(choices));
		}

		return reactor([success, failure])(message);
	};

	return implementation(...content.split("\n", 21));
};
