
import display from "../lib/display.mjs";

export const avatar = (message, content) =>
	message.channel.send(display(message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.author, 2048));
