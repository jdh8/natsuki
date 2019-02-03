import xml2js from "xml2js";
import util from "util";

export default util.promisify(xml2js.parseString);
