import snekfetch from "snekfetch";

export const chat = async (message, content, mention) =>
{
	const { body } = await snekfetch.get(`https://nekos.life/api/v2/chat?text=${content}`);
	const text = body.response && decodeURIComponent(body.response.replace("<334186716770598912>", ""));
	return await (text ? message.channel.send(text) : message.react(mention ? "433490397516267532" : "❓"));
};
