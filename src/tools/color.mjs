import Discord from "discord.js";
import Jimp from "jimp";
import tinycolor from "tinycolor2";
import util from "util";

const rgba = ({ r, g, b, a }) => (Math.round(r) << 24 | Math.round(g) << 16 | Math.round(b) << 8 | Math.round(255 * a)) >>> 0;

export const color = async (message, content) =>
{
	const color = new tinycolor(content);

	if (!color.isValid())
		return await message.channel.send(`${content} is not a color.`);

	const description = `**Hex:** ${color.getAlpha() == 1 ? color.toHexString() : color.toHex8String()}
**RGB:** ${color.toRgbString()}
**HSL:** ${color.toHslString()}`;

	const image = new Jimp(128, 128, rgba(color.toRgb()));
	const buffer = await util.promisify((...x) => image.getBuffer(...x))("image/png");

	return await message.channel.send(description, new Discord.Attachment(buffer, "color.png"));
};

export const colour = color;
