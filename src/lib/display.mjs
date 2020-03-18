import fetch from "node-fetch";
import sharp from "sharp";

export default async (user, size) =>
{
	const url = user.avatarURL({ size: size });
	const buffer = await (await fetch(url || user.defaultAvatarURL)).buffer();
	const image = sharp(buffer);

	if ((await image.metadata()).width == size)
		return buffer;

	return await image.resize(size).webp({ lossless: true }).toBuffer();
};
