export const keycaps = (action, option) =>
{
	const value = option.value ?? option;

	if (!value)
		return action.reply("_ _");

	const capped = value.toUpperCase()
		.replace(/ /g, "\u2002")
		.replace(/[0-9*#]/g, "$&\u20E3")
		.replace(/[A-Z]/g, match => `${ String.fromCodePoint(match.charCodeAt() + 0x1F1A5) }\xAD`);

	const error = "Your message is too long!  Discord allows at most 2000 characters in a message and keycapping roughly doubles the length.  Therefore, try to cut you message down to 1000 characters.";

	return action.reply(capped.length <= 2000 ? capped : error);
};
