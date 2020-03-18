import Jimp from "jimp";

export default async (user, size) =>
{
	const url = user.avatarURL({ format: "png", size: size });
	return url ? await Jimp.read(url) : (await Jimp.read(user.defaultAvatarURL)).resize(size, size);
};
