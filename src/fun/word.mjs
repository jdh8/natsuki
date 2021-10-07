const nword = "🇳:regional_indicator_i:🅱🅱🅰";
const preferred = `Here are my preferred words.
http://doki-doki-literature-club.wikia.com/wiki/Natsuki#Preferred_Words`;

export const word = (action, option, mention) => action.reply(
	option == null || mention ? preferred : nword);
