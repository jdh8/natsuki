import fetch from "node-fetch";

export const chat = async (message, content, mention) =>
{
	const { response } = await (await fetch(`https://nekos.life/api/v2/chat?text=${content}`)).json();
	const text = response && decodeURIComponent(response.replace("<334186716770598912>", ""));
	return await (text ? message.channel.send(text) : message.react(mention ? "433490397516267532" : "❓"));
};
